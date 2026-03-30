"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AdminShell } from "@/features/admin/components/AdminShell";
import type { AdminInsightsResponse } from "@/features/admin/types";
import { SAAS_CONFIG } from "@/lib/saas";

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

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminInsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/insights")
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as AdminInsightsResponse | null;

        if (res.status === 401) {
          router.replace("/admin/login?next=/admin");
          return null;
        }

        if (
          payload?.metrics &&
          payload?.decision &&
          payload?.alerts &&
          payload?.insights &&
          payload?.segments &&
          payload?.activity
        ) {
          if (!res.ok) {
            setDegraded(
              "El panel está en modo degradado. Revisa la base de datos o las migraciones."
            );
          }
          return payload;
        }

        if (!res.ok) {
          throw new Error("No se pudieron cargar los insights.");
        }

        return payload;
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
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!data) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <AdminShell
      title="Decision Engine Dashboard"
      subtitle="Patrones inspirados en Open SaaS: shell reutilizable, KPI modulares y separacion clara entre analytics, operaciones y admin. Tu producto mantiene intacto el nucleo de chat, goals, crisis y seguimiento."
      onLogout={handleLogout}
    >
      {degraded ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Decision automatica
          </p>
          <p className="mt-2 text-xl font-semibold text-rose-900">{data.decision.decision}</p>
          <p className="mt-2 text-sm text-rose-900/80">{data.decision.reason}</p>
          <p className="mt-3 text-sm font-medium text-rose-800">
            Accion sugerida: {data.decision.action}
          </p>
        </div>
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
          title="Billing readiness"
          description="Extraccion de patron de Open SaaS: dejar billing desacoplado y listo, sin forzar Stripe antes de tiempo."
        >
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Proveedor previsto: {SAAS_CONFIG.billing.provider}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Estado actual: {SAAS_CONFIG.billing.enabled ? "activo" : "no integrado"}.
            </p>
          </div>

          <div className="space-y-3">
            {SAAS_CONFIG.billing.plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{plan.name}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {plan.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                <p className="mt-2 text-sm font-medium text-slate-800">{plan.priceLabel}</p>
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
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Sin eventos high/critical en las ultimas 24h.
              </div>
            ) : (
              data.crisis.latestEvents.map((event, idx) => (
                <div
                  key={`${event.userId}-${event.createdAt}-${idx}`}
                  className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm ${
                    event.level === "critical"
                      ? "border-rose-600 bg-rose-50/40"
                      : "border-amber-500 bg-amber-50/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-700">
                      {event.userId}
                    </span>
                    <span
                      className={`rounded px-2 py-1 font-semibold uppercase ${
                        event.level === "critical"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {event.level}
                    </span>
                    <span className="text-slate-500">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-800">{event.message}</p>
                </div>
              ))
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Alerts"
          description="Señales accionables priorizadas por retencion, crisis y evitacion."
        >
          <div className="space-y-3">
            {data.alerts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Sin alertas criticas.
              </div>
            ) : (
              data.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border-l-4 border-rose-500 bg-white p-4 shadow-sm"
                >
                  <h3 className="font-semibold text-rose-900">{alert.title}</h3>
                  <p className="mt-1 text-sm text-slate-700">{alert.message}</p>
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Sin acciones evitadas en los ultimos 7 dias.
            </div>
          ) : (
            data.avoidance.topActions.map((item) => (
              <div
                key={item.actionId}
                className="rounded-2xl border-l-4 border-amber-500 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                    {item.total} eventos
                  </span>
                  <span className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-800">
                    {item.postpone} postpone
                  </span>
                  <span className="rounded bg-rose-100 px-2 py-1 font-semibold text-rose-800">
                    {item.refuse} refuse
                  </span>
                  {item.goalTitle ? (
                    <span className="text-slate-500">Objetivo: {item.goalTitle}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.description}</p>
              </div>
            ))
          )}
        </div>
      </AdminPanel>

      <AdminPanel title="Insights" description="Lecturas accionables para producto y operaciones.">
        <div className="space-y-3">
          {data.insights.map((insight, idx) => (
            <div key={idx} className="rounded-2xl border-l-4 border-sky-500 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-sky-900">{insight.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{insight.content}</p>
              <p className="mt-2 text-sm font-medium text-sky-700">{insight.action}</p>
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
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                      {item.metric}
                    </span>
                    <span>{formatDateTime(item.createdAt)}</span>
                    <span>valor {item.value.toFixed(2)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{item.decision}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
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
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                      {item.type}
                    </span>
                    <span>{formatDateTime(item.createdAt)}</span>
                    <span
                      className={`rounded px-2 py-1 font-semibold ${
                        item.priority === "high"
                          ? "bg-rose-100 text-rose-800"
                          : item.priority === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                      confianza {item.confidence}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.content}</p>
                  <p className="mt-2 text-sm font-medium text-sky-700">{item.action}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Sin insights historicos registrados todavia.
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
