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

type LlmUsageData = {
  summary: { last7d: PeriodSummary; last30d: PeriodSummary; allTime: PeriodSummary };
  byModel: ModelRow[];
  bySource: SourceRow[];
  topConsumers: ConsumerRow[];
  recommendations: Recommendation[];
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
    fetch("/api/admin/llm-usage")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/admin/login?next=/admin/llm-usage");
          return;
        }
        setData((await res.json()) as LlmUsageData);
      })
      .catch(() => setError("No se pudieron cargar los datos de uso LLM."));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  if (error) return <main className="min-h-screen bg-background p-6 text-foreground">{error}</main>;
  if (!data)  return <main className="min-h-screen bg-background p-6 text-muted-foreground">Cargando uso LLM...</main>;

  const { summary, byModel, bySource, topConsumers, recommendations, latestLogs } = data;

  return (
    <AdminShell
      title="LLM Usage"
      subtitle="Tokens, coste, top consumers y eficiencia de prompts por source."
      onLogout={handleLogout}
    >

      {/* ── Recomendaciones de optimización ── */}
      {recommendations.length > 0 && (
        <AdminPanel id="recommendations" title="Optimizaciones detectadas" description="Issues automáticos basados en el ratio prompt/completion por source.">
          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <div key={i} className="rounded-xl border-l-4 border-signal-warning bg-signal-warning/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-muted px-2 py-0.5 font-semibold text-foreground">{r.source}</span>
                  <span className="rounded bg-signal-warning/20 px-2 py-0.5 font-semibold text-foreground">
                    {ISSUE_LABEL[r.issue] ?? r.issue}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground">{r.detail}</p>
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
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left   text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left   text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Usuario</th>
                  <th className="px-3 py-2 text-right  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requests</th>
                  <th className="px-3 py-2 text-right  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tokens</th>
                  <th className="px-3 py-2 text-right  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tokens/req</th>
                  <th className="px-3 py-2 text-right  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Coste</th>
                </tr>
              </thead>
              <tbody>
                {topConsumers.map((c, i) => (
                  <tr key={c.userId ?? i} className={`border-b border-border ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground">{c.email ?? c.userId?.slice(0, 12) ?? "anónimo"}</p>
                      {c.name && <p className="text-xs text-muted-foreground">{c.name}</p>}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">{n(c.requests)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{n(c.totalTokens)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{n(c.avgTokensPerRequest)}</td>
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
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Source</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reqs</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ø prompt</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ø completion</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ratio</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ø latencia</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Coste total</th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((s, i) => {
                  const ratio = s.efficiencyRatio;
                  const ratioColor =
                    ratio === null ? "text-muted-foreground" :
                    ratio >= 0.3  ? "text-emerald-400" :
                    ratio >= 0.15 ? "text-amber-400"   : "text-rose-400";

                  return (
                    <tr key={s.source} className={`border-b border-border ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                      <td className="px-3 py-2 font-semibold text-foreground">{s.source}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{n(s.requests)}</td>
                      <td className="px-3 py-2 text-right text-foreground">{n(s.avgPromptTokens)}</td>
                      <td className="px-3 py-2 text-right text-foreground">{n(s.avgCompletionTokens)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${ratioColor}`}>
                        {ratio !== null ? ratio.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{n(s.avgLatencyMs)} ms</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-400">{usd(s.costUsd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Ratio = completion / prompt. Verde ≥ 0.30 · Amarillo ≥ 0.15 · Rojo &lt; 0.15
          </p>
        </AdminPanel>
      )}

      {/* ── Por modelo ── */}
      {byModel.length > 0 && (
        <AdminPanel id="by-model" title="Por modelo">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left  text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Modelo</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requests</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tokens</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Coste</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Latencia media</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((row, i) => (
                  <tr key={row.model} className={`border-b border-border ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{row.model}</td>
                    <td className="px-3 py-2 text-right text-foreground">{n(row.requests)}</td>
                    <td className="px-3 py-2 text-right text-foreground">{n(row.totalTokens)}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{usd(row.costUsd)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{n(row.avgLatencyMs)} ms</td>
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
          <p className="text-sm text-muted-foreground">Sin logs todavía.</p>
        ) : (
          <div className="space-y-2">
            {latestLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border bg-card">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-foreground">
                      {log.model.split("/").pop()}
                    </span>
                    <span className="rounded bg-muted/60 px-2 py-0.5 text-muted-foreground">{log.source}</span>
                    <span className="font-semibold text-foreground">{n(log.totalTokens)} tok</span>
                    <span className="font-mono text-emerald-400">{usd(log.costUsd)}</span>
                    <span className="text-muted-foreground">{n(log.latencyMs)} ms</span>
                    {log.userId && (
                      <span className="font-mono text-muted-foreground">{log.userId.slice(0, 8)}…</span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{dt(log.createdAt)}</span>
                </button>

                {expanded === log.id && (
                  <div className="space-y-3 border-t border-border px-4 py-3">
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prompt</p>
                      <p className="whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs text-foreground">{log.prompt}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Respuesta</p>
                      <p className="whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs text-foreground">{log.response}</p>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
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
