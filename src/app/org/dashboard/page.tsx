"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, Users, Flame, MessageCircle, AlertTriangle,
  Target, TrendingUp, LogOut, ShieldCheck,
} from "lucide-react";

type Stats = {
  totalUsers: number;
  activeUsersLast7d: number;
  activeUsersLast30d: number;
  emotionalDistribution: Record<string, number>;
  stateDistribution: Record<string, number>;
  avgStreakDays: number;
  avgMessagesPerUser: number;
  crisisEventsLast30d: number;
  goalCompletionRate: number;
  retentionRate7d: number;
};

type DashboardData = {
  ok: boolean;
  organization: string;
  stats: Stats | null;
  privacyNotice?: string;
};

const STATE_COLORS: Record<string, string> = {
  neutral: "bg-zinc-500",
  bloqueo: "bg-red-500",
  ansiedad: "bg-amber-500",
  duda: "bg-violet-500",
  claridad: "bg-cyan-500",
};

export default function OrgDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orgId = sessionStorage.getItem("org_id");
    const token = sessionStorage.getItem("org_token");
    if (!orgId || !token) { router.push("/org/login"); return; }

    fetch(`/api/org/dashboard?orgId=${orgId}&token=${token}`)
      .then((r) => r.json())
      .then((d: DashboardData) => setData(d))
      .catch(() => router.push("/org/login"))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    sessionStorage.clear();
    router.push("/org/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          <div>
            <h1 className="text-lg font-bold">{data?.organization ?? "Dashboard"}</h1>
            <p className="text-xs text-zinc-500">Panel de bienestar organizacional</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-emerald-300 font-medium">Datos anonimizados</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {!stats ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">{data?.privacyNotice ?? "No hay datos disponibles"}</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Usuarios activos", value: stats.totalUsers, icon: Users, color: "text-violet-400" },
                { label: "Retención 7d", value: `${stats.retentionRate7d}%`, icon: TrendingUp, color: "text-cyan-400" },
                { label: "Media racha", value: `${stats.avgStreakDays}d`, icon: Flame, color: "text-amber-400" },
                { label: "Msgs/usuario", value: stats.avgMessagesPerUser, icon: MessageCircle, color: "text-fuchsia-400" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <kpi.icon className={`w-5 h-5 ${kpi.color} mb-3`} />
                  <p className="text-2xl font-bold text-white">{kpi.value}</p>
                  <p className="text-xs text-zinc-500 mt-1">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* State & Emotion Distribution */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* State distribution */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Distribución de estados</h3>
                <div className="space-y-3">
                  {Object.entries(stats.stateDistribution).map(([state, count]) => {
                    const pct = Math.round((count / stats.totalUsers) * 100);
                    return (
                      <div key={state} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-300 capitalize">{state}</span>
                          <span className="text-zinc-500">{pct}% ({count})</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${STATE_COLORS[state] ?? "bg-zinc-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Emotional distribution */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Emociones predominantes</h3>
                <div className="space-y-3">
                  {Object.entries(stats.emotionalDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([emotion, count]) => {
                      const pct = Math.round((count / stats.totalUsers) * 100);
                      return (
                        <div key={emotion} className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-zinc-300 capitalize">{emotion}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-zinc-500 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Goals & Alerts */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
                <Target className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{stats.goalCompletionRate}%</p>
                <p className="text-xs text-zinc-500 mt-1">Metas completadas</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
                <Users className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{stats.activeUsersLast30d}</p>
                <p className="text-xs text-zinc-500 mt-1">Activos (30 días)</p>
              </div>
              <div className={`rounded-xl border p-6 text-center ${
                stats.crisisEventsLast30d > 0
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}>
                <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${stats.crisisEventsLast30d > 0 ? "text-red-400" : "text-zinc-700"}`} />
                <p className="text-3xl font-bold text-white">{stats.crisisEventsLast30d}</p>
                <p className="text-xs text-zinc-500 mt-1">Eventos de crisis (30d)</p>
              </div>
            </div>

            <p className="text-center text-[11px] text-zinc-600">
              Todos los datos son anónimos y agregados. Ningún dato individual es visible.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
