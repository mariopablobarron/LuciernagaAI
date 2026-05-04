"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Filter,
  Lightbulb,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { AdminShell } from "@/features/admin/components/AdminShell";

type Opportunity = {
  id: string;
  kind: string;
  priority: number;
  url: string | null;
  query: string | null;
  metrics: Record<string, unknown> | null;
  recommendation: string;
  status: "open" | "in_progress" | "done" | "dismissed";
  detectedAt: string;
};

const KIND_LABELS: Record<string, string> = {
  ranking_4_20: "Ranking 4-20 (empuje rentable)",
  low_ctr_high_impressions: "CTR bajo / muchas impresiones",
  clicks_drop: "Caída de clicks",
  impressions_growing_low_clicks: "Impresiones suben sin clicks",
  cannibalization: "Canibalización",
  orgtraffic_low_conversion: "Tráfico OK / conversión baja",
  high_conversion_low_traffic: "Conversión alta / poco tráfico",
  new_content: "Oportunidad de nuevo contenido",
  title_meta: "Mejorar title o meta",
  internal_links: "Reforzar enlazado interno",
};

const STATUS_LABELS: Record<Opportunity["status"], string> = {
  open: "Abierta",
  in_progress: "En curso",
  done: "Hecha",
  dismissed: "Descartada",
};

function priorityColor(p: number): string {
  if (p >= 9) return "text-red-300 bg-red-500/15 border-red-500/40";
  if (p >= 7) return "text-orange-200 bg-orange-500/15 border-orange-500/40";
  if (p >= 5) return "text-amber-200 bg-amber-500/15 border-amber-500/40";
  return "text-zinc-300 bg-zinc-700/40 border-zinc-600";
}

function statusColor(s: Opportunity["status"]): string {
  if (s === "done") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
  if (s === "dismissed") return "text-zinc-500 bg-zinc-800/50 border-zinc-700";
  if (s === "in_progress") return "text-cyan-300 bg-cyan-500/10 border-cyan-500/30";
  return "text-violet-200 bg-violet-500/15 border-violet-500/40";
}

export default function SeoOpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"open" | "all" | "in_progress" | "done" | "dismissed">("open");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.push("/admin/login");
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, limit: "500" });
      if (kindFilter) params.set("kind", kindFilter);
      const res = await fetch(`/api/admin/seo-opportunities?${params}`, { cache: "no-store" });
      if (!res.ok) {
        toast.error("No se pudieron cargar las oportunidades");
        return;
      }
      const json = (await res.json()) as { opportunities: Opportunity[] };
      setOpportunities(json.opportunities ?? []);
    } catch (err) {
      toast.error("Error de red");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, kindFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(id: string, status: Opportunity["status"]) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/seo-opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        toast.error("No se pudo actualizar");
        return;
      }
      toast.success(`Marcada como ${STATUS_LABELS[status]}`);
      // Si filtramos por "open" y movemos a otra, sale de la lista.
      void load();
    } finally {
      setUpdatingId(null);
    }
  }

  function downloadCsv() {
    const params = new URLSearchParams({ status: statusFilter, limit: "1000", format: "csv" });
    if (kindFilter) params.set("kind", kindFilter);
    window.location.href = `/api/admin/seo-opportunities?${params}`;
  }

  const allKinds = Array.from(new Set(opportunities.map((o) => o.kind)));

  return (
    <AdminShell
      title="Oportunidades SEO"
      subtitle="Detectadas por el agente desde GA4 + Search Console. Re-evaluadas en cada sync diario."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
              {(["open", "in_progress", "done", "dismissed", "all"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs rounded-md transition ${
                    statusFilter === s
                      ? "bg-violet-500/20 text-violet-200"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {s === "all" ? "Todas" : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3 w-3 text-zinc-500" />
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              >
                <option value="">Todos los tipos</option>
                {allKinds.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k] ?? k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refrescar
            </button>
            <button
              onClick={downloadCsv}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/60"
            >
              <Download className="h-3 w-3" />
              CSV
            </button>
            <Link
              href="/admin/analytics"
              className="text-xs text-zinc-500 underline hover:text-white"
            >
              ← Analytics
            </Link>
          </div>
        </div>

        {/* Empty state */}
        {!loading && opportunities.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center">
            <Lightbulb className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-white">Sin oportunidades</h2>
            <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
              {statusFilter === "open"
                ? "El agente no ha detectado oportunidades abiertas con los filtros actuales. ¿Has corrido el cron `/api/cron/seo-sync` después de configurar GA4 + Search Console?"
                : "No hay oportunidades con estos filtros."}
            </p>
            <pre className="mt-4 inline-block text-xs text-zinc-600 bg-zinc-950/60 px-3 py-2 rounded-lg font-mono">
              curl ".../api/cron/seo-sync?secret=$CRON_SECRET"
            </pre>
          </div>
        ) : null}

        {/* Lista */}
        <div className="space-y-2">
          {opportunities.map((op) => {
            const isExpanded = expandedId === op.id;
            return (
              <div
                key={op.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : op.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-800/30 transition"
                >
                  <ChevronRight
                    className={`h-4 w-4 text-zinc-500 mt-0.5 transition ${isExpanded ? "rotate-90" : ""}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${priorityColor(op.priority)}`}
                      >
                        P{op.priority}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${statusColor(op.status)}`}
                      >
                        {STATUS_LABELS[op.status]}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {KIND_LABELS[op.kind] ?? op.kind}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-100 leading-snug">
                      {op.recommendation}
                    </p>
                    {(op.url || op.query) ? (
                      <p className="text-[11px] text-zinc-500 mt-1 truncate">
                        {op.url ? <span className="font-mono">{op.url}</span> : null}
                        {op.url && op.query ? " · " : ""}
                        {op.query ? <span>“{op.query}”</span> : null}
                      </p>
                    ) : null}
                  </div>
                </button>

                {isExpanded ? (
                  <div className="px-4 pb-4 border-t border-zinc-800/60">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-2">Métricas</p>
                        {op.metrics ? (
                          <pre className="text-[11px] text-zinc-300 bg-zinc-950/60 rounded-lg p-3 overflow-x-auto">
                            {JSON.stringify(op.metrics, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-xs text-zinc-500">Sin datos.</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-2">Acciones</p>
                        <div className="space-y-1.5">
                          {(["in_progress", "done", "dismissed", "open"] as const)
                            .filter((s) => s !== op.status)
                            .map((s) => (
                              <button
                                key={s}
                                disabled={updatingId === op.id}
                                onClick={() => void changeStatus(op.id, s)}
                                className="w-full flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-50"
                              >
                                {updatingId === op.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : s === "done" ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : s === "dismissed" ? (
                                  <EyeOff className="h-3 w-3 text-zinc-500" />
                                ) : (
                                  <Eye className="h-3 w-3 text-cyan-400" />
                                )}
                                {STATUS_LABELS[s]}
                              </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-3">
                          Detectada{" "}
                          {new Date(op.detectedAt).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
