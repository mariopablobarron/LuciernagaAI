import { getPrismaClient } from "@/db/prisma";

/**
 * Health Dashboard — 6 métricas de salud de plataforma con umbrales.
 *
 * NORTH STAR: WAC (Weekly Active Contributors) = usuarios con ≥1 mensaje
 * del usuario Y ≥1 check-in/ronda en los últimos 7 días. Mide el core loop
 * real (chat + ritual), no visitas vacías.
 *
 * Umbrales: ajustar en HEALTH_THRESHOLDS según madurez del producto.
 */

export type HealthStatus = "green" | "amber" | "red" | "unknown";

export interface HealthMetric {
  key: string;
  label: string;
  description: string;
  value: number;
  unit: "count" | "percent" | "usd" | "ratio";
  delta: number | null; // vs. periodo anterior (puntos porcentuales o %)
  status: HealthStatus;
  thresholds: { green: string; amber: string; red: string };
  hint: string; // acción sugerida si status no es verde
}

export interface HealthReport {
  generatedAt: string;
  metrics: HealthMetric[];
  overall: HealthStatus;
}

const HEALTH_THRESHOLDS = {
  wacDeltaPct: { green: 0, amber: -10 }, // crecimiento semana/semana
  activationD7: { green: 40, amber: 20 }, // % signups activados en D7
  retentionW2: { green: 25, amber: 10 }, // % signups que siguen activos en semana 2
  churnPro30d: { green: 5, amber: 10 }, // % Pro perdidos últimos 30d (menor = mejor)
  llmCostPerActive: { green: 1, amber: 3 }, // $ / usuario activo 30d (menor = mejor)
  llmErrorRate: { green: 1, amber: 5 }, // % respuestas con fallback (menor = mejor)
};

function classify(
  value: number,
  green: number,
  amber: number,
  lowerIsBetter: boolean,
): HealthStatus {
  if (lowerIsBetter) {
    if (value <= green) return "green";
    if (value <= amber) return "amber";
    return "red";
  }
  if (value >= green) return "green";
  if (value >= amber) return "amber";
  return "red";
}

export async function getHealthReport(): Promise<HealthReport> {
  const prisma = getPrismaClient();
  const now = new Date();
  const d1 = 24 * 60 * 60 * 1000;
  const since7d = new Date(now.getTime() - 7 * d1);
  const since14d = new Date(now.getTime() - 14 * d1);
  const since30d = new Date(now.getTime() - 30 * d1);
  const since60d = new Date(now.getTime() - 60 * d1);

  // ── 1. WAC (North Star) — esta semana y semana anterior
  const [msgUsers7d, ritualUsers7d, msgUsersPrev, ritualUsersPrev] =
    await Promise.all([
      prisma.message.findMany({
        where: { createdAt: { gte: since7d }, role: "user", userId: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.dailyCheckin.findMany({
        where: { createdAt: { gte: since7d } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.message.findMany({
        where: {
          createdAt: { gte: since14d, lt: since7d },
          role: "user",
          userId: { not: null },
        },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.dailyCheckin.findMany({
        where: { createdAt: { gte: since14d, lt: since7d } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

  const msgIds7d = new Set(msgUsers7d.map((m) => m.userId).filter(Boolean) as string[]);
  const ritualIds7d = new Set(ritualUsers7d.map((c) => c.userId));
  const wac7d = [...msgIds7d].filter((id) => ritualIds7d.has(id)).length;

  const msgIdsPrev = new Set(msgUsersPrev.map((m) => m.userId).filter(Boolean) as string[]);
  const ritualIdsPrev = new Set(ritualUsersPrev.map((c) => c.userId));
  const wacPrev = [...msgIdsPrev].filter((id) => ritualIdsPrev.has(id)).length;

  const wacDeltaPct =
    wacPrev > 0 ? ((wac7d - wacPrev) / wacPrev) * 100 : wac7d > 0 ? 100 : 0;

  // ── 2. Activación D7 — cohorte signup hace 7-30d
  const cohortSignups = await prisma.user.count({
    where: {
      deletedAt: null,
      createdAt: { gte: new Date(now.getTime() - 30 * d1), lt: since7d },
    },
  });
  const cohortActivated = await prisma.user.count({
    where: {
      deletedAt: null,
      createdAt: { gte: new Date(now.getTime() - 30 * d1), lt: since7d },
      activatedAt: { not: null },
    },
  });
  const activationD7 = cohortSignups > 0 ? (cohortActivated / cohortSignups) * 100 : 0;

  // Delta vs cohorte 30-60d
  const prevCohortSignups = await prisma.user.count({
    where: {
      deletedAt: null,
      createdAt: { gte: since60d, lt: new Date(now.getTime() - 30 * d1) },
    },
  });
  const prevCohortActivated = await prisma.user.count({
    where: {
      deletedAt: null,
      createdAt: { gte: since60d, lt: new Date(now.getTime() - 30 * d1) },
      activatedAt: { not: null },
    },
  });
  const prevActivationD7 =
    prevCohortSignups > 0 ? (prevCohortActivated / prevCohortSignups) * 100 : 0;
  const activationDelta = activationD7 - prevActivationD7;

  // ── 3. Retención W2 — signups hace 14-28d que enviaron mensaje últimos 7d
  const w2Cohort = await prisma.user.findMany({
    where: {
      deletedAt: null,
      createdAt: {
        gte: new Date(now.getTime() - 28 * d1),
        lt: since14d,
      },
    },
    select: { id: true },
  });
  const w2Ids = w2Cohort.map((u) => u.id);
  const w2Retained =
    w2Ids.length > 0
      ? await prisma.message.findMany({
          where: {
            userId: { in: w2Ids },
            role: "user",
            createdAt: { gte: since7d },
          },
          select: { userId: true },
          distinct: ["userId"],
        })
      : [];
  const retentionW2 =
    w2Ids.length > 0 ? (w2Retained.length / w2Ids.length) * 100 : 0;

  // ── 4. Churn Pro 30d
  const proActiveNow = await prisma.subscription.count({
    where: { plan: "pro", status: "active" },
  });
  const proCancelled30d = await prisma.subscription.count({
    where: {
      plan: "pro",
      cancelledAt: { gte: since30d },
    },
  });
  const denominator = proActiveNow + proCancelled30d;
  const churnPro30d = denominator > 0 ? (proCancelled30d / denominator) * 100 : 0;

  // Delta (30-60d)
  const proCancelledPrev = await prisma.subscription.count({
    where: {
      plan: "pro",
      cancelledAt: { gte: since60d, lt: since30d },
    },
  });
  const prevChurnDenom = proActiveNow + proCancelledPrev;
  const prevChurn =
    prevChurnDenom > 0 ? (proCancelledPrev / prevChurnDenom) * 100 : 0;
  const churnDelta = churnPro30d - prevChurn;

  // ── 5. Coste LLM por usuario activo 30d
  const llmCostAgg = await prisma.llmLog.aggregate({
    where: { createdAt: { gte: since30d } },
    _sum: { costUsd: true },
  });
  const active30d = await prisma.message.findMany({
    where: { createdAt: { gte: since30d }, role: "user", userId: { not: null } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const llmCost = llmCostAgg._sum.costUsd ?? 0;
  const activeCount = active30d.length;
  const llmCostPerActive = activeCount > 0 ? llmCost / activeCount : 0;

  // ── 6. LLM error rate (fallback rate) últimos 7d
  const receivedTotal = await prisma.event.count({
    where: { type: "MESSAGE_RECEIVED", createdAt: { gte: since7d } },
  });
  const receivedFallback = await prisma.event.count({
    where: {
      type: "MESSAGE_RECEIVED",
      createdAt: { gte: since7d },
      metadata: { path: ["fallback"], equals: true },
    },
  });
  const llmErrorRate =
    receivedTotal > 0 ? (receivedFallback / receivedTotal) * 100 : 0;

  // ── Construir métricas
  const metrics: HealthMetric[] = [
    {
      key: "wac",
      label: "WAC (North Star)",
      description:
        "Weekly Active Contributors: usuarios con ≥1 mensaje Y ≥1 check-in en últimos 7 días.",
      value: wac7d,
      unit: "count",
      delta: Math.round(wacDeltaPct * 10) / 10,
      status: classify(
        wacDeltaPct,
        HEALTH_THRESHOLDS.wacDeltaPct.green,
        HEALTH_THRESHOLDS.wacDeltaPct.amber,
        false,
      ),
      thresholds: {
        green: "Crece vs. semana anterior",
        amber: "Cae entre 0% y -10%",
        red: "Cae más de -10%",
      },
      hint:
        wacDeltaPct < 0
          ? "Revisa onboarding, calidad de respuesta LLM y churn silencioso."
          : "Mantén cadencia de contenido y reminders.",
    },
    {
      key: "activationD7",
      label: "Activación D7",
      description:
        "% de signups (7-30d) que alcanzaron el aha moment: ≥3 mensajes en 72h + ≥1 acción completada.",
      value: Math.round(activationD7 * 10) / 10,
      unit: "percent",
      delta: Math.round(activationDelta * 10) / 10,
      status: classify(
        activationD7,
        HEALTH_THRESHOLDS.activationD7.green,
        HEALTH_THRESHOLDS.activationD7.amber,
        false,
      ),
      thresholds: { green: "≥40%", amber: "20-40%", red: "<20%" },
      hint:
        activationD7 < HEALTH_THRESHOLDS.activationD7.amber
          ? "Onboarding débil: testa primeros 5 turnos del mentor y CTAs en /app/inicio."
          : "Activación razonable — testa empujar +5pp con check-in forzado en D1.",
    },
    {
      key: "retentionW2",
      label: "Retención semana 2",
      description:
        "% de signups (14-28d) que enviaron ≥1 mensaje en los últimos 7 días.",
      value: Math.round(retentionW2 * 10) / 10,
      unit: "percent",
      delta: null,
      status: classify(
        retentionW2,
        HEALTH_THRESHOLDS.retentionW2.green,
        HEALTH_THRESHOLDS.retentionW2.amber,
        false,
      ),
      thresholds: { green: "≥25%", amber: "10-25%", red: "<10%" },
      hint:
        retentionW2 < HEALTH_THRESHOLDS.retentionW2.amber
          ? "Habit loop débil: revisa carta semanal, rondas diarias y reminders."
          : "Habit loop funcional — empuja círculos para defenderla.",
    },
    {
      key: "churnPro30d",
      label: "Churn Pro 30d",
      description:
        "% de Pro cancelados en últimos 30d / (activos + cancelados). Menor es mejor.",
      value: Math.round(churnPro30d * 10) / 10,
      unit: "percent",
      delta: Math.round(churnDelta * 10) / 10,
      status: classify(
        churnPro30d,
        HEALTH_THRESHOLDS.churnPro30d.green,
        HEALTH_THRESHOLDS.churnPro30d.amber,
        true,
      ),
      thresholds: { green: "<5%", amber: "5-10%", red: ">10%" },
      hint:
        churnPro30d > HEALTH_THRESHOLDS.churnPro30d.amber
          ? "Revisa exit surveys, añade save offer + pausa suscripción."
          : "Churn bajo — ahora sí invierte en upsells y anual.",
    },
    {
      key: "llmCostPerActive",
      label: "Coste LLM / usuario activo",
      description:
        "Suma costUsd de LlmLog últimos 30d / usuarios activos (mensaje enviado) 30d.",
      value: Math.round(llmCostPerActive * 100) / 100,
      unit: "usd",
      delta: null,
      status: classify(
        llmCostPerActive,
        HEALTH_THRESHOLDS.llmCostPerActive.green,
        HEALTH_THRESHOLDS.llmCostPerActive.amber,
        true,
      ),
      thresholds: { green: "<$1", amber: "$1-$3", red: ">$3" },
      hint:
        llmCostPerActive > HEALTH_THRESHOLDS.llmCostPerActive.amber
          ? "Coste alto: revisa tamaño de contexto, prompt caching y modelo usado en impulse/cron."
          : "Unit economics sanos.",
    },
    {
      key: "llmErrorRate",
      label: "Error rate LLM 7d",
      description:
        "% de respuestas (Event MESSAGE_RECEIVED) con metadata.fallback=true en últimos 7d.",
      value: Math.round(llmErrorRate * 10) / 10,
      unit: "percent",
      delta: null,
      status: classify(
        llmErrorRate,
        HEALTH_THRESHOLDS.llmErrorRate.green,
        HEALTH_THRESHOLDS.llmErrorRate.amber,
        true,
      ),
      thresholds: { green: "<1%", amber: "1-5%", red: ">5%" },
      hint:
        llmErrorRate > HEALTH_THRESHOLDS.llmErrorRate.amber
          ? "Revisa Sentry + providers; considera retries y modelo de fallback."
          : "Fiabilidad LLM OK.",
    },
  ];

  const statusRank: Record<HealthStatus, number> = {
    green: 0,
    amber: 1,
    red: 2,
    unknown: 0,
  };
  const overall = metrics.reduce<HealthStatus>(
    (worst, m) => (statusRank[m.status] > statusRank[worst] ? m.status : worst),
    "green",
  );

  return {
    generatedAt: now.toISOString(),
    metrics,
    overall,
  };
}
