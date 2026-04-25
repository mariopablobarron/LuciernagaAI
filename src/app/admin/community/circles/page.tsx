"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Activity, AlertTriangle, HeartPulse, RefreshCw, Users, Clock, ChevronRight, PlayCircle } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type CircleSummary = {
  id: string;
  name: string;
  matchPattern: string;
  matchEmotion: string;
  maxMembers: number;
  isActive: boolean;
  startsAt: string;
  cycleEndsAt: string | null;
  createdAt: string;
  memberCount: number;
  driftedCount: number;
  recentPulseCount: number;
  participationPct: number | null;
  lastPulseAt: string | null;
  openPulses: number;
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function AdminCirclesPage() {
  const router = useRouter();
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"active" | "closed" | "all">("active");
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/community/circles?status=${statusFilter}`, { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      const data = (await res.json()) as { circles: CircleSummary[] };
      setCircles(data.circles);
    } catch {
      toast.error("Error al cargar círculos");
    } finally {
      setLoading(false);
    }
  }, [router, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  async function handleRunMatchmaking() {
    if (!confirm("¿Ejecutar matchmaking ahora? Cierra ciclos vencidos y forma nuevos círculos.")) return;
    setRunning(true);
    try {
      const res = await fetch("/api/admin/community/run-matchmaking", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "run_failed");
      toast.success(`Matchmaking OK: ${data.formed} círculos formados, ${data.closed} cerrados`);
      void load();
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      title="Círculos"
      subtitle="Salud de cada grupo, drift de patrón, participación en pulsos."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/admin/community/health"
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20"
        >
          <HeartPulse className="h-3.5 w-3.5" /> Salud comunidad
        </Link>
        <Link
          href="/admin/community/reflections"
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
        >
          Cola de reflexiones del mentor
        </Link>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
        >
          <option value="active">Activos</option>
          <option value="closed">Cerrados</option>
          <option value="all">Todos</option>
        </select>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refrescar
        </button>
        <button
          onClick={() => void handleRunMatchmaking()}
          disabled={running}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          <PlayCircle className="h-3.5 w-3.5" /> Ejecutar matchmaking
        </button>
      </div>

      {circles.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
          No hay círculos para este filtro.
        </div>
      ) : (
        <div className="space-y-2">
          {circles.map((c) => {
            const daysToCycle = daysUntil(c.cycleEndsAt);
            const cycleWarn = daysToCycle !== null && daysToCycle <= 7 && c.isActive;
            const driftRatio = c.memberCount > 0 ? c.driftedCount / c.memberCount : 0;
            const driftWarn = driftRatio >= 0.5;
            const lowParticipation = c.participationPct !== null && c.participationPct < 40 && c.recentPulseCount >= 2;

            return (
              <Link
                key={c.id}
                href={`/admin/community/circles/${c.id}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-900/80 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 font-mono">
                        {c.matchEmotion} · {c.matchPattern}
                      </span>
                      {!c.isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">Cerrado</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {c.memberCount}/{c.maxMembers}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Participación {c.participationPct ?? "—"}{c.participationPct !== null && "%"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Último pulso {formatDate(c.lastPulseAt)}
                      </span>
                      {daysToCycle !== null && (
                        <span className={cycleWarn ? "text-amber-400" : ""}>
                          Ciclo: {daysToCycle}d
                        </span>
                      )}
                      {driftWarn && (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <AlertTriangle className="h-3 w-3" /> {c.driftedCount} con drift
                        </span>
                      )}
                      {lowParticipation && (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> Participación baja
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
