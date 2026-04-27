"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Database, Flame, MessageSquare, RefreshCw, Target, Zap } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type Cohort = {
  week: string;
  totalUsers: number;
  eligible: number;
  activated: number;
  activatedWithin72h: number;
  rate: number | null;
  messagesReachedOnly: number;
  actionCompletedOnly: number;
};

type ActivationData = {
  definition: {
    window_hours: number;
    eligibility_wait_hours?: number;
    rule_window_hours?: number | null;
    messages_required: number;
    needs_action_completed: boolean;
    description: string;
  };
  cohorts: Cohort[];
  overall: {
    eligible: number;
    activated: number;
    activatedWithin72h: number;
    rate: number | null;
  };
  totalUsers: number;
};

function fmtRate(r: number | null): string {
  if (r === null) return "—";
  return `${(r * 100).toFixed(0)}%`;
}

function fmtWeek(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function ActivacionPage() {
  const router = useRouter();
  const [data, setData] = useState<ActivationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [includeTeam, setIncludeTeam] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = includeTeam ? "?includeTeam=1" : "";
      const res = await fetch(`/api/admin/analytics/activation${qs}`, { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setData(await res.json());
    } catch {
      toast.error("Error al cargar activación");
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

  async function handleBackfill() {
    if (backfilling) return;
    const confirmed = window.confirm(
      "Rellenar retroactivamente firstMessageSentAt, activatedAt y onboardingCompletedAt para usuarios históricos. Es idempotente (seguro de repetir). ¿Continuar?",
    );
    if (!confirmed) return;
    setBackfilling(true);
    try {
      const res = await fetch("/api/admin/backfill-activation?limit=5000", {
        credentials: "include",
        method: "POST",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (res.status === 403) {
        toast.error("Sin permiso (requiere rol admin/ops)");
        return;
      }
      if (!res.ok) throw new Error("backfill_failed");
      const json = (await res.json()) as {
        ok: boolean;
        stats: { firstMessage: number; activated: number; onboarding: number; scanned: number };
      };
      const { firstMessage, activated, onboarding, scanned } = json.stats;
      if (scanned === 0) {
        toast.success("Nada que rellenar — todos los campos ya estaban poblados");
      } else {
        toast.success(
          `Backfill OK · firstMessage: ${firstMessage} · activated: ${activated} · onboarding: ${onboarding}`,
        );
      }
      await load();
    } catch {
      toast.error("Error al ejecutar backfill");
    } finally {
      setBackfilling(false);
    }
  }

  const overallRate = data?.overall.rate ?? null;

  return (
    <AdminShell
      title="Activación (aha moment)"
      subtitle={data?.definition.description ?? "Cargando definición…"}
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
            onClick={() => void handleBackfill()}
            disabled={backfilling}
            title="Rellena los campos de activación para usuarios históricos. Idempotente."
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-200 disabled:opacity-50"
          >
            <Database className={`h-3.5 w-3.5 ${backfilling ? "animate-pulse" : ""}`} />
            {backfilling ? "Ejecutando…" : "Backfill retroactivo"}
          </button>
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
      ) : !data ? null : (
        <>
          {/* Overall */}
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Tasa de activación global</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] uppercase font-semibold text-zinc-500 mb-1">Elegibles</p>
                <p className="text-2xl font-bold text-white">{data.overall.eligible.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500 mt-1">&gt;{data.definition.window_hours}h desde signup</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-zinc-500 mb-1">Activados</p>
                <p className="text-2xl font-bold text-emerald-300">{data.overall.activated.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {data.overall.activatedWithin72h.toLocaleString()} en las primeras {data.definition.window_hours}h
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-zinc-500 mb-1">Tasa</p>
                <p
                  className={`text-3xl font-bold ${
                    overallRate !== null && overallRate >= 0.3
                      ? "text-emerald-300"
                      : overallRate !== null && overallRate >= 0.15
                        ? "text-amber-300"
                        : "text-red-300"
                  }`}
                >
                  {fmtRate(overallRate)}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">activados / elegibles</p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Desglose: qué falta por cohorte</h2>
            <p className="text-xs text-zinc-500 mb-4">
              &quot;Solo mensajes&quot; = llegaron a {data.definition.messages_required} msg pero no completaron ninguna
              acción. &quot;Solo acción&quot; = completaron acción sin llegar a los mensajes.
            </p>
            {data.cohorts.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin cohortes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500 text-xs uppercase">
                      <th className="px-3 py-2 font-semibold">Semana</th>
                      <th className="px-3 py-2 font-semibold text-right">N</th>
                      <th className="px-3 py-2 font-semibold text-right">Elegibles</th>
                      <th className="px-3 py-2 font-semibold text-center">
                        <Flame className="inline h-3.5 w-3.5 text-emerald-400" /> Activados
                      </th>
                      <th className="px-3 py-2 font-semibold text-center" title={`Activados en las primeras ${data.definition.window_hours}h`}>
                        ≤{data.definition.window_hours}h
                      </th>
                      <th className="px-3 py-2 font-semibold text-center">
                        <MessageSquare className="inline h-3.5 w-3.5 text-amber-400" /> Solo msg
                      </th>
                      <th className="px-3 py-2 font-semibold text-center">
                        <Target className="inline h-3.5 w-3.5 text-cyan-400" /> Solo acción
                      </th>
                      <th className="px-3 py-2 font-semibold text-right">Tasa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {data.cohorts.map((c) => (
                      <tr key={c.week} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-3 py-2 font-mono text-xs text-zinc-300">{fmtWeek(c.week)}</td>
                        <td className="px-3 py-2 text-right text-zinc-400">{c.totalUsers}</td>
                        <td className="px-3 py-2 text-right text-zinc-400">{c.eligible}</td>
                        <td className="px-3 py-2 text-center text-emerald-300 font-semibold">
                          {c.activated}
                        </td>
                        <td className="px-3 py-2 text-center text-emerald-400/70">
                          {c.activatedWithin72h}
                        </td>
                        <td className="px-3 py-2 text-center text-amber-400/70">
                          {c.messagesReachedOnly}
                        </td>
                        <td className="px-3 py-2 text-center text-cyan-400/70">
                          {c.actionCompletedOnly}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={`font-bold ${
                              c.rate !== null && c.rate >= 0.3
                                ? "text-emerald-300"
                                : c.rate !== null && c.rate >= 0.15
                                  ? "text-amber-300"
                                  : "text-zinc-300"
                            }`}
                          >
                            {fmtRate(c.rate)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Diagnostic */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Diagnóstico</h2>
            <div className="space-y-2 text-xs text-zinc-400">
              <p>
                <strong className="text-amber-300">Si &quot;Solo mensajes&quot; es alto</strong> → los usuarios conversan
                pero no completan acciones. Problema de diseño del paso goal/action, no de onboarding.
              </p>
              <p>
                <strong className="text-cyan-300">Si &quot;Solo acción&quot; es alto</strong> → completan acción con pocos
                mensajes. Quizá la definición de 3 mensajes no es el umbral correcto — revisa si 1 o 2 mensajes
                ya producen valor.
              </p>
              <p>
                <strong className="text-red-300">Si ambos son bajos vs activados</strong> → la mayoría de usuarios
                abandona sin llegar a ninguno. Problema de onboarding — primer mensaje o primera meta.
              </p>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
