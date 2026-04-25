"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, ArrowLeft, ChevronRight, Clock, Inbox, Mail, RefreshCw, Users,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type Health = {
  generatedAt: string;
  totals: {
    activeCircles: number;
    activeMembers: number;
    openPulses: number;
    pulsesLast30d: number;
    cyclesEndingNext7d: number;
    lettersGeneratedLast30d: number;
  };
  participation: {
    pct: number | null;
    medianResponseHours: number | null;
    totalResponses: number;
    possibleResponses: number;
  };
  drift: {
    pct: number | null;
    driftedMembers: number;
    membersWithState: number;
  };
  reflections: {
    pendingApproval: number;
    publishedLast30d: number;
  };
  perCircle: Array<{
    id: string;
    name: string;
    matchPattern: string;
    matchEmotion: string;
    memberCount: number;
    maxMembers: number;
    driftedCount: number;
    pulses30d: number;
    participationPct: number | null;
    daysToCycle: number | null;
  }>;
};

function Kpi({ label, value, hint, accent = "violet" }: { label: string; value: string | number; hint?: string; accent?: "violet" | "cyan" | "emerald" | "amber" | "rose" }) {
  const colors: Record<string, string> = {
    violet: "text-violet-400",
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className={`text-[10px] uppercase font-semibold tracking-wider ${colors[accent]}`}>{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {hint && <p className="text-[11px] text-zinc-500 mt-1 leading-tight">{hint}</p>}
    </div>
  );
}

export default function AdminCommunityHealthPage() {
  const router = useRouter();
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/community/health", { credentials: "include" });
      if (res.status === 401) { router.replace("/admin/login"); return; }
      if (!res.ok) throw new Error("load_failed");
      setData(await res.json());
    } catch {
      toast.error("Error al cargar salud");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      title="Salud de la comunidad"
      subtitle="Métricas agregadas de círculos, pulsos, drift y reflexiones."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/community/circles" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Círculos
        </Link>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refrescar
        </button>
        {data && (
          <p className="ml-auto text-[11px] text-zinc-500">
            Generado {new Date(data.generatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {!data ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">Cargando salud...</div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Círculos activos" value={data.totals.activeCircles} accent="violet" />
            <Kpi label="Miembros activos" value={data.totals.activeMembers} accent="cyan" />
            <Kpi label="Pulsos abiertos" value={data.totals.openPulses} accent="cyan" hint="Ahora mismo" />
            <Kpi label="Pulsos últimos 30d" value={data.totals.pulsesLast30d} accent="violet" />
            <Kpi label="Ciclos terminando" value={data.totals.cyclesEndingNext7d} accent="amber" hint="En los próximos 7 días" />
            <Kpi label="Cartas 30d" value={data.totals.lettersGeneratedLast30d} accent="emerald" hint="Cartas de cierre" />
          </div>

          {/* Participation + Drift + Reflections */}
          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <p className="text-sm font-semibold text-white">Participación global</p>
              </div>
              <p className="text-3xl font-bold text-white">
                {data.participation.pct === null ? "—" : `${data.participation.pct}%`}
              </p>
              <p className="text-xs text-zinc-500">
                {data.participation.totalResponses}/{data.participation.possibleResponses} respuestas posibles (30d)
              </p>
              <p className="text-xs text-zinc-400 mt-2">
                <Clock className="inline h-3 w-3 mr-1" />
                Mediana de tiempo de respuesta: {data.participation.medianResponseHours === null ? "—" : `${data.participation.medianResponseHours}h`}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-semibold text-white">Drift</p>
              </div>
              <p className="text-3xl font-bold text-white">
                {data.drift.pct === null ? "—" : `${data.drift.pct}%`}
              </p>
              <p className="text-xs text-zinc-500">
                {data.drift.driftedMembers}/{data.drift.membersWithState} miembros fuera de patrón
              </p>
              <p className="text-[11px] text-zinc-600 mt-2 leading-tight">
                Drift = el patrón actual del miembro ya no coincide con el match del círculo. Re-emparejar al cierre del ciclo.
              </p>
            </div>

            <Link
              href="/admin/community/reflections"
              className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-2 hover:bg-amber-500/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-semibold text-amber-300">Cola de reflexiones</p>
              </div>
              <p className="text-3xl font-bold text-amber-300">{data.reflections.pendingApproval}</p>
              <p className="text-xs text-zinc-500">Pendientes de aprobación</p>
              <p className="text-[11px] text-amber-300 mt-2 inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> {data.reflections.publishedLast30d} publicadas en 30d
              </p>
            </Link>
          </div>

          {/* Per-circle health table */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Salud por círculo</h2>
              <p className="text-[11px] text-zinc-500">Ordenado por participación más baja</p>
            </div>

            {data.perCircle.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">No hay círculos activos.</p>
            ) : (
              <div className="space-y-2">
                {data.perCircle.map((c) => {
                  const driftRatio = c.memberCount > 0 ? c.driftedCount / c.memberCount : 0;
                  const lowParticipation = c.participationPct !== null && c.participationPct < 40 && c.pulses30d >= 2;
                  const highDrift = driftRatio >= 0.5;
                  const cycleWarn = c.daysToCycle !== null && c.daysToCycle <= 7;

                  return (
                    <Link
                      key={c.id}
                      href={`/admin/community/circles/${c.id}`}
                      className="block rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 hover:bg-zinc-900 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 font-mono">
                              {c.matchEmotion} · {c.matchPattern}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-500 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" /> {c.memberCount}/{c.maxMembers}
                            </span>
                            <span className={lowParticipation ? "text-amber-400 font-semibold" : ""}>
                              Participación: {c.participationPct ?? "—"}{c.participationPct !== null && "%"} ({c.pulses30d} pulsos 30d)
                            </span>
                            {c.driftedCount > 0 && (
                              <span className={highDrift ? "text-red-400 font-semibold" : "text-zinc-400"}>
                                Drift: {c.driftedCount}/{c.memberCount}
                              </span>
                            )}
                            {c.daysToCycle !== null && (
                              <span className={cycleWarn ? "text-amber-400" : ""}>
                                Ciclo: {c.daysToCycle}d
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
          </section>
        </>
      )}
    </AdminShell>
  );
}
