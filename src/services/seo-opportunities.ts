import { createHash } from "node:crypto";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

/**
 * Detectores de oportunidades SEO. Cada detector lee del espejo local
 * (Ga4DailyMetric, GscDailyQuery, GscDailyPage) — NO llama Google APIs.
 * Esto desacopla análisis de sync y permite re-correr el agente sin coste.
 *
 * Cada detector devuelve {kind, priority, url?, query?, metrics, recommendation}.
 * El runner upsertea por `fingerprint` (hash de identidad) para evitar
 * duplicados entre runs.
 *
 * Tipos de oportunidad:
 *   ranking_4_20            → keyword en posición 4-20 (página 1-2)
 *   low_ctr_high_impressions → URL muchas impresiones, CTR bajo
 *   clicks_drop             → caída de clicks vs ventana anterior
 *   impressions_growing_low_clicks → impresiones suben pero clicks no
 *   cannibalization         → mismo query con varias URLs
 *   orgtraffic_low_conversion → tráfico OK, conversión baja
 *   high_conversion_low_traffic → conversión OK, tráfico bajo
 *   new_content             → query con muchas impresiones sin URL propia
 *   title_meta              → CTR muy bajo dado el ranking
 *   internal_links          → URL con buen ranking pero pocos clicks internos
 */

export type SeoOpportunityDraft = {
  kind: string;
  priority: number; // 1-10
  url?: string | null;
  query?: string | null;
  metrics: Record<string, unknown>;
  recommendation: string;
};

function fingerprint(d: SeoOpportunityDraft): string {
  const key = `${d.kind}|${d.url ?? ""}|${d.query ?? ""}`;
  return createHash("sha1").update(key).digest("hex").slice(0, 32);
}

// ─── Tunables ────────────────────────────────────────────────────────────────

const RECENT_DAYS = 28;
const PREV_DAYS = 28; // ventana anterior para comparativas
const MIN_IMPRESSIONS_FOR_LOW_CTR = 100;
const LOW_CTR_THRESHOLD = 0.02; // <2% considerado bajo
const RANKING_4_20_MIN_IMPRESSIONS = 50;
const CLICKS_DROP_PERCENT = 30; // -30% vs ventana anterior
const CANNIBALIZATION_MIN_PAGES = 2;
const HIGH_CONVERSION_RATE = 0.05; // 5% de conversión sobre sessions
const HIGH_TRAFFIC_LOW_CONV_MIN_SESSIONS = 100;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function sumBy<T>(arr: T[], fn: (x: T) => number): number {
  return arr.reduce((a, x) => a + fn(x), 0);
}

// ─── Detectores ──────────────────────────────────────────────────────────────

/** 1. Keywords en posición 4-20 con ≥50 impresiones — empuje rentable. */
export async function detectRanking4_20(): Promise<SeoOpportunityDraft[]> {
  const prisma = getPrismaClient();
  const since = daysAgo(RECENT_DAYS);
  const rows = await prisma.gscDailyQuery.groupBy({
    by: ["query"],
    where: { date: { gte: since } },
    _avg: { position: true },
    _sum: { impressions: true, clicks: true },
    having: { impressions: { _sum: { gte: RANKING_4_20_MIN_IMPRESSIONS } } },
  });
  return rows
    .filter(
      (r) =>
        (r._avg.position ?? 99) >= 4 &&
        (r._avg.position ?? 99) <= 20 &&
        (r._sum.impressions ?? 0) >= RANKING_4_20_MIN_IMPRESSIONS,
    )
    .map((r) => ({
      kind: "ranking_4_20",
      priority: 8,
      query: r.query,
      metrics: {
        avgPosition: Number((r._avg.position ?? 0).toFixed(1)),
        impressions: r._sum.impressions ?? 0,
        clicks: r._sum.clicks ?? 0,
      },
      recommendation: `Keyword "${r.query}" en posición ${(r._avg.position ?? 0).toFixed(1)} con ${r._sum.impressions} impresiones. Identifica la página que rankea, refuerza H1+H2, añade FAQ con la query, mejora densidad semántica.`,
    }));
}

/** 2. URLs con muchas impresiones y CTR bajo — oportunidad de title/meta. */
export async function detectLowCtrHighImpressions(): Promise<SeoOpportunityDraft[]> {
  const prisma = getPrismaClient();
  const since = daysAgo(RECENT_DAYS);
  const rows = await prisma.gscDailyPage.groupBy({
    by: ["page"],
    where: { date: { gte: since } },
    _sum: { impressions: true, clicks: true },
    _avg: { ctr: true, position: true },
    having: { impressions: { _sum: { gte: MIN_IMPRESSIONS_FOR_LOW_CTR } } },
  });
  return rows
    .filter((r) => (r._avg.ctr ?? 1) < LOW_CTR_THRESHOLD)
    .map((r) => ({
      kind: "low_ctr_high_impressions",
      priority: 9,
      url: r.page,
      metrics: {
        impressions: r._sum.impressions ?? 0,
        clicks: r._sum.clicks ?? 0,
        ctr: Number(((r._avg.ctr ?? 0) * 100).toFixed(2)),
        avgPosition: Number((r._avg.position ?? 0).toFixed(1)),
      },
      recommendation: `${r._sum.impressions} impresiones con CTR ${((r._avg.ctr ?? 0) * 100).toFixed(2)}%. Reescribe title (incluye número/año/beneficio) y meta description. Posición media ${(r._avg.position ?? 0).toFixed(1)}.`,
    }));
}

/** 3. Páginas con caída de clicks vs ventana anterior. */
export async function detectClicksDrop(): Promise<SeoOpportunityDraft[]> {
  const prisma = getPrismaClient();
  const recentSince = daysAgo(RECENT_DAYS);
  const prevSince = daysAgo(RECENT_DAYS + PREV_DAYS);

  const recent = await prisma.gscDailyPage.groupBy({
    by: ["page"],
    where: { date: { gte: recentSince } },
    _sum: { clicks: true },
  });
  const prev = await prisma.gscDailyPage.groupBy({
    by: ["page"],
    where: { date: { gte: prevSince, lt: recentSince } },
    _sum: { clicks: true },
  });
  const prevByPage = new Map(prev.map((p) => [p.page, p._sum.clicks ?? 0]));

  const drafts: SeoOpportunityDraft[] = [];
  for (const r of recent) {
    const recentClicks = r._sum.clicks ?? 0;
    const prevClicks = prevByPage.get(r.page) ?? 0;
    if (prevClicks < 10) continue; // ignora ruido
    const dropPct = ((prevClicks - recentClicks) / prevClicks) * 100;
    if (dropPct < CLICKS_DROP_PERCENT) continue;
    drafts.push({
      kind: "clicks_drop",
      priority: 7,
      url: r.page,
      metrics: { recentClicks, prevClicks, dropPercent: Number(dropPct.toFixed(1)) },
      recommendation: `Caída del ${dropPct.toFixed(1)}% en clicks (${prevClicks} → ${recentClicks}). Revisa cambios en SERP (nuevo competidor, AI Overview), actualiza contenido, comprueba indexación.`,
    });
  }
  return drafts;
}

/** 4. Impresiones crecientes pero clicks no — algo bloquea el clic. */
export async function detectImpressionsGrowingLowClicks(): Promise<SeoOpportunityDraft[]> {
  const prisma = getPrismaClient();
  const recentSince = daysAgo(RECENT_DAYS);
  const prevSince = daysAgo(RECENT_DAYS + PREV_DAYS);

  const recent = await prisma.gscDailyPage.groupBy({
    by: ["page"],
    where: { date: { gte: recentSince } },
    _sum: { impressions: true, clicks: true },
  });
  const prev = await prisma.gscDailyPage.groupBy({
    by: ["page"],
    where: { date: { gte: prevSince, lt: recentSince } },
    _sum: { impressions: true, clicks: true },
  });
  const prevByPage = new Map(prev.map((p) => [p.page, p._sum]));

  const drafts: SeoOpportunityDraft[] = [];
  for (const r of recent) {
    const recentImp = r._sum.impressions ?? 0;
    const recentClicks = r._sum.clicks ?? 0;
    const prevImp = prevByPage.get(r.page)?.impressions ?? 0;
    const prevClicks = prevByPage.get(r.page)?.clicks ?? 0;
    if (prevImp < 50) continue;
    const impGrowth = ((recentImp - prevImp) / prevImp) * 100;
    if (impGrowth < 30) continue;
    const clicksGrowth = prevClicks > 0 ? ((recentClicks - prevClicks) / prevClicks) * 100 : 0;
    if (clicksGrowth >= impGrowth * 0.5) continue; // clicks crecen razonable
    drafts.push({
      kind: "impressions_growing_low_clicks",
      priority: 7,
      url: r.page,
      metrics: {
        impGrowthPercent: Number(impGrowth.toFixed(1)),
        clicksGrowthPercent: Number(clicksGrowth.toFixed(1)),
        recentImpressions: recentImp,
        recentClicks,
      },
      recommendation: `Impresiones +${impGrowth.toFixed(0)}% pero clicks solo +${clicksGrowth.toFixed(0)}%. Mejora title/meta para captar la demanda creciente.`,
    });
  }
  return drafts;
}

/** 5. Canibalización: misma query rankea con ≥2 páginas distintas. */
export async function detectCannibalization(): Promise<SeoOpportunityDraft[]> {
  const prisma = getPrismaClient();
  const since = daysAgo(RECENT_DAYS);
  // GSC standalone no expone (query, page) en una sola tabla — necesitamos
  // ambas dimensiones en el mismo request, pero no lo guardamos así. Como
  // proxy, agrupamos GscDailyPage por palabras de query frecuentes... mejor
  // queda flagged como "requiere extender el sync".
  // Hot path: usamos el catálogo actual de pages y advertimos cuando hay
  // ≥CANNIBALIZATION_MIN_PAGES con misma keyword en URL.
  const pages = await prisma.gscDailyPage.groupBy({
    by: ["page"],
    where: { date: { gte: since } },
    _sum: { clicks: true, impressions: true },
  });
  const slugs = new Map<string, Array<{ page: string; clicks: number; impressions: number }>>();
  for (const p of pages) {
    const url = p.page;
    const slug = url.split("/").filter(Boolean).pop() ?? "";
    if (!slug || slug.length < 4) continue;
    const arr = slugs.get(slug) ?? [];
    arr.push({
      page: url,
      clicks: p._sum.clicks ?? 0,
      impressions: p._sum.impressions ?? 0,
    });
    slugs.set(slug, arr);
  }

  const drafts: SeoOpportunityDraft[] = [];
  for (const [slug, urls] of slugs) {
    if (urls.length < CANNIBALIZATION_MIN_PAGES) continue;
    const totalImp = sumBy(urls, (u) => u.impressions);
    if (totalImp < 50) continue;
    drafts.push({
      kind: "cannibalization",
      priority: 6,
      query: slug,
      metrics: { urls, totalImpressions: totalImp },
      recommendation: `${urls.length} URLs compitiendo por slug "${slug}". Revisa intención: ¿deberían fusionarse? ¿una rel=canonical?`,
    });
  }
  return drafts;
}

/** 6. Páginas con tráfico orgánico pero conversión baja. */
export async function detectOrgTrafficLowConversion(): Promise<SeoOpportunityDraft[]> {
  const prisma = getPrismaClient();
  const since = daysAgo(RECENT_DAYS);
  const rows = await prisma.ga4DailyMetric.groupBy({
    by: ["pagePath"],
    where: { date: { gte: since } },
    _sum: { sessions: true, conversions: true },
    having: { sessions: { _sum: { gte: HIGH_TRAFFIC_LOW_CONV_MIN_SESSIONS } } },
  });
  return rows
    .filter((r) => {
      const sessions = r._sum.sessions ?? 0;
      const conversions = r._sum.conversions ?? 0;
      const convRate = sessions > 0 ? conversions / sessions : 0;
      return convRate < HIGH_CONVERSION_RATE / 2; // <2.5%
    })
    .map((r) => ({
      kind: "orgtraffic_low_conversion",
      priority: 8,
      url: r.pagePath,
      metrics: {
        sessions: r._sum.sessions ?? 0,
        conversions: r._sum.conversions ?? 0,
        conversionRatePercent: Number(
          (((r._sum.conversions ?? 0) / Math.max(1, r._sum.sessions ?? 0)) * 100).toFixed(2),
        ),
      },
      recommendation: `${r._sum.sessions} sesiones con solo ${r._sum.conversions} conversiones. Audita CTA, fricción del flow, propuesta de valor en above-the-fold.`,
    }));
}

/** 7. Páginas con buena conversión pero poco tráfico. */
export async function detectHighConversionLowTraffic(): Promise<SeoOpportunityDraft[]> {
  const prisma = getPrismaClient();
  const since = daysAgo(RECENT_DAYS);
  const rows = await prisma.ga4DailyMetric.groupBy({
    by: ["pagePath"],
    where: { date: { gte: since } },
    _sum: { sessions: true, conversions: true },
  });
  return rows
    .filter((r) => {
      const sessions = r._sum.sessions ?? 0;
      const conversions = r._sum.conversions ?? 0;
      if (sessions < 10 || sessions >= HIGH_TRAFFIC_LOW_CONV_MIN_SESSIONS) return false;
      return conversions / sessions >= HIGH_CONVERSION_RATE;
    })
    .map((r) => ({
      kind: "high_conversion_low_traffic",
      priority: 8,
      url: r.pagePath,
      metrics: {
        sessions: r._sum.sessions ?? 0,
        conversions: r._sum.conversions ?? 0,
        conversionRatePercent: Number(
          (((r._sum.conversions ?? 0) / Math.max(1, r._sum.sessions ?? 0)) * 100).toFixed(2),
        ),
      },
      recommendation: `Conversión alta (${(((r._sum.conversions ?? 0) / Math.max(1, r._sum.sessions ?? 0)) * 100).toFixed(1)}%) pero solo ${r._sum.sessions} sesiones. Empuja con SEO/contenido, comparte en redes, considera SEM.`,
    }));
}

/** 8. Queries con muchas impresiones pero sin URL propia (oportunidad de contenido). */
export async function detectNewContentOpportunities(): Promise<SeoOpportunityDraft[]> {
  const prisma = getPrismaClient();
  const since = daysAgo(RECENT_DAYS);
  const rows = await prisma.gscDailyQuery.groupBy({
    by: ["query"],
    where: { date: { gte: since } },
    _sum: { impressions: true, clicks: true },
    _avg: { position: true },
    having: { impressions: { _sum: { gte: 200 } } },
  });
  return rows
    .filter((r) => (r._avg.position ?? 0) > 20 && (r._sum.clicks ?? 0) < 5)
    .map((r) => ({
      kind: "new_content",
      priority: 6,
      query: r.query,
      metrics: {
        impressions: r._sum.impressions ?? 0,
        avgPosition: Number((r._avg.position ?? 0).toFixed(1)),
        clicks: r._sum.clicks ?? 0,
      },
      recommendation: `"${r.query}" tiene ${r._sum.impressions} impresiones en posición ${(r._avg.position ?? 0).toFixed(0)}. No tienes contenido específico. Crea pillar/landing optimizada para esta intención.`,
    }));
}

/** 9. CTR muy por debajo del esperado por posición — sugiere title/meta floja. */
export async function detectTitleMetaIssues(): Promise<SeoOpportunityDraft[]> {
  const prisma = getPrismaClient();
  const since = daysAgo(RECENT_DAYS);
  const rows = await prisma.gscDailyQuery.groupBy({
    by: ["query"],
    where: { date: { gte: since } },
    _sum: { impressions: true, clicks: true },
    _avg: { position: true, ctr: true },
    having: { impressions: { _sum: { gte: 100 } } },
  });
  // CTR esperado por posición (curva clásica de SEO).
  const expectedCtr = (pos: number): number => {
    if (pos <= 1) return 0.28;
    if (pos <= 2) return 0.15;
    if (pos <= 3) return 0.11;
    if (pos <= 5) return 0.07;
    if (pos <= 10) return 0.03;
    return 0.01;
  };
  return rows
    .filter((r) => {
      const pos = r._avg.position ?? 99;
      const actualCtr = r._avg.ctr ?? 0;
      const expected = expectedCtr(pos);
      return pos <= 10 && actualCtr < expected * 0.5;
    })
    .map((r) => ({
      kind: "title_meta",
      priority: 7,
      query: r.query,
      metrics: {
        avgPosition: Number((r._avg.position ?? 0).toFixed(1)),
        actualCtrPercent: Number(((r._avg.ctr ?? 0) * 100).toFixed(2)),
        expectedCtrPercent: Number((expectedCtr(r._avg.position ?? 99) * 100).toFixed(1)),
        impressions: r._sum.impressions ?? 0,
      },
      recommendation: `Posición ${(r._avg.position ?? 0).toFixed(1)} con CTR ${((r._avg.ctr ?? 0) * 100).toFixed(2)}% (esperado ~${(expectedCtr(r._avg.position ?? 99) * 100).toFixed(0)}%). Reescribe title — añade poder emocional, número, año vigente.`,
    }));
}

/**
 * 10. URLs bien rankeadas (top 10) con muchos clicks pero poco internal linking
 * (proxy: páginas con muy poco tráfico desde otras del propio sitio).
 *
 * Nota: GA4 sin "previousPagePath" no nos da internal links directos. Como
 * proxy, marcamos como oportunidad las URLs en top 10 con muchas impresiones
 * — son candidatas a recibir más linking interno desde otras páginas.
 */
export async function detectInternalLinksOpportunities(): Promise<SeoOpportunityDraft[]> {
  const prisma = getPrismaClient();
  const since = daysAgo(RECENT_DAYS);
  const rows = await prisma.gscDailyPage.groupBy({
    by: ["page"],
    where: { date: { gte: since } },
    _sum: { clicks: true, impressions: true },
    _avg: { position: true },
    having: { impressions: { _sum: { gte: 200 } } },
  });
  return rows
    .filter((r) => (r._avg.position ?? 99) <= 10 && (r._sum.clicks ?? 0) >= 20)
    .map((r) => ({
      kind: "internal_links",
      priority: 5,
      url: r.page,
      metrics: {
        avgPosition: Number((r._avg.position ?? 0).toFixed(1)),
        clicks: r._sum.clicks ?? 0,
        impressions: r._sum.impressions ?? 0,
      },
      recommendation: `URL en top 10 con buen rendimiento (${r._sum.clicks} clicks). Refuerza con enlazado interno desde 3-5 páginas relacionadas para consolidar autoridad.`,
    }));
}

// ─── Runner ──────────────────────────────────────────────────────────────────

const DETECTORS: Array<() => Promise<SeoOpportunityDraft[]>> = [
  detectRanking4_20,
  detectLowCtrHighImpressions,
  detectClicksDrop,
  detectImpressionsGrowingLowClicks,
  detectCannibalization,
  detectOrgTrafficLowConversion,
  detectHighConversionLowTraffic,
  detectNewContentOpportunities,
  detectTitleMetaIssues,
  detectInternalLinksOpportunities,
];

export type DetectionRun = {
  totalDetected: number;
  upserted: number;
  byKind: Record<string, number>;
  errors: string[];
};

/** Ejecuta los 10 detectores y upsertea oportunidades en DB. */
export async function runAllDetectors(): Promise<DetectionRun> {
  const prisma = getPrismaClient();
  const all: SeoOpportunityDraft[] = [];
  const errors: string[] = [];

  for (const detector of DETECTORS) {
    try {
      const drafts = await detector();
      all.push(...drafts);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${detector.name}: ${message}`);
      logError("SEO_OPP", err, { detector: detector.name });
    }
  }

  let upserted = 0;
  const byKind: Record<string, number> = {};
  for (const draft of all) {
    const fp = fingerprint(draft);
    byKind[draft.kind] = (byKind[draft.kind] ?? 0) + 1;
    try {
      await prisma.seoOpportunity.upsert({
        where: { fingerprint: fp },
        create: {
          fingerprint: fp,
          kind: draft.kind,
          priority: draft.priority,
          url: draft.url ?? null,
          query: draft.query ?? null,
          metrics: draft.metrics as object,
          recommendation: draft.recommendation,
        },
        update: {
          priority: draft.priority,
          metrics: draft.metrics as object,
          recommendation: draft.recommendation,
          // status NO se actualiza — preserva si admin marcó "done" o "dismissed".
        },
      });
      upserted++;
    } catch (err) {
      logError("SEO_OPP", err, { fingerprint: fp, kind: draft.kind });
    }
  }

  logInfo("SEO_OPP", "detectors_run_complete", {
    totalDetected: all.length,
    upserted,
    byKind,
    errorsCount: errors.length,
  });

  return { totalDetected: all.length, upserted, byKind, errors };
}
