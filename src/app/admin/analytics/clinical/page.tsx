"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Inbox,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type ClinicalMetrics = {
  generatedAt: string;
  windowDays: number;
  crisis: {
    eventsTotal: number;
    contained: number;
    containmentPct: number | null;
    byLevel: Record<string, number>;
    note: string;
  };
  avoidance: {
    actionsAvoided: number;
    actionsRecovered: number;
    recoveryPct: number | null;
    note: string;
  };
  actions: {
    total: number;
    completed: number;
    completionPct: number | null;
  };
  reflections: {
    total: number;
    approved: number;
    approvalPct: number | null;
    note: string;
  };
  patternBreakdown: Array<{
    pattern: string;
    actionsTotal: number;
    actionsCompleted: number;
    completionPct: number | null;
  }>;
  goals: {
    created: number;
    completed: number;
    abandoned: number;
  };
};

function pctColor(pct: number | null, goodAbove: number, warnAbove: number): string {
  if (pct === null) return "text-zinc-500";
  if (pct >= goodAbove) return "text-emerald-400";
  if (pct >= warnAbove) return "text-amber-400";
  return "text-rose-400";
}

function Kpi({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
      <div className={`inline-flex items-center gap-2 ${accent}`}>{icon}</div>
      <p className="text-[11px] uppercase font-semibold text-zinc-400 tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {hint && <p className="text-xs text-zinc-500 leading-tight">{hint}</p>}
    </div>
  );
}

export default function AdminClinicalMetricsPage() {
  const router = useRouter();
  const [data, setData] = useState<ClinicalMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/clinical?days=${days}`, { credentials: "include" });
      if (res.status === 401) { router.replace("/admin/login?next=/admin/analytics/clinical"); return; }
      if (!res.ok) throw new Error("load_failed");
      setData(await res.json());
    } catch {
      toast.error("Error al cargar métricas clínicas");
    } finally {
      setLoading(false);
    }
  }, [router, days]);

  useEffect(() => { void load(); }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      title="Métricas clínicas"
      subtitle="Indicadores de si el producto está cumpliendo su función pedagógica/clínica."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Analytics
        </Link>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
        >
          <option value={7}>7 días</option>
          <option value={14}>14 días</option>
          <option value={30}>30 días</option>
          <option value={60}>60 días</option>
          <option value={90}>90 días</option>
        </select>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refrescar
        </button>
        {data && (
          <p className="ml-auto text-xs text-zinc-500">
            Generado {new Date(data.generatedAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
          </p>
        )}
      </div>

      {!data ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-base text-zinc-500">Cargando…</div>
      ) : (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              icon={<ShieldAlert className="h-5 w-5" />}
              label="Crisis contenidas"
              value={data.crisis.containmentPct === null ? "—" : `${data.crisis.containmentPct}%`}
              hint={`${data.crisis.contained}/${data.crisis.eventsTotal} eventos sin re-escalada en 7d`}
              accent={pctColor(data.crisis.containmentPct, 80, 60)}
            />
            <Kpi
              icon={<TrendingUp className="h-5 w-5" />}
              label="Recuperación de evasión"
              value={data.avoidance.recoveryPct === null ? "—" : `${data.avoidance.recoveryPct}%`}
              hint={`${data.avoidance.actionsRecovered}/${data.avoidance.actionsAvoided} acciones evitadas → completadas`}
              accent={pctColor(data.avoidance.recoveryPct, 50, 30)}
            />
            <Kpi
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Tasa de completion"
              value={data.actions.completionPct === null ? "—" : `${data.actions.completionPct}%`}
              hint={`${data.actions.completed}/${data.actions.total} acciones completadas`}
              accent={pctColor(data.actions.completionPct, 50, 30)}
            />
            <Kpi
              icon={<Inbox className="h-5 w-5" />}
              label="Reflexiones aprobadas"
              value={data.reflections.approvalPct === null ? "—" : `${data.reflections.approvalPct}%`}
              hint={`${data.reflections.approved}/${data.reflections.total} pasaron el humano-en-el-loop`}
              accent={pctColor(data.reflections.approvalPct, 80, 60)}
            />
          </div>

          {/* Notas explicativas */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-white inline-flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" /> Lectura: contención de crisis
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">{data.crisis.note}</p>
              {Object.keys(data.crisis.byLevel).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(data.crisis.byLevel).map(([level, count]) => (
                    <span key={level} className="text-[11px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-300">
                      {level}: <span className="font-bold text-white">{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-white inline-flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Lectura: recuperación de evasión
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">{data.avoidance.note}</p>
            </div>
          </div>

          {/* Pattern breakdown */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Completion por patrón emocional</h2>
            </div>
            <p className="text-xs text-zinc-500">
              ¿A qué perfiles de usuaria sirve mejor el mentor? Si un patrón muestra completion sistemáticamente baja, hay
              que revisar cómo el sistema confronta o acompaña a esa población.
            </p>
            {data.patternBreakdown.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin acciones suficientes en la ventana.</p>
            ) : (
              <div className="space-y-2">
                {data.patternBreakdown.map((row) => (
                  <div key={row.pattern} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono text-zinc-200">{row.pattern}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {row.actionsCompleted}/{row.actionsTotal} acciones completadas
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                            style={{ width: `${row.completionPct ?? 0}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold w-12 text-right ${pctColor(row.completionPct, 50, 30)}`}>
                          {row.completionPct === null ? "—" : `${row.completionPct}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Goals lifecycle */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Ciclo de vida de objetivos</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">Creados</p>
                <p className="text-2xl font-bold text-white mt-1">{data.goals.created}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">Completados</p>
                <p className="text-2xl font-bold text-white mt-1">{data.goals.completed}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-[10px] uppercase font-semibold text-rose-400 tracking-wider inline-flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Abandonados
                </p>
                <p className="text-2xl font-bold text-white mt-1">{data.goals.abandoned}</p>
              </div>
            </div>
          </section>

          {/* Caveat clínico */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200 leading-relaxed">
            <p className="font-semibold inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Lectura responsable
            </p>
            <p className="mt-1.5">
              Estas son métricas de proxy, no de eficacia clínica probada. Si el producto se posiciona ante usuarias en
              riesgo o ante profesionales de salud mental, conviene complementar con un estudio observacional supervisado
              por psicología clínica antes de comunicarlas externamente.
            </p>
          </div>
        </>
      )}
    </AdminShell>
  );
}
