"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AdminShell } from "@/features/admin/components/AdminShell";
import type { AdminInsightsResponse } from "@/features/admin/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SAAS_CONFIG } from "@/lib/saas";

type AdminInsightsPartial = Partial<AdminInsightsResponse> | null;

type RetentionMilestone = 1 | 3 | 7 | 14 | 30;
type CohortRow = {
  week: string;
  totalUsers: number;
  retention: Record<RetentionMilestone, { count: number; rate: number | null }>;
};
type RetentionData = {
  cohorts: CohortRow[];
  overall: Record<RetentionMilestone, number | null>;
  totalUsers: number;
  milestones: RetentionMilestone[];
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function normalizeAdminInsights(payload: AdminInsightsPartial): AdminInsightsResponse {
  return {
    metrics: {
      retentionDay3: payload?.metrics?.retentionDay3 ?? 0,
      retentionDay7: payload?.metrics?.retentionDay7 ?? 0,
      dropOffPoint: payload?.metrics?.dropOffPoint ?? "day_1",
      checkinDrop: payload?.metrics?.checkinDrop ?? 0,
      dominantState: payload?.metrics?.dominantState ?? "neutral",
      confidence: payload?.metrics?.confidence,
      sampleSize: payload?.metrics?.sampleSize ?? 0,
    },
    activity: {
      usersCreatedLast7d: payload?.activity?.usersCreatedLast7d ?? 0,
      activeUsersLast7d: payload?.activity?.activeUsersLast7d ?? 0,
      messagesLast7d: payload?.activity?.messagesLast7d ?? 0,
      checkinsLast7d: payload?.activity?.checkinsLast7d ?? 0,
    },
    segments: {
      totalUsers: payload?.segments?.totalUsers ?? 0,
      newUsers: payload?.segments?.newUsers ?? 0,
      returningUsers: payload?.segments?.returningUsers ?? 0,
      activeNewUsers: payload?.segments?.activeNewUsers ?? 0,
      activeReturningUsers: payload?.segments?.activeReturningUsers ?? 0,
      inactiveUsers: payload?.segments?.inactiveUsers ?? 0,
    },
    decision: {
      decision: payload?.decision?.decision ?? "Sin decisión disponible",
      reason: payload?.decision?.reason ?? "No hay información suficiente para mostrar decisión.",
      priority: payload?.decision?.priority ?? "medium",
      action: payload?.decision?.action ?? "Revisar estado del servicio de insights.",
    },
    alerts: payload?.alerts ?? [],
    insights: payload?.insights ?? [],
    crisis: {
      last24h: {
        total: payload?.crisis?.last24h?.total ?? 0,
        high: payload?.crisis?.last24h?.high ?? 0,
        critical: payload?.crisis?.last24h?.critical ?? 0,
      },
      latestEvents: payload?.crisis?.latestEvents ?? [],
    },
    avoidance: {
      last7d: {
        total: payload?.avoidance?.last7d?.total ?? 0,
        postpone: payload?.avoidance?.last7d?.postpone ?? 0,
        refuse: payload?.avoidance?.last7d?.refuse ?? 0,
        uniqueUsers: payload?.avoidance?.last7d?.uniqueUsers ?? 0,
      },
      topActions: payload?.avoidance?.topActions ?? [],
    },
    decisionHistory: payload?.decisionHistory ?? [],
    insightHistory: payload?.insightHistory ?? [],
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminInsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState<string | null>(null);
  const [retention, setRetention] = useState<RetentionData | null>(null);

  useEffect(() => {
    fetch("/api/admin/retention")
      .then((r) => r.json())
      .then((d: RetentionData) => setRetention(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/insights")
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as AdminInsightsPartial;

        if (res.status === 401) {
          router.replace("/admin/login?next=/admin");
          return null;
        }

        if (!payload || typeof payload !== "object") {
          if (!res.ok) {
            throw new Error("No se pudieron cargar los insights.");
          }
          throw new Error("La respuesta del panel admin no tiene formato válido.");
        }

        const normalized = normalizeAdminInsights(payload);
        const missingSections = [
          "metrics",
          "decision",
          "alerts",
          "insights",
          "segments",
          "activity",
          "crisis",
          "avoidance",
        ].filter((section) => !(section in payload));

        if (!res.ok || missingSections.length > 0) {
          setDegraded(
            missingSections.length > 0
              ? `El panel está en modo degradado. Faltan secciones en la respuesta: ${missingSections.join(", ")}.`
              : "El panel está en modo degradado. Revisa la base de datos o las migraciones."
          );
        }

        return normalized;
      })
      .then((payload) => {
        if (payload) {
          setData(payload);
        }
      })
      .catch((fetchError: unknown) => {
        const message =
          fetchError instanceof Error ? fetchError.message : "Error cargando datos del admin.";
        setError(message);
      });
  }, [router]);

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6">
        <Card className="mx-auto max-w-2xl border-red-500/30 bg-red-500/10">
          <CardContent className="p-6 text-white">{error}</CardContent>
        </Card>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6">
        <Card className="mx-auto max-w-2xl border-zinc-800/80 bg-zinc-900/95">
          <CardContent className="p-6 text-zinc-500">Cargando dashboard...</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <AdminShell
      title="Decision Engine Dashboard"
      subtitle="Patrones inspirados en Open SaaS: shell reutilizable, KPI modulares y separacion clara entre analytics, operaciones y admin. Tu producto mantiene intacto el nucleo de chat, goals, crisis y seguimiento."
      onLogout={handleLogout}
    >
      {degraded ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-white">
          {degraded}
        </div>
      ) : null}

      <AdminPanel
        id="overview"
        title="Resumen ejecutivo"
        description="Vista rapida de salud del producto, retencion y confianza de muestra."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AdminMetricCard
            label="Retencion D3"
            value={formatPercent(data.metrics.retentionDay3)}
            accent="emerald"
          />
          <AdminMetricCard
            label="Retencion D7"
            value={formatPercent(data.metrics.retentionDay7)}
            accent="sky"
          />
          <AdminMetricCard
            label="Check-in drop"
            value={formatPercent(data.metrics.checkinDrop)}
            accent="amber"
          />
          <AdminMetricCard
            label="Estado dominante"
            value={data.metrics.dominantState}
            accent="violet"
          />
          <AdminMetricCard
            label="Muestra"
            value={data.metrics.sampleSize ?? 0}
            hint={`Confianza ${data.metrics.confidence ?? "medium"}`}
          />
        </div>

        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Decision automatica
          </p>
          <p className="mt-2 text-xl font-semibold text-white">{data.decision.decision}</p>
          <p className="mt-2 text-sm text-zinc-500">{data.decision.reason}</p>
          <p className="mt-3 text-sm font-medium text-white">
            Accion sugerida: {data.decision.action}
          </p>
        </div>
      </AdminPanel>

      {/* Cohort Retention Table */}
      <AdminPanel
        id="retention"
        title="Retención por cohorte (real)"
        description="Para cada semana de alta: % de usuarios que volvieron al día 1, 3, 7, 14 y 30. Fuente: mensajes reales del usuario."
      >
        {!retention ? (
          <p className="text-sm text-zinc-500">Cargando retención...</p>
        ) : retention.cohorts.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin datos todavía. Esperando primeros usuarios.</p>
        ) : (
          <>
            {/* Overall row */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {([1, 3, 7, 14, 30] as RetentionMilestone[]).map((m) => {
                const rate = retention.overall[m];
                const pct = rate !== null ? Math.round(rate * 100) : null;
                const color =
                  pct === null ? "text-zinc-500" :
                  pct >= 50 ? "text-emerald-400" :
                  pct >= 25 ? "text-amber-400" : "text-rose-400";
                return (
                  <div key={m} className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">D{m}</p>
                    <p className={`mt-1 text-lg font-bold ${color}`}>
                      {pct !== null ? `${pct}%` : "—"}
                    </p>
                  </div>
                );
              })}
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Total</p>
                <p className="mt-1 text-lg font-bold text-white">{retention.totalUsers}</p>
              </div>
            </div>

            {/* Cohort table */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/30">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Semana</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Altas</th>
                    {([1, 3, 7, 14, 30] as RetentionMilestone[]).map((m) => (
                      <th key={m} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">D{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {retention.cohorts.map((cohort, i) => (
                    <tr key={cohort.week} className={`border-b border-zinc-800 ${i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-800/20"}`}>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-500">{cohort.week}</td>
                      <td className="px-3 py-2 text-center font-semibold text-white">{cohort.totalUsers}</td>
                      {([1, 3, 7, 14, 30] as RetentionMilestone[]).map((m) => {
                        const cell = cohort.retention[m];
                        const pct = cell.rate !== null ? Math.round(cell.rate * 100) : null;
                        const color =
                          pct === null ? "text-zinc-500" :
                          pct >= 50 ? "text-emerald-400" :
                          pct >= 25 ? "text-amber-400" : "text-rose-400";
                        const bg =
                          pct === null ? "" :
                          pct >= 50 ? "bg-emerald-500/8" :
                          pct >= 25 ? "bg-amber-500/8" : "bg-rose-500/8";
                        return (
                          <td key={m} className={`px-3 py-2 text-center ${bg}`}>
                            <span className={`font-semibold ${color}`}>
                              {pct !== null ? `${pct}%` : "—"}
                            </span>
                            {cell.count > 0 && (
                              <span className="ml-1 text-[10px] text-zinc-500">({cell.count})</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              — = aún no ha pasado suficiente tiempo para medir ese milestone en esta cohorte.
            </p>
          </>
        )}
      </AdminPanel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <AdminPanel
          id="segments"
          title="Segmentos y actividad"
          description="Adaptacion del patron de analytics SaaS de Open SaaS a tus metricas reales de uso."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <AdminMetricCard label="Total usuarios" value={data.segments.totalUsers} />
            <AdminMetricCard label="Usuarios nuevos" value={data.segments.newUsers} accent="sky" />
            <AdminMetricCard
              label="Usuarios de retorno"
              value={data.segments.returningUsers}
              accent="slate"
            />
            <AdminMetricCard
              label="Activos nuevos"
              value={data.segments.activeNewUsers}
              accent="emerald"
            />
            <AdminMetricCard
              label="Activos retorno"
              value={data.segments.activeReturningUsers}
              accent="emerald"
            />
            <AdminMetricCard label="Inactivos" value={data.segments.inactiveUsers} accent="rose" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <AdminMetricCard label="Altas 7d" value={data.activity.usersCreatedLast7d} />
            <AdminMetricCard
              label="Activos 7d"
              value={data.activity.activeUsersLast7d}
              accent="emerald"
            />
            <AdminMetricCard label="Mensajes 7d" value={data.activity.messagesLast7d} />
            <AdminMetricCard label="Check-ins 7d" value={data.activity.checkinsLast7d} />
          </div>
        </AdminPanel>

        <AdminPanel
          id="billing"
          title="Billing readiness"
          description="Extraccion de patron de Open SaaS: dejar billing desacoplado y listo, sin forzar Stripe antes de tiempo."
        >
          <div className="rounded-2xl border border-zinc-800 bg-zinc-800/40 p-4">
            <p className="text-sm font-semibold text-white">
              Proveedor previsto: {SAAS_CONFIG.billing.provider}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Estado actual: {SAAS_CONFIG.billing.enabled ? "activo" : "no integrado"}.
            </p>
          </div>

          <div className="space-y-3">
            {SAAS_CONFIG.billing.plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{plan.name}</p>
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                    {plan.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>
                <p className="mt-2 text-sm font-medium text-white">{plan.priceLabel}</p>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminPanel
          id="crisis"
          title="Crisis"
          description="Contencion, trazabilidad y eventos de riesgo alto o critico."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <AdminMetricCard label="Eventos 24h" value={data.crisis.last24h.total} />
            <AdminMetricCard label="High" value={data.crisis.last24h.high} accent="amber" />
            <AdminMetricCard label="Critical" value={data.crisis.last24h.critical} accent="rose" />
          </div>

          <div className="space-y-3">
            {data.crisis.latestEvents.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-800/40 p-4 text-sm text-zinc-500">
                Sin eventos high/critical en las ultimas 24h.
              </div>
            ) : (
              data.crisis.latestEvents.map((event, idx) => (
                <div
                  key={`${event.userId}-${event.createdAt}-${idx}`}
                  className={`rounded-2xl border-l-4 bg-zinc-900 p-4 shadow-sm ${
                    event.level === "critical"
                      ? "border-red-500 bg-red-500/10"
                      : "border-amber-500 bg-amber-500/10"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-zinc-800 px-2 py-1 font-mono text-white">
                      {event.userId}
                    </span>
                    <span
                      className={`rounded px-2 py-1 font-semibold uppercase ${
                        event.level === "critical"
                          ? "bg-red-500/15 text-white"
                          : "bg-amber-500/15 text-white"
                      }`}
                    >
                      {event.level}
                    </span>
                    <span className="text-zinc-500">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-white">{event.message}</p>
                </div>
              ))
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          id="alerts"
          title="Alerts"
          description="Señales accionables priorizadas por retencion, crisis y evitacion."
        >
          <div className="space-y-3">
            {data.alerts.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-800/40 p-4 text-sm text-zinc-500">
                Sin alertas criticas.
              </div>
            ) : (
              data.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border-l-4 border-red-500 bg-red-500/10 p-4 shadow-sm"
                >
                  <h3 className="font-semibold text-white">{alert.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel
        id="avoidance"
        title="Evasion y deuda de ejecucion"
        description="Seguimiento de acciones evitadas, pospuestas o rechazadas."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <AdminMetricCard label="Total eventos" value={data.avoidance.last7d.total} />
          <AdminMetricCard
            label="Postergaciones"
            value={data.avoidance.last7d.postpone}
            accent="amber"
          />
          <AdminMetricCard label="Rechazos" value={data.avoidance.last7d.refuse} accent="rose" />
          <AdminMetricCard label="Usuarios implicados" value={data.avoidance.last7d.uniqueUsers} />
        </div>

        <div className="space-y-3">
          {data.avoidance.topActions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-800/40 p-4 text-sm text-zinc-500">
              Sin acciones evitadas en los ultimos 7 dias.
            </div>
          ) : (
            data.avoidance.topActions.map((item) => (
              <div
                key={item.actionId}
                className="rounded-2xl border-l-4 border-signal-warning bg-zinc-900 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-zinc-800 px-2 py-1 font-semibold text-white">
                    {item.total} eventos
                  </span>
                  <span className="rounded bg-amber-500/15 px-2 py-1 font-semibold text-white">
                    {item.postpone} postpone
                  </span>
                  <span className="rounded bg-red-500/15 px-2 py-1 font-semibold text-white">
                    {item.refuse} refuse
                  </span>
                  {item.goalTitle ? (
                    <span className="text-zinc-500">Objetivo: {item.goalTitle}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{item.description}</p>
              </div>
            ))
          )}
        </div>
      </AdminPanel>

      <AdminPanel
        id="insights"
        title="Insights"
        description="Lecturas accionables para producto y operaciones."
      >
        <div className="space-y-3">
          {data.insights.map((insight, idx) => (
            <div
              key={idx}
              className="rounded-2xl border-l-4 border-violet-500 bg-zinc-900 p-4 shadow-sm"
            >
              <h3 className="font-semibold text-white">{insight.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{insight.content}</p>
              <p className="mt-2 text-sm font-medium text-violet-400">
                {insight.action}
              </p>
            </div>
          ))}
        </div>
      </AdminPanel>

      <div id="history" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AdminPanel title="Historial de decisiones">
          {data.decisionHistory && data.decisionHistory.length > 0 ? (
            <div className="space-y-3">
              {data.decisionHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="rounded bg-zinc-800 px-2 py-1 font-semibold text-white">
                      {item.metric}
                    </span>
                    <span>{formatDateTime(item.createdAt)}</span>
                    <span>valor {item.value.toFixed(2)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{item.decision}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-800/40 p-4 text-sm text-zinc-500">
              Sin decisiones historicas registradas todavia.
            </div>
          )}
        </AdminPanel>

        <AdminPanel title="Historial de insights">
          {data.insightHistory && data.insightHistory.length > 0 ? (
            <div className="space-y-3">
              {data.insightHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="rounded bg-zinc-800 px-2 py-1 font-semibold text-white">
                      {item.type}
                    </span>
                    <span>{formatDateTime(item.createdAt)}</span>
                    <span
                      className={`rounded px-2 py-1 font-semibold ${
                        item.priority === "high"
                          ? "bg-red-500/15 text-white"
                          : item.priority === "medium"
                            ? "bg-amber-500/15 text-white"
                            : "bg-emerald-500/15 text-white"
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="rounded bg-zinc-800 px-2 py-1 font-semibold text-white">
                      confianza {item.confidence}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">{item.content}</p>
                  <p className="mt-2 text-sm font-medium text-violet-400">
                    {item.action}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-800/40 p-4 text-sm text-zinc-500">
              Sin insights historicos registrados todavia.
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
