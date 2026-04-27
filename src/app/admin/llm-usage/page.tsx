"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AdminShell } from "@/features/admin/components/AdminShell";

// ── Types ─────────────────────────────────────────────────────────────────────

type PeriodSummary = {
  requests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  avgLatencyMs: number;
};

type ModelRow = {
  model: string;
  requests: number;
  totalTokens: number;
  costUsd: number;
  avgLatencyMs: number;
};

type SourceRow = {
  source: string;
  requests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  avgTotalTokens: number;
  avgLatencyMs: number;
  efficiencyRatio: number | null;
};

type ConsumerRow = {
  userId: string | null;
  email: string | null;
  name: string | null;
  requests: number;
  totalTokens: number;
  costUsd: number;
  avgTokensPerRequest: number;
};

type Recommendation = {
  source: string;
  issue: string;
  detail: string;
};

type LogRow = {
  id: string;
  userId: string | null;
  model: string;
  source: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  createdAt: string;
  prompt: string;
  response: string;
};

type Budget = {
  monthlyUsd: number;
  spentMtdUsd: number;
  projectedMonthUsd: number;
  daysElapsed: number;
  daysInMonth: number;
  percentSpent: number;
  percentProjected: number;
  level: "ok" | "warn" | "critical";
};

type DailyPoint = {
  day: string;          // YYYY-MM-DD
  requests: number;
  totalTokens: number;
  costUsd: number;
};

type LlmUsageData = {
  budget?: Budget;
  summary: { last7d: PeriodSummary; last30d: PeriodSummary; allTime: PeriodSummary };
  byModel: ModelRow[];
  bySource: SourceRow[];
  topConsumers: ConsumerRow[];
  recommendations: Recommendation[];
  daily30d: DailyPoint[];
  latestLogs: LogRow[];
};

// ── Formatters ────────────────────────────────────────────────────────────────

function n(v: number) { return v.toLocaleString("es-ES"); }
function usd(v: number) {
  if (v === 0) return "$0.000000";
  if (v < 0.001) return `$${v.toFixed(6)}`;
  if (v < 1) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}
function dt(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

const ISSUE_LABEL: Record<string, string> = {
  prompt_overhead: "Prompt demasiado pesado",
  long_completion: "Respuesta muy larga",
  high_total:      "Total por llamada alto",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LlmUsagePage() {
  const router = useRouter();
  const [data, setData] = useState<LlmUsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/llm-usage", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/admin/login?next=/admin/llm-usage");
          return;
        }
        if (!res.ok) {
          setError(`Error ${res.status} al cargar datos de uso LLM.`);
          return;
        }
        setData((await res.json()) as LlmUsageData);
      })
      .catch(() => setError("No se pudieron cargar los datos de uso LLM."));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  if (error) return <main className="min-h-screen bg-zinc-950 p-6 text-white">{error}</main>;
  if (!data)  return <main className="min-h-screen bg-zinc-950 p-6 text-zinc-500">Cargando uso LLM...</main>;

  const { summary, byModel, bySource, topConsumers, recommendations, daily30d, latestLogs, budget } = data;

  return (
    <AdminShell
      title="LLM Usage"
      subtitle="Tokens, coste, top consumers y eficiencia de prompts por source."
      onLogout={handleLogout}
    >

      {/* ── Budget mensual ── */}
      {budget && <BudgetPanel b={budget} />}

      {/* ── Trend de costes 30d ── */}
      <DailyCostTrend points={daily30d} />


      {/* ── Recomendaciones de optimización ── */}
      {recommendations.length > 0 && (
        <AdminPanel id="recommendations" title="Optimizaciones detectadas" description="Issues automáticos basados en el ratio prompt/completion por source.">
          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <div key={i} className="rounded-xl border-l-4 border-signal-warning bg-signal-warning/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-zinc-800 px-2 py-0.5 font-semibold text-white">{r.source}</span>
                  <span className="rounded bg-signal-warning/20 px-2 py-0.5 font-semibold text-white">
                    {ISSUE_LABEL[r.issue] ?? r.issue}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white">{r.detail}</p>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {/* ── Resumen 7d ── */}
      <AdminPanel id="summary-7d" title="Últimos 7 días">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <AdminMetricCard label="Requests"          value={n(summary.last7d.requests)} />
          <AdminMetricCard label="Tokens totales"    value={n(summary.last7d.totalTokens)}      accent="sky" />
          <AdminMetricCard label="Tokens prompt"     value={n(summary.last7d.promptTokens)} />
          <AdminMetricCard label="Tokens respuesta"  value={n(summary.last7d.completionTokens)} />
          <AdminMetricCard label="Coste estimado"    value={usd(summary.last7d.costUsd)}         accent="emerald" />
          <AdminMetricCard label="Latencia media"    value={`${n(summary.last7d.avgLatencyMs)} ms`} accent="amber" />
        </div>
      </AdminPanel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AdminPanel id="summary-30d" title="Últimos 30 días">
          <div className="grid grid-cols-2 gap-4">
            <AdminMetricCard label="Requests"       value={n(summary.last30d.requests)} />
            <AdminMetricCard label="Tokens totales" value={n(summary.last30d.totalTokens)} accent="sky" />
            <AdminMetricCard label="Coste estimado" value={usd(summary.last30d.costUsd)}   accent="emerald" />
            <AdminMetricCard label="Latencia media" value={`${n(summary.last30d.avgLatencyMs)} ms`} accent="amber" />
          </div>
        </AdminPanel>

        <AdminPanel id="summary-all" title="Todo el tiempo">
          <div className="grid grid-cols-2 gap-4">
            <AdminMetricCard label="Requests"       value={n(summary.allTime.requests)} />
            <AdminMetricCard label="Tokens totales" value={n(summary.allTime.totalTokens)} accent="sky" />
            <AdminMetricCard label="Coste total"    value={usd(summary.allTime.costUsd)}    accent="emerald" />
            <AdminMetricCard label="Latencia media" value={`${n(summary.allTime.avgLatencyMs)} ms`} accent="amber" />
          </div>
        </AdminPanel>
      </div>

      {/* ── Top consumers ── */}
      {topConsumers.length > 0 && (
        <AdminPanel
          id="top-consumers"
          title="Top consumers"
          description="Usuarios con más tokens consumidos (all-time). Útil para calibrar límites por plan."
        >
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/30">
                  <th className="px-3 py-2 text-left   text-[11px] font-semibold uppercase tracking-wide text-zinc-500">#</th>
                  <th className="px-3 py-2 text-left   text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Usuario</th>
                  <th className="px-3 py-2 text-right  text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Requests</th>
                  <th className="px-3 py-2 text-right  text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Tokens</th>
                  <th className="px-3 py-2 text-right  text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Tokens/req</th>
                  <th className="px-3 py-2 text-right  text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Coste</th>
                </tr>
              </thead>
              <tbody>
                {topConsumers.map((c, i) => (
                  <tr key={c.userId ?? i} className={`border-b border-zinc-800 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-800/20"}`}>
                    <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-white">{c.email ?? c.userId?.slice(0, 12) ?? "anónimo"}</p>
                      {c.name && <p className="text-xs text-zinc-500">{c.name}</p>}
                    </td>
                    <td className="px-3 py-2 text-right text-white">{n(c.requests)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-white">{n(c.totalTokens)}</td>
                    <td className="px-3 py-2 text-right text-zinc-500">{n(c.avgTokensPerRequest)}</td>
                    <td className="px-3 py-2 text-right text-emerald-400 font-mono">{usd(c.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}

      {/* ── Eficiencia por source ── */}
      {bySource.length > 0 && (
        <AdminPanel
          id="by-source"
          title="Eficiencia por source"
          description="Ratio completion/prompt: valores bajos indican que el system prompt es desproporcionadamente largo respecto a la respuesta."
        >
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/30">
                  <th className="px-3 py-2 text-left  text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Source</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Reqs</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Ø prompt</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Ø completion</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Ratio</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Ø latencia</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Coste total</th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((s, i) => {
                  const ratio = s.efficiencyRatio;
                  const ratioColor =
                    ratio === null ? "text-zinc-500" :
                    ratio >= 0.3  ? "text-emerald-400" :
                    ratio >= 0.15 ? "text-amber-400"   : "text-rose-400";

                  return (
                    <tr key={s.source} className={`border-b border-zinc-800 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-800/20"}`}>
                      <td className="px-3 py-2 font-semibold text-white">{s.source}</td>
                      <td className="px-3 py-2 text-right text-zinc-500">{n(s.requests)}</td>
                      <td className="px-3 py-2 text-right text-white">{n(s.avgPromptTokens)}</td>
                      <td className="px-3 py-2 text-right text-white">{n(s.avgCompletionTokens)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${ratioColor}`}>
                        {ratio !== null ? ratio.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-500">{n(s.avgLatencyMs)} ms</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-400">{usd(s.costUsd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Ratio = completion / prompt. Verde ≥ 0.30 · Amarillo ≥ 0.15 · Rojo &lt; 0.15
          </p>
        </AdminPanel>
      )}

      {/* ── Por modelo ── */}
      {byModel.length > 0 && (
        <AdminPanel id="by-model" title="Por modelo">
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/30">
                  <th className="px-3 py-2 text-left  text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Modelo</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Requests</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Tokens</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Coste</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Latencia media</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((row, i) => (
                  <tr key={row.model} className={`border-b border-zinc-800 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-800/20"}`}>
                    <td className="px-3 py-2 font-mono text-xs text-white">{row.model}</td>
                    <td className="px-3 py-2 text-right text-white">{n(row.requests)}</td>
                    <td className="px-3 py-2 text-right text-white">{n(row.totalTokens)}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{usd(row.costUsd)}</td>
                    <td className="px-3 py-2 text-right text-zinc-500">{n(row.avgLatencyMs)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}

      {/* ── Últimas llamadas ── */}
      <AdminPanel id="latest-logs" title="Últimas llamadas" description="Los 50 más recientes. Clic para ver prompt / respuesta completos.">
        {latestLogs.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin logs todavía.</p>
        ) : (
          <div className="space-y-2">
            {latestLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-zinc-800 bg-zinc-900">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-white">
                      {log.model.split("/").pop()}
                    </span>
                    <span className="rounded bg-zinc-800/60 px-2 py-0.5 text-zinc-500">{log.source}</span>
                    <span className="font-semibold text-white">{n(log.totalTokens)} tok</span>
                    <span className="font-mono text-emerald-400">{usd(log.costUsd)}</span>
                    <span className="text-zinc-500">{n(log.latencyMs)} ms</span>
                    {log.userId && (
                      <span className="font-mono text-zinc-500">{log.userId.slice(0, 8)}…</span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">{dt(log.createdAt)}</span>
                </button>

                {expanded === log.id && (
                  <div className="space-y-3 border-t border-zinc-800 px-4 py-3">
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Prompt</p>
                      <p className="whitespace-pre-wrap rounded bg-zinc-800/40 p-2 text-xs text-white">{log.prompt}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Respuesta</p>
                      <p className="whitespace-pre-wrap rounded bg-zinc-800/40 p-2 text-xs text-white">{log.response}</p>
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-500">
                      <span>Prompt: {n(log.promptTokens)} tok</span>
                      <span>Completion: {n(log.completionTokens)} tok</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminPanel>

    </AdminShell>
  );
}

// ── Budget panel ──────────────────────────────────────────────────────────────

function BudgetPanel({ b }: { b: Budget }) {
  const spentColor = b.percentSpent >= 100 ? "bg-rose-500" : b.percentSpent >= 70 ? "bg-amber-500" : "bg-emerald-500";
  const projColor = b.percentProjected >= 100 ? "bg-rose-500" : b.percentProjected >= 70 ? "bg-amber-500" : "bg-emerald-500";
  const headIcon = b.level === "critical" ? "🔴" : b.level === "warn" ? "🟠" : "🟢";

  const headDescription =
    b.level === "critical" && b.spentMtdUsd >= b.monthlyUsd
      ? "🚨 Budget mensual SUPERADO."
      : b.level === "critical"
        ? "🚨 La proyección al fin de mes supera el budget. Optimiza prompts o sube el techo."
        : b.level === "warn"
          ? "⚠️ A este ritmo te acercas al límite del budget mensual."
          : "Consumo dentro del presupuesto.";

  return (
    <AdminPanel
      id="budget"
      title={`${headIcon} Budget LLM`}
      description={headDescription}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Budget mensual</p>
          <p className="mt-1 text-xl font-bold text-white">${b.monthlyUsd.toFixed(2)}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Día {Math.ceil(b.daysElapsed)} de {b.daysInMonth}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Gastado este mes</p>
          <p className="mt-1 text-xl font-bold text-white">${b.spentMtdUsd.toFixed(2)}</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full ${spentColor} transition-all`}
              style={{ width: `${Math.min(100, b.percentSpent)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">{b.percentSpent.toFixed(0)}% del budget</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Proyección a fin de mes</p>
          <p className="mt-1 text-xl font-bold text-white">${b.projectedMonthUsd.toFixed(2)}</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full ${projColor} transition-all`}
              style={{ width: `${Math.min(100, b.percentProjected)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">{b.percentProjected.toFixed(0)}% del budget</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-zinc-500">
        Configura el budget en <code className="rounded bg-zinc-900 px-1.5 py-0.5">LLM_MONTHLY_BUDGET_USD</code> (env). Default: $200.
      </p>
    </AdminPanel>
  );
}

function DailyCostTrend({ points }: { points: DailyPoint[] }) {
  if (!points.length) return null;
  const maxCost = Math.max(...points.map((p) => p.costUsd), 0.0001);
  const totalCost = points.reduce((s, p) => s + p.costUsd, 0);
  const totalRequests = points.reduce((s, p) => s + p.requests, 0);
  const avgDailyCost = totalCost / points.length;

  // Linear regression on the last 14 days vs the prior 14 to flag rising spend.
  const recent = points.slice(-14);
  const prior = points.slice(-28, -14);
  const recentAvg = recent.reduce((s, p) => s + p.costUsd, 0) / Math.max(1, recent.length);
  const priorAvg = prior.reduce((s, p) => s + p.costUsd, 0) / Math.max(1, prior.length);
  const trendPct = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : null;
  const trendDirection: "up" | "down" | "flat" =
    trendPct === null || Math.abs(trendPct) < 5 ? "flat" : trendPct > 0 ? "up" : "down";
  const trendColor =
    trendDirection === "up" ? "text-rose-300" : trendDirection === "down" ? "text-emerald-300" : "text-zinc-400";
  const trendArrow = trendDirection === "up" ? "↗" : trendDirection === "down" ? "↘" : "→";

  return (
    <AdminPanel
      id="daily-cost-trend"
      title="Tendencia de coste — últimos 30 días"
      description={`Total: ${usd(totalCost)} · ${n(totalRequests)} requests · media ${usd(avgDailyCost)}/día`}
    >
      <div className="space-y-3">
        <div className="flex items-baseline justify-between text-[11px] text-zinc-500">
          <span>{points[0]?.day}</span>
          <span className={trendColor}>
            {trendArrow} 14d vs 14d previos:{" "}
            {trendPct === null ? "—" : `${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}%`}
          </span>
          <span>{points[points.length - 1]?.day}</span>
        </div>
        <div className="flex h-32 items-end gap-1">
          {points.map((p) => {
            const heightPct = Math.max(2, (p.costUsd / maxCost) * 100);
            return (
              <div
                key={p.day}
                className="group relative flex-1 rounded-t bg-emerald-500/30 transition-colors hover:bg-emerald-400/60"
                style={{ height: `${heightPct}%` }}
                title={`${p.day} · ${usd(p.costUsd)} · ${n(p.requests)} req`}
              >
                <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                  {usd(p.costUsd)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AdminPanel>
  );
}
