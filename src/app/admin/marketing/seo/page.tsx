"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  ExternalLink,
  Globe,
  Lightbulb,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

type GSCData = {
  ok: boolean;
  site?: string;
  range?: { startDate: string; endDate: string };
  totals?: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages?: Array<{ page: string; clicks: number; impressions: number }>;
  error?: string;
};

type GA4Data = {
  ok: boolean;
  range?: { startDate: string; endDate: string };
  totals?: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDurationSeconds: number;
    bounceRate: number;
    conversions: number;
  };
  topSources?: Array<{ source: string; users: number; sessions: number }>;
  topPages?: Array<{ path: string; views: number; avgDurationSec: number }>;
  byDay?: Array<{ date: string; activeUsers: number; sessions: number }>;
  error?: string;
};

type ExternalData = {
  ok: boolean;
  generatedAt: string;
  rangeDays: number;
  providers: {
    ga4: { configured: boolean; data: GA4Data };
    searchConsole: { configured: boolean; data: GSCData };
  };
};

type Opportunity = {
  id: string;
  kind: string;
  priority: number;
  url: string | null;
  query: string | null;
  recommendation: string;
  status: "open" | "in_progress" | "done" | "dismissed";
  detectedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  ranking_4_20: "Posición 4-20 (empuje rentable)",
  low_ctr_high_impressions: "CTR bajo / muchas impresiones",
  clicks_drop: "Caída de clicks",
  impressions_growing_low_clicks: "Impresiones suben, clicks no",
  cannibalization: "Canibalización de keywords",
  orgtraffic_low_conversion: "Tráfico OK · conversión baja",
  high_conversion_low_traffic: "Conversión alta · poco tráfico",
  new_content: "Oportunidad de nuevo contenido",
  title_meta: "Mejorar title / meta description",
  internal_links: "Reforzar enlazado interno",
};

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("es-ES", { maximumFractionDigits: decimals });
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function positionColor(pos: number) {
  if (pos <= 3) return "text-emerald-400";
  if (pos <= 10) return "text-amber-400";
  return "text-rose-400";
}

function priorityColor(p: number) {
  if (p >= 9) return "text-red-300 bg-red-500/15 border-red-500/40";
  if (p >= 7) return "text-orange-200 bg-orange-500/15 border-orange-500/40";
  if (p >= 5) return "text-amber-200 bg-amber-500/15 border-amber-500/40";
  return "text-zinc-300 bg-zinc-700/40 border-zinc-600";
}

function MiniBar({ value, max, color = "bg-violet-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-20 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Sparkline de barras diarias
function DailySparkline({ days }: { days: Array<{ date: string; activeUsers: number; sessions: number }> }) {
  if (!days.length) return <p className="text-xs text-zinc-600 italic">Sin datos por día</p>;
  const maxSessions = Math.max(...days.map((d) => d.sessions), 1);

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-0.5 h-16">
        {days.map((d) => {
          const heightPct = Math.max((d.sessions / maxSessions) * 100, 4);
          return (
            <div
              key={d.date}
              className="group relative flex-1"
              title={`${d.date}: ${d.sessions} sesiones, ${d.activeUsers} usuarios`}
            >
              <div
                className="w-full bg-violet-500/60 hover:bg-violet-400 rounded-sm transition-colors cursor-default"
                style={{ height: `${heightPct}%` }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-zinc-200 whitespace-nowrap shadow-lg">
                {d.date.slice(5)}: <b>{d.sessions}</b> ses
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600">
        <span>{days[0]?.date.slice(5)}</span>
        <span>{days[days.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeoMarketingPage() {
  const router = useRouter();
  const [rangeDays, setRangeDays] = useState<7 | 28>(28);
  const [data, setData] = useState<ExternalData | null>(null);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.push("/admin/login");
  }

  const loadMetrics = useCallback(
    async (days: 7 | 28) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics-external?range=${days}`, { cache: "no-store" });
        if (!res.ok) { toast.error("Error cargando métricas"); return; }
        const json = (await res.json()) as ExternalData;
        setData(json);
        setGeneratedAt(json.generatedAt);
      } catch {
        toast.error("Error de red al cargar métricas");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadOpps = useCallback(async () => {
    setLoadingOpps(true);
    try {
      const res = await fetch("/api/admin/seo-opportunities?status=open&limit=20", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { opportunities: Opportunity[] };
      setOpps(json.opportunities ?? []);
    } catch {
      /* silencioso — tabla de oportunidades puede no existir aún */
    } finally {
      setLoadingOpps(false);
    }
  }, []);

  useEffect(() => { void loadMetrics(rangeDays); }, [rangeDays, loadMetrics]);
  useEffect(() => { void loadOpps(); }, [loadOpps]);

  const gsc = data?.providers.searchConsole;
  const ga4 = data?.providers.ga4;

  const gscOk = gsc?.configured && gsc.data.ok;
  const ga4Ok = ga4?.configured && ga4.data.ok;

  const topQueries = gsc?.data.topQueries ?? [];
  const topPagesGSC = gsc?.data.topPages ?? [];
  const topPagesGA4 = ga4?.data.topPages ?? [];
  const topSources = ga4?.data.topSources ?? [];
  const byDay = ga4?.data.byDay ?? [];

  const maxClicks = Math.max(...topQueries.map((q) => q.clicks), 1);
  const maxImpressions = Math.max(...topQueries.map((q) => q.impressions), 1);
  const maxPageClicks = Math.max(...topPagesGSC.map((p) => p.clicks), 1);
  const maxPageViews = Math.max(...topPagesGA4.map((p) => p.views), 1);
  const maxSourceUsers = Math.max(...topSources.map((s) => s.users), 1);

  const oppsByPriority = [...opps].sort((a, b) => b.priority - a.priority);

  return (
    <AdminShell
      title="SEO · Agente de Marketing"
      subtitle="Visibilidad orgánica, evolución de tráfico e ideas accionables"
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="space-y-6">

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Range toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5 self-start">
            {([7, 28] as const).map((d) => (
              <button
                key={d}
                onClick={() => setRangeDays(d)}
                className={`px-4 py-1.5 text-xs rounded-md font-medium transition ${
                  rangeDays === d
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {d === 7 ? "7 días" : "28 días"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {generatedAt ? (
              <span className="text-[11px] text-zinc-600">
                Actualizado {new Date(generatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
            <button
              onClick={() => { void loadMetrics(rangeDays); void loadOpps(); }}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refrescar
            </button>
            <Link
              href="/admin/analytics/seo"
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-violet-300 transition"
            >
              Oportunidades detalle
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* ── GSC KPIs ────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Search Console</h2>
            {!gsc?.configured ? (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">No configurado</span>
            ) : gscOk ? (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">Conectado</span>
            ) : (
              <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-full">Error</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : gscOk ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <AdminMetricCard
                label="Clicks orgánicos"
                value={fmt(gsc.data.totals?.clicks ?? 0)}
                accent="violet"
                icon={<MousePointerClick className="h-5 w-5" />}
                hint={`Últimos ${rangeDays} días`}
              />
              <AdminMetricCard
                label="Impresiones"
                value={fmt(gsc.data.totals?.impressions ?? 0)}
                accent="sky"
                icon={<Globe className="h-5 w-5" />}
                hint="Veces que apareces en SERP"
              />
              <AdminMetricCard
                label="CTR medio"
                value={fmtPct(gsc.data.totals?.ctr ?? 0)}
                accent="amber"
                icon={<Target className="h-5 w-5" />}
                hint="Clicks / impresiones"
              />
              <AdminMetricCard
                label="Posición media"
                value={fmt(gsc.data.totals?.position ?? 0, 1)}
                accent={
                  (gsc.data.totals?.position ?? 99) <= 5
                    ? "emerald"
                    : (gsc.data.totals?.position ?? 99) <= 15
                    ? "amber"
                    : "rose"
                }
                icon={<BarChart3 className="h-5 w-5" />}
                hint="Posición 1 = óptimo"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-500">
              {gsc?.configured
                ? `Error: ${gsc.data.error ?? "No disponible"}`
                : "Configura GSC_OAUTH_REFRESH_TOKEN para activar Search Console."}
            </div>
          )}
        </div>

        {/* ── GA4 KPIs ────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Google Analytics 4</h2>
            {!ga4?.configured ? (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">No configurado</span>
            ) : ga4Ok ? (
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">Conectado</span>
            ) : (
              <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-full">Error</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : ga4Ok ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <AdminMetricCard
                label="Usuarios activos"
                value={fmt(ga4.data.totals?.activeUsers ?? 0)}
                accent="emerald"
                icon={<Users className="h-5 w-5" />}
                hint={`Últimos ${rangeDays} días`}
              />
              <AdminMetricCard
                label="Sesiones"
                value={fmt(ga4.data.totals?.sessions ?? 0)}
                accent="sky"
                icon={<BarChart3 className="h-5 w-5" />}
                hint="Total de sesiones"
              />
              <AdminMetricCard
                label="Páginas vistas"
                value={fmt(ga4.data.totals?.screenPageViews ?? 0)}
                accent="violet"
                icon={<Globe className="h-5 w-5" />}
                hint="Vistas totales"
              />
              <AdminMetricCard
                label="Tasa de rebote"
                value={fmtPct(ga4.data.totals?.bounceRate ?? 0)}
                accent={
                  (ga4.data.totals?.bounceRate ?? 0) < 0.4
                    ? "emerald"
                    : (ga4.data.totals?.bounceRate ?? 0) < 0.6
                    ? "amber"
                    : "rose"
                }
                icon={<TrendingDown className="h-5 w-5" />}
                hint="Menor = mejor"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-500">
              {ga4?.configured
                ? `Error: ${ga4.data.error ?? "No disponible"}`
                : "Configura GA4 para activar Analytics."}
            </div>
          )}
        </div>

        {/* ── Evolución + Top Sources ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Sparkline diaria */}
          <div className="lg:col-span-2">
            <AdminPanel
              title="Evolución de sesiones"
              description={`Sesiones diarias · últimos ${rangeDays} días`}
              tooltip="Cada barra es un día. Hover para ver detalle."
            >
              {loading ? (
                <div className="h-24 bg-zinc-800/40 rounded-lg animate-pulse" />
              ) : ga4Ok && byDay.length > 0 ? (
                <DailySparkline days={byDay} />
              ) : (
                <p className="text-sm text-zinc-600 italic py-4 text-center">Sin datos por día disponibles</p>
              )}
            </AdminPanel>
          </div>

          {/* Top fuentes */}
          <AdminPanel
            title="Fuentes de tráfico"
            description="Usuarios por origen"
          >
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-7 bg-zinc-800/40 rounded animate-pulse" />
                ))}
              </div>
            ) : ga4Ok && topSources.length > 0 ? (
              <div className="space-y-2.5">
                {topSources.slice(0, 6).map((s) => (
                  <div key={s.source} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 truncate max-w-[130px]">{s.source || "(directo)"}</span>
                      <span className="text-zinc-500 font-mono">{fmt(s.users)}</span>
                    </div>
                    <MiniBar value={s.users} max={maxSourceUsers} color="bg-emerald-500" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">Sin datos de fuentes</p>
            )}
          </AdminPanel>
        </div>

        {/* ── Top Queries + Top Páginas GSC ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Queries */}
          <AdminPanel
            title="Top consultas"
            description="Búsquedas que te traen tráfico orgánico"
            tooltip="Fuente: Google Search Console"
            headerRight={
              <Link href="/admin/analytics/seo" className="text-[11px] text-zinc-500 hover:text-violet-300 flex items-center gap-1 transition">
                Ver oportunidades <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          >
            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-zinc-800/40 rounded animate-pulse" />)}</div>
            ) : gscOk && topQueries.length > 0 ? (
              <div className="space-y-0 divide-y divide-zinc-800/60">
                {topQueries.slice(0, 10).map((q) => (
                  <div key={q.query} className="py-2.5 grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center">
                    <div>
                      <p className="text-sm text-zinc-200 leading-tight truncate">{q.query}</p>
                      <MiniBar value={q.impressions} max={maxImpressions} color="bg-sky-500/60" />
                    </div>
                    <span className="text-xs font-mono text-zinc-300 text-right">{fmt(q.clicks)} <span className="text-zinc-600">clicks</span></span>
                    <span className="text-xs font-mono text-zinc-500">{fmtPct(q.ctr)}</span>
                    <span className={`text-xs font-bold ${positionColor(q.position)}`}>#{fmt(q.position, 1)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600 italic py-4 text-center">
                {gscOk ? "Sin consultas en este período" : "GSC no disponible"}
              </p>
            )}
          </AdminPanel>

          {/* Top páginas por clicks */}
          <AdminPanel
            title="Top páginas (orgánico)"
            description="Por clicks desde Search Console"
          >
            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-zinc-800/40 rounded animate-pulse" />)}</div>
            ) : gscOk && topPagesGSC.length > 0 ? (
              <div className="space-y-0 divide-y divide-zinc-800/60">
                {topPagesGSC.slice(0, 10).map((p) => {
                  const path = p.page.replace(/^https?:\/\/[^/]+/, "") || "/";
                  return (
                    <div key={p.page} className="py-2.5 grid grid-cols-[1fr_auto_auto] gap-x-4 items-center">
                      <div>
                        <p className="text-sm text-zinc-200 leading-tight truncate font-mono text-[11px]">{path}</p>
                        <MiniBar value={p.clicks} max={maxPageClicks} color="bg-violet-500/60" />
                      </div>
                      <span className="text-xs font-mono text-zinc-300">{fmt(p.clicks)} <span className="text-zinc-600">clicks</span></span>
                      <span className="text-xs text-zinc-500">{fmt(p.impressions)} imp</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-600 italic py-4 text-center">
                {gscOk ? "Sin datos de páginas" : "GSC no disponible"}
              </p>
            )}
          </AdminPanel>
        </div>

        {/* ── Páginas por vistas GA4 ───────────────────────────────────────── */}
        {ga4Ok && topPagesGA4.length > 0 ? (
          <AdminPanel
            title="Páginas más visitadas (GA4)"
            description="Por vistas totales y tiempo medio"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-zinc-600 border-b border-zinc-800">
                    <th className="text-left pb-2 font-medium">Página</th>
                    <th className="text-right pb-2 font-medium pr-4">Vistas</th>
                    <th className="text-right pb-2 font-medium">T. medio</th>
                    <th className="pb-2 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {topPagesGA4.slice(0, 8).map((p) => (
                    <tr key={p.path} className="group hover:bg-zinc-800/20 transition">
                      <td className="py-2.5 text-zinc-200 font-mono text-[11px] truncate max-w-[220px]">{p.path}</td>
                      <td className="py-2.5 text-right pr-4 text-zinc-300 font-medium">{fmt(p.views)}</td>
                      <td className="py-2.5 text-right text-zinc-500 text-xs whitespace-nowrap">
                        {Math.floor(p.avgDurationSec / 60)}m {Math.round(p.avgDurationSec % 60)}s
                      </td>
                      <td className="py-2.5 pl-3">
                        <MiniBar value={p.views} max={maxPageViews} color="bg-violet-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminPanel>
        ) : null}

        {/* ── Ideas del agente (Oportunidades abiertas) ───────────────────── */}
        <AdminPanel
          title="Ideas del agente SEO"
          description="Oportunidades detectadas automáticamente — ordenadas por prioridad"
          tooltip="El agente analiza GA4 + GSC diariamente y genera recomendaciones accionables."
          headerRight={
            <Link
              href="/admin/analytics/seo"
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 transition"
            >
              <Lightbulb className="h-3 w-3 text-amber-400" />
              Ver todas
            </Link>
          }
        >
          {loadingOpps ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-zinc-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : oppsByPriority.length === 0 ? (
            <div className="text-center py-6">
              <Lightbulb className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Sin ideas pendientes</p>
              <p className="text-xs text-zinc-700 mt-1">
                El agente genera ideas con el cron <code className="font-mono">/api/cron/seo-sync</code>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {oppsByPriority.slice(0, 8).map((op) => (
                <div
                  key={op.id}
                  className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 hover:bg-zinc-800/30 transition"
                >
                  <span
                    className={`mt-0.5 shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${priorityColor(op.priority)}`}
                  >
                    P{op.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-100 leading-snug">{op.recommendation}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      {KIND_LABELS[op.kind] ?? op.kind}
                      {op.query ? <> · <span className="font-mono">"{op.query}"</span></> : null}
                    </p>
                  </div>
                  <Link
                    href="/admin/analytics/seo"
                    className="shrink-0 text-zinc-600 hover:text-violet-300 transition mt-0.5"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}

              {oppsByPriority.length > 8 ? (
                <Link
                  href="/admin/analytics/seo"
                  className="flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-violet-300 py-2 transition"
                >
                  Ver {oppsByPriority.length - 8} ideas más
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          )}
        </AdminPanel>

        {/* ── Resumen de estado ────────────────────────────────────────────── */}
        <AdminPanel
          title="Estado del agente"
          description="Integraciones activas y configuración"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* GSC */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-medium text-zinc-200">Search Console</span>
              </div>
              <div className={`text-xs font-semibold ${gsc?.configured && gscOk ? "text-emerald-400" : "text-amber-400"}`}>
                {gsc?.configured ? (gscOk ? "✓ Activo" : "⚠ Error de datos") : "✗ No configurado"}
              </div>
              {gscOk ? (
                <p className="text-[11px] text-zinc-600">{gsc?.data.site}</p>
              ) : null}
            </div>

            {/* GA4 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-zinc-200">Google Analytics 4</span>
              </div>
              <div className={`text-xs font-semibold ${ga4?.configured && ga4Ok ? "text-emerald-400" : "text-amber-400"}`}>
                {ga4?.configured ? (ga4Ok ? "✓ Activo" : "⚠ Error de datos") : "✗ No configurado"}
              </div>
              {ga4Ok ? (
                <p className="text-[11px] text-zinc-600">
                  {fmt(ga4.data.totals?.activeUsers ?? 0)} usuarios en {rangeDays}d
                </p>
              ) : null}
            </div>

            {/* Cron */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-zinc-200">Cron SEO sync</span>
              </div>
              <div className={`text-xs font-semibold ${opps.length > 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                {opps.length > 0 ? `✓ ${opps.length} ideas activas` : "Sin datos aún"}
              </div>
              <p className="text-[11px] text-zinc-600 font-mono">/api/cron/seo-sync</p>
            </div>
          </div>
        </AdminPanel>

      </div>
    </AdminShell>
  );
}
