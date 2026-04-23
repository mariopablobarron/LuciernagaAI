"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Users } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

const MILESTONES = [1, 3, 7, 14, 30] as const;

type Milestone = (typeof MILESTONES)[number];

type CohortRow = {
  week: string;
  totalUsers: number;
  retention: Record<Milestone, { count: number; rate: number | null }>;
};

type RetentionData = {
  cohorts: CohortRow[];
  overall: Record<Milestone, number | null>;
  totalUsers: number;
  milestones: Milestone[];
};

function heatColor(rate: number | null): string {
  if (rate === null) return "bg-zinc-800 text-zinc-600";
  if (rate >= 0.5) return "bg-emerald-500/60 text-white";
  if (rate >= 0.3) return "bg-emerald-500/30 text-emerald-200";
  if (rate >= 0.15) return "bg-amber-500/30 text-amber-200";
  if (rate > 0) return "bg-red-500/20 text-red-300";
  return "bg-zinc-800 text-zinc-500";
}

function fmtRate(r: number | null): string {
  if (r === null) return "—";
  return `${(r * 100).toFixed(0)}%`;
}

function fmtWeek(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function RetencionPage() {
  const router = useRouter();
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeTeam, setIncludeTeam] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = includeTeam ? "?includeTeam=1" : "";
      const res = await fetch(`/api/admin/retention${qs}`, { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setData(await res.json());
    } catch {
      toast.error("Error al cargar retención");
    } finally {
      setLoading(false);
    }
  }, [router, includeTeam]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      title="Retención por cohorte semanal"
      subtitle="% de usuarios activos (mensaje enviado) en cada milestone, agrupados por semana de signup."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center justify-between">
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a analytics
        </Link>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTeam}
              onChange={(e) => setIncludeTeam(e.target.checked)}
              className="accent-violet-500"
            />
            Incluir equipo
          </label>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refrescar
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 text-zinc-600 animate-spin" />
        </div>
      ) : !data ? null : data.cohorts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <p className="text-sm text-zinc-500">Sin cohortes en las últimas 12 semanas.</p>
        </div>
      ) : (
        <>
          {/* Overall retention */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Retención promedio (todas las cohortes)</h2>
              <span className="text-xs text-zinc-500">
                · {data.totalUsers.toLocaleString()} usuarios en 12 semanas
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {MILESTONES.map((m) => (
                <div key={m} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-center">
                  <p className="text-[10px] uppercase font-semibold text-zinc-500 mb-1">Día {m}</p>
                  <p
                    className={`text-2xl font-bold ${
                      data.overall[m] !== null && data.overall[m]! >= 0.3
                        ? "text-emerald-300"
                        : data.overall[m] !== null && data.overall[m]! >= 0.15
                          ? "text-amber-300"
                          : "text-zinc-300"
                    }`}
                  >
                    {fmtRate(data.overall[m])}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Cohort table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white">Cohortes semanales</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Clic en la celda para ver cuántos usuarios. Los días en blanco aún no han pasado suficiente tiempo.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500 text-xs uppercase">
                    <th className="px-5 py-2 font-semibold">Semana</th>
                    <th className="px-5 py-2 font-semibold text-right">N</th>
                    {MILESTONES.map((m) => (
                      <th key={m} className="px-3 py-2 font-semibold text-center">
                        D{m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data.cohorts.map((c) => (
                    <tr key={c.week} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-2 font-mono text-xs text-zinc-300">{fmtWeek(c.week)}</td>
                      <td className="px-5 py-2 text-right text-zinc-400">{c.totalUsers}</td>
                      {MILESTONES.map((m) => {
                        const cell = c.retention[m];
                        return (
                          <td key={m} className="px-1 py-1">
                            <div
                              className={`rounded-md py-1.5 text-xs font-bold text-center ${heatColor(cell.rate)}`}
                              title={cell.rate !== null ? `${cell.count} de ${c.totalUsers} usuarios` : "Aún no elegible"}
                            >
                              {fmtRate(cell.rate)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
