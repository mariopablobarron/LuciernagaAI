"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { InfoTooltip } from "@/features/admin/components/InfoTooltip";
import { Archive, ChevronDown, ChevronUp, Download, Database } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type SnapshotSummary = {
  id: string;
  type: string;
  label: string | null;
  summary: string | null;
  recordCount: number;
  createdAt: string;
};

type DecisionRecord = {
  id: string;
  metric: string;
  value: number;
  decision: string;
  createdAt: string;
};

type InsightRecord = {
  id: string;
  type: string;
  title: string;
  content: string;
  action: string;
  priority: string;
  confidence: string;
  createdAt: string;
};

type SnapshotData = {
  archivedAt: string;
  target: string;
  decisions?: DecisionRecord[];
  insights?: InsightRecord[];
};

type SnapshotFull = {
  id: string;
  type: string;
  label: string | null;
  data: SnapshotData;
  summary: string | null;
  recordCount: number;
  createdAt: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<SnapshotFull | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetch("/api/admin/insights/history")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/admin/login?next=/admin/research");
          return;
        }
        const json = (await res.json()) as { snapshots: SnapshotSummary[] };
        setSnapshots(json.snapshots);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }

    setExpandedId(id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/snapshots/${id}`);
      if (res.ok) {
        const json = (await res.json()) as { snapshot: SnapshotFull };
        setExpandedData(json.snapshot);
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      title="Archivo de investigación"
      subtitle="Historial completo de snapshots archivados. Cada reset genera un archivo que se conserva aquí para análisis posterior, diagnósticos e investigación de casos."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Explanation */}
      <AdminPanel
        title="Panel de investigación"
        tooltip="Este panel almacena todos los datos históricos del motor de decisiones e insights. Cada vez que se resetea el dashboard, los datos se archivan aquí automáticamente. Útil para análisis longitudinal, investigación de patrones y elaboración de diagnósticos."
      >
        <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
          <Database className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
          <div className="text-sm text-zinc-400 space-y-2">
            <p>
              <strong className="text-white">Cómo funciona:</strong> cada vez que pulsas &ldquo;Resetear historial&rdquo;
              en el dashboard, el sistema guarda automáticamente una copia completa de todas las decisiones
              e insights generados hasta ese momento.
            </p>
            <p>
              Los datos originales de usuarios, conversaciones, crisis y eventos <strong className="text-white">nunca se borran</strong>.
              Solo se archiva y limpia el historial del motor de decisiones para empezar un ciclo de análisis limpio.
            </p>
            <p>
              Puedes expandir cada snapshot para ver sus datos completos o descargarlo como JSON para análisis externo.
            </p>
          </div>
        </div>
      </AdminPanel>

      {/* Snapshots list */}
      <AdminPanel
        title="Snapshots archivados"
        tooltip="Lista de todos los archivos generados. Cada entrada incluye fecha, tipo de reset, cantidad de registros archivados y acceso a los datos completos."
        headerRight={
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <Archive className="h-3.5 w-3.5" />
            {snapshots.length} archivo{snapshots.length !== 1 ? "s" : ""}
          </span>
        }
      >
        {loading ? (
          <p className="text-sm text-zinc-500">Cargando archivos...</p>
        ) : snapshots.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-6 text-center">
            <Archive className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500">
              No hay snapshots todavía. Se crearán automáticamente cuando resetees el historial del dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snap) => (
              <div key={snap.id} className="rounded-xl border border-zinc-800 bg-zinc-900">
                {/* Header row */}
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors rounded-xl"
                  onClick={() => toggleExpand(snap.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-violet-500/15 px-2 py-0.5 font-semibold text-violet-300 border border-violet-500/30">
                      {snap.type}
                    </span>
                    <span className="font-semibold text-white">
                      {snap.label ?? `Snapshot ${snap.id.slice(0, 8)}`}
                    </span>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">
                      {snap.recordCount} registros
                    </span>
                    <span className="text-zinc-500">{formatDate(snap.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition-colors"
                      title="Descargar JSON"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const res = await fetch(`/api/admin/snapshots/${snap.id}`);
                        if (res.ok) {
                          const json = await res.json();
                          downloadJson(json.snapshot, `snapshot-${snap.id}.json`);
                        }
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {expandedId === snap.id ? (
                      <ChevronUp className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedId === snap.id && (
                  <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
                    {loadingDetail ? (
                      <p className="text-sm text-zinc-500">Cargando datos...</p>
                    ) : expandedData ? (
                      <>
                        {snap.summary && (
                          <p className="text-sm text-zinc-400">{snap.summary}</p>
                        )}

                        {/* Decisions */}
                        {expandedData.data.decisions && expandedData.data.decisions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Decisiones archivadas ({expandedData.data.decisions.length})
                              </h4>
                              <InfoTooltip text="Cada decisión muestra la métrica que la disparó, su valor numérico y la conclusión del motor." />
                            </div>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {expandedData.data.decisions.map((d) => (
                                <div
                                  key={d.id}
                                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                                >
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                    <span className="rounded bg-zinc-800 px-2 py-0.5 font-semibold text-white">
                                      {d.metric}
                                    </span>
                                    <span>valor {d.value.toFixed(2)}</span>
                                    <span>{formatDate(d.createdAt)}</span>
                                  </div>
                                  <p className="mt-1 text-sm text-white">{d.decision}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Insights */}
                        {expandedData.data.insights && expandedData.data.insights.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Insights archivados ({expandedData.data.insights.length})
                              </h4>
                              <InfoTooltip text="Cada insight incluye tipo, prioridad, nivel de confianza y la acción que el motor recomendó." />
                            </div>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {expandedData.data.insights.map((ins) => (
                                <div
                                  key={ins.id}
                                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                                >
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                    <span className="rounded bg-zinc-800 px-2 py-0.5 font-semibold text-white">
                                      {ins.type}
                                    </span>
                                    <span
                                      className={`rounded px-2 py-0.5 font-semibold ${
                                        ins.priority === "high"
                                          ? "bg-red-500/15 text-red-400"
                                          : ins.priority === "medium"
                                            ? "bg-amber-500/15 text-amber-400"
                                            : "bg-emerald-500/15 text-emerald-400"
                                      }`}
                                    >
                                      {ins.priority}
                                    </span>
                                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">
                                      confianza {ins.confidence}
                                    </span>
                                    <span>{formatDate(ins.createdAt)}</span>
                                  </div>
                                  <p className="mt-1 text-sm font-semibold text-white">{ins.title}</p>
                                  <p className="mt-1 text-sm text-zinc-400">{ins.content}</p>
                                  <p className="mt-1 text-sm text-violet-400">{ins.action}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-zinc-500">No se pudieron cargar los datos.</p>
                    )}
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
