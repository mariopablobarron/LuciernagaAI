"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Activity,
  Brain,
  CheckCircle2,
  HeartPulse,
  LineChart,
  MessageSquare,
  RefreshCw,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type Kpi = { value: number; delta: number };

type AnalyticsData = {
  kpis: {
    totalUsers: number;
    signups7d: Kpi;
    messages7d: Kpi;
    checkins7d: Kpi;
    conversations7d: Kpi;
  };
  dailyTrends: { date: string; signups: number; messages: number; checkins: number }[];
  stateDistribution: Record<string, number>;
  subscriptions: { plan: string; status: string; count: number }[];
  goals: { active: number; completed: number; abandoned: number; actionCompletionRate: number };
  funnel: { registered: number; firstConversation: number; firstGoal: number; firstActionCompleted: number };
  meta?: { excludeInternal: boolean; internalUserCount: number };
};

function DeltaBadge({ delta }: { delta: number }) {
  const positive = delta >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = positive ? "text-emerald-400" : "text-red-400";
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {delta}%
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  delta?: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-5 w-5 ${color}`} />
        {delta !== undefined && <DeltaBadge delta={delta} />}
      </div>
      <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}

function SparklineChart({
  data,
  accent,
  label,
  metric,
}: {
  data: { date: string; value: number }[];
  accent: "violet" | "cyan" | "emerald";
  label: string;
  metric: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  const fill: Record<string, string> = {
    violet: "bg-violet-500/60",
    cyan: "bg-cyan-500/60",
    emerald: "bg-emerald-500/60",
  };
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase text-zinc-400">{label}</p>
        <p className="text-xs text-zinc-500">
          <span className="font-bold text-white">{total.toLocaleString()}</span> {metric} · 30d
        </p>
      </div>
      <div className="flex items-end gap-0.5 h-16">
        {data.map((d) => {
          const h = max === 0 ? 0 : (d.value / max) * 100;
          const dt = new Date(d.date);
          return (
            <div
              key={d.date}
              title={`${dt.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} — ${d.value}`}
              className="flex-1 flex flex-col justify-end"
            >
              <div
                className={`${fill[accent]} rounded-t hover:brightness-150 transition-all`}
                style={{ height: `${Math.max(h, d.value > 0 ? 3 : 0)}%`, minHeight: d.value > 0 ? 2 : 0 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeTeam, setIncludeTeam] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = includeTeam ? "?includeTeam=1" : "";
      const res = await fetch(`/api/admin/analytics${qs}`, { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setData(await res.json());
    } catch {
      toast.error("Error al cargar analytics");
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

  const funnelSteps = data
    ? [
        { label: "Registrados", value: data.funnel.registered },
        { label: "Primera conversación", value: data.funnel.firstConversation },
        { label: "Primera meta", value: data.funnel.firstGoal },
        { label: "Primera acción completada", value: data.funnel.firstActionCompleted },
      ]
    : [];

  return (
    <AdminShell
      title="Analytics de producto"
      subtitle="KPIs, tendencias, embudo y estado emocional. Datos reales — no más pantalla fake."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/analytics/health"
            className="inline-flex items-center gap-2 rounded-lg border border-violet-700/60 bg-violet-600/20 hover:bg-violet-600/30 px-3 py-2 text-xs font-semibold text-violet-200 hover:text-white transition-colors"
          >
            <HeartPulse className="h-3.5 w-3.5" /> Health (North Star)
          </Link>
          <Link
            href="/admin/analytics/retencion"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <LineChart className="h-3.5 w-3.5" /> Retención por cohorte
          </Link>
          <Link
            href="/admin/analytics/activacion"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <Zap className="h-3.5 w-3.5" /> Activación (aha moment)
          </Link>
          <Link
            href="/admin/analytics/eventos"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <Search className="h-3.5 w-3.5" /> Explorar eventos
          </Link>
          <Link
            href="/admin/analytics/external"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-700/60 bg-cyan-600/20 hover:bg-cyan-600/30 px-3 py-2 text-xs font-semibold text-cyan-200 hover:text-white transition-colors"
          >
            <LineChart className="h-3.5 w-3.5" /> Web & Redes (GA4 · GSC · Metricool)
          </Link>
          <Link
            href="/admin/analytics/animo"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <Brain className="h-3.5 w-3.5" /> Ánimo e impulso
          </Link>
          <Link
            href="/admin/analytics/clinical"
            className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 hover:text-white transition-colors"
          >
            <Activity className="h-3.5 w-3.5" /> Métricas clínicas
          </Link>
        </div>
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

      {data?.meta && (
        <p className="text-[11px] text-zinc-600">
          {data.meta.excludeInternal ? (
            <>Excluyendo <span className="font-semibold text-zinc-400">{data.meta.internalUserCount}</span> cuentas internas (equipo/test).</>
          ) : (
            <>Incluyendo cuentas internas (equipo/test).</>
          )}
        </p>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 text-zinc-600 animate-spin" />
        </div>
      ) : !data ? null : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard icon={Users} label="Total usuarios" value={data.kpis.totalUsers} color="text-cyan-400" />
            <KpiCard
              icon={Zap}
              label="Signups 7d"
              value={data.kpis.signups7d.value}
              delta={data.kpis.signups7d.delta}
              color="text-violet-400"
            />
            <KpiCard
              icon={MessageSquare}
              label="Mensajes 7d"
              value={data.kpis.messages7d.value}
              delta={data.kpis.messages7d.delta}
              color="text-fuchsia-400"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Check-ins 7d"
              value={data.kpis.checkins7d.value}
              delta={data.kpis.checkins7d.delta}
              color="text-emerald-400"
            />
            <KpiCard
              icon={Activity}
              label="Conversaciones 7d"
              value={data.kpis.conversations7d.value}
              delta={data.kpis.conversations7d.delta}
              color="text-amber-400"
            />
          </div>

          {/* Trends */}
          <div className="grid md:grid-cols-3 gap-3">
            <SparklineChart
              data={data.dailyTrends.map((d) => ({ date: d.date, value: d.signups }))}
              accent="violet"
              label="Signups"
              metric="registros"
            />
            <SparklineChart
              data={data.dailyTrends.map((d) => ({ date: d.date, value: d.messages }))}
              accent="cyan"
              label="Mensajes"
              metric="mensajes"
            />
            <SparklineChart
              data={data.dailyTrends.map((d) => ({ date: d.date, value: d.checkins }))}
              accent="emerald"
              label="Check-ins"
              metric="check-ins"
            />
          </div>

          {/* Funnel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Embudo global</h2>
            </div>
            <div className="space-y-2">
              {funnelSteps.map((step, i) => {
                const base = funnelSteps[0].value;
                const pct = base > 0 ? (step.value / base) * 100 : 0;
                const prev = i > 0 ? funnelSteps[i - 1].value : step.value;
                const conv = prev > 0 ? (step.value / prev) * 100 : 0;
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300">{step.label}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-white font-bold">{step.value.toLocaleString()}</span>
                        <span className="text-zinc-500">{pct.toFixed(1)}%</span>
                        {i > 0 && <span className="text-cyan-400">→ {conv.toFixed(1)}%</span>}
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* State + Goals */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-4 w-4 text-fuchsia-400" />
                <h2 className="text-sm font-semibold text-white">Distribución de estado emocional</h2>
              </div>
              {Object.keys(data.stateDistribution).length === 0 ? (
                <p className="text-xs text-zinc-500">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(data.stateDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([state, count]) => {
                      const total = Object.values(data.stateDistribution).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={state}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-zinc-300">{state}</span>
                            <span className="text-zinc-500">
                              {count} · {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-fuchsia-500/60" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Metas</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-1">Activas</p>
                  <p className="text-xl font-bold text-cyan-300">{data.goals.active.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-1">Completadas</p>
                  <p className="text-xl font-bold text-emerald-300">{data.goals.completed.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-1">Abandonadas</p>
                  <p className="text-xl font-bold text-red-300">{data.goals.abandoned.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-1">% acciones completadas</p>
                  <p className="text-xl font-bold text-violet-300">{data.goals.actionCompletionRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
