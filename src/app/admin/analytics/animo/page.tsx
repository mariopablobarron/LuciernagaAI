"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, TrendingDown, Users, Activity, AlertTriangle } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type DailyTrend = {
  date: string;
  total: number;
  avgMomentum: number | null;
  states: Record<string, number>;
  moods: Record<string, number>;
  challengeDone: number;
  challengeFailed: number;
};

type DropAlert = {
  userId: string;
  email: string;
  name: string | null;
  before: number;
  after: number;
  drop: number;
  lastDate: string;
};

type Data = {
  days: number;
  totals: { logs: number; uniqueUsers: number; challengeCompletionRate: number };
  dailyTrends: DailyTrend[];
  globalStates: Record<string, number>;
  globalMoods: Record<string, number>;
  dropAlerts: DropAlert[];
};

const STATE_COLORS: Record<string, string> = {
  activo: "bg-emerald-500",
  bloqueado: "bg-red-500",
  ansioso: "bg-amber-500",
  desmotivado: "bg-purple-500",
  perdido: "bg-blue-400",
  neutral: "bg-zinc-500",
  unknown: "bg-zinc-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function AdminAnimoPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/daily-impulse?days=${days}`, { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin/analytics/animo");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setData(await res.json());
    } catch {
      toast.error("Error al cargar el dashboard de ánimo");
    } finally {
      setLoading(false);
    }
  }, [router, days]);

  useEffect(() => { void load(); }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  const maxMomentum = data ? Math.max(1, ...data.dailyTrends.map((d) => d.avgMomentum ?? 0)) : 1;
  const stateTotal = data ? Object.values(data.globalStates).reduce((a, b) => a + b, 0) : 0;
  const moodTotal = data ? Object.values(data.globalMoods).reduce((a, b) => a + b, 0) : 0;

  return (
    <AdminShell
      title="Ánimo e impulso (DailyLog)"
      subtitle="Distribución emocional, momentum y red flags por usuario."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Analytics
        </Link>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 focus:border-violet-500 focus:outline-none"
          >
            <option value={7}>7 días</option>
            <option value={14}>14 días</option>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
            <option value={90}>90 días</option>
          </select>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refrescar
          </button>
        </div>
      </div>

      {!data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 text-zinc-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <Activity className="h-5 w-5 text-violet-400" />
              <p className="mt-2 text-xs text-zinc-400 uppercase font-semibold">Logs en ventana</p>
              <p className="text-2xl font-bold text-white">{data.totals.logs.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <Users className="h-5 w-5 text-cyan-400" />
              <p className="mt-2 text-xs text-zinc-400 uppercase font-semibold">Usuarios únicos</p>
              <p className="text-2xl font-bold text-white">{data.totals.uniqueUsers.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <AlertTriangle className="h-5 w-5 text-emerald-400" />
              <p className="mt-2 text-xs text-zinc-400 uppercase font-semibold">% Reto del día completado</p>
              <p className="text-2xl font-bold text-white">{data.totals.challengeCompletionRate}%</p>
            </div>
          </div>

          {/* Momentum trend */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Impulso medio por día</h2>
            {data.dailyTrends.length === 0 ? (
              <p className="text-xs text-zinc-500">Sin datos en la ventana.</p>
            ) : (
              <div className="flex items-end gap-1 h-24">
                {data.dailyTrends.map((d) => {
                  const h = d.avgMomentum === null ? 0 : (d.avgMomentum / maxMomentum) * 100;
                  return (
                    <div
                      key={d.date}
                      title={`${formatDate(d.date)} · momentum ${d.avgMomentum ?? "—"} · ${d.total} logs`}
                      className="flex-1 flex flex-col justify-end"
                    >
                      <div
                        className="bg-violet-500/60 rounded-t hover:brightness-150"
                        style={{ height: `${Math.max(h, d.avgMomentum && d.avgMomentum > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Distributions */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Estado emocional (distribución)</h2>
              {Object.keys(data.globalStates).length === 0 ? (
                <p className="text-xs text-zinc-500">Sin datos.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(data.globalStates).sort((a, b) => b[1] - a[1]).map(([state, count]) => {
                    const pct = stateTotal > 0 ? (count / stateTotal) * 100 : 0;
                    const color = STATE_COLORS[state] ?? STATE_COLORS.unknown;
                    return (
                      <div key={state}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-2 text-zinc-300">
                            <span className={`inline-block h-3 w-3 rounded ${color}`} />
                            {state}
                          </span>
                          <span className="text-zinc-500">{count} · {pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Ánimo declarado (mood)</h2>
              {Object.keys(data.globalMoods).length === 0 ? (
                <p className="text-xs text-zinc-500">Sin datos de mood.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(data.globalMoods).sort((a, b) => b[1] - a[1]).map(([mood, count]) => {
                    const pct = moodTotal > 0 ? (count / moodTotal) * 100 : 0;
                    return (
                      <div key={mood}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-zinc-300">{mood}</span>
                          <span className="text-zinc-500">{count} · {pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full bg-cyan-500/60" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Drop alerts */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-semibold text-white">Caída de impulso (top 10 — early warning)</h2>
            </div>
            {data.dropAlerts.length === 0 ? (
              <p className="text-xs text-zinc-500">Ningún usuario con caída sostenida en este periodo.</p>
            ) : (
              <div className="space-y-2">
                {data.dropAlerts.map((u) => (
                  <div key={u.userId} className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
                    <Link href={`/admin/users/${u.userId}`} className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-red-300 hover:text-red-200 truncate">{u.name || u.email.split("@")[0]}</p>
                      <p className="text-xs text-zinc-500 truncate">{u.email} · último log {formatDate(u.lastDate)}</p>
                    </Link>
                    <div className="text-right text-xs shrink-0">
                      <p className="text-zinc-300">{u.before} → <span className="text-red-300 font-bold">{u.after}</span></p>
                      <p className="text-red-400">Δ {u.drop}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
