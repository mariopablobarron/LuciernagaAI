"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AdminShell } from "@/features/admin/components/AdminShell";
import type { AdminInsightsResponse } from "@/features/admin/types";
import { SAAS_CONFIG } from "@/lib/saas";

type AdminInsightsPartial = Partial<AdminInsightsResponse> | null;

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
      <main className="min-h-screen bg-background p-6">
        <Card className="mx-auto max-w-2xl border-signal-danger/30 bg-signal-danger/12">
          <CardContent className="p-6 text-foreground">{error}</CardContent>
        </Card>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-background p-6">
        <Card className="mx-auto max-w-2xl border-border/80 bg-card/95">
          <CardContent className="p-6 text-muted-foreground">Cargando dashboard...</CardContent>
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
        <div className="rounded-2xl border border-signal-warning/30 bg-signal-warning/12 px-4 py-3 text-sm text-foreground">
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

        <div className="rounded-2xl border border-emotion-doubt/30 bg-emotion-doubt/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Decision automatica
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground">{data.decision.decision}</p>
          <p className="mt-2 text-sm text-muted-foreground">{data.decision.reason}</p>
          <p className="mt-3 text-sm font-medium text-foreground">
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
          id="billing"
          title="Billing readiness"
          description="Extraccion de patron de Open SaaS: dejar billing desacoplado y listo, sin forzar Stripe antes de tiempo."
        >
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              Proveedor previsto: {SAAS_CONFIG.billing.provider}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Estado actual: {SAAS_CONFIG.billing.enabled ? "activo" : "no integrado"}.
            </p>
          </div>

          <div className="space-y-3">
            {SAAS_CONFIG.billing.plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{plan.name}</p>
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                    {plan.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                <p className="mt-2 text-sm font-medium text-foreground">{plan.priceLabel}</p>
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
              <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Sin eventos high/critical en las ultimas 24h.
              </div>
            ) : (
              data.crisis.latestEvents.map((event, idx) => (
                <div
                  key={`${event.userId}-${event.createdAt}-${idx}`}
                  className={`rounded-2xl border-l-4 bg-card p-4 shadow-sm ${
                    event.level === "critical"
                      ? "border-signal-danger bg-signal-danger/10"
                      : "border-signal-warning bg-signal-warning/10"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-muted px-2 py-1 font-mono text-foreground">
                      {event.userId}
                    </span>
                    <span
                      className={`rounded px-2 py-1 font-semibold uppercase ${
                        event.level === "critical"
                          ? "bg-signal-danger/15 text-foreground"
                          : "bg-signal-warning/15 text-foreground"
                      }`}
                    >
                      {event.level}
                    </span>
                    <span className="text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{event.message}</p>
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
              <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Sin alertas criticas.
              </div>
            ) : (
              data.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border-l-4 border-signal-danger bg-signal-danger/10 p-4 shadow-sm"
                >
                  <h3 className="font-semibold text-foreground">{alert.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
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
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Sin acciones evitadas en los ultimos 7 dias.
            </div>
          ) : (
            data.avoidance.topActions.map((item) => (
              <div
                key={item.actionId}
                className="rounded-2xl border-l-4 border-signal-warning bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-muted px-2 py-1 font-semibold text-foreground">
                    {item.total} eventos
                  </span>
                  <span className="rounded bg-signal-warning/15 px-2 py-1 font-semibold text-foreground">
                    {item.postpone} postpone
                  </span>
                  <span className="rounded bg-signal-danger/15 px-2 py-1 font-semibold text-foreground">
                    {item.refuse} refuse
                  </span>
                  {item.goalTitle ? (
                    <span className="text-muted-foreground">Objetivo: {item.goalTitle}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{item.description}</p>
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
              className="rounded-2xl border-l-4 border-emotion-doubt bg-card p-4 shadow-sm"
            >
              <h3 className="font-semibold text-foreground">{insight.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{insight.content}</p>
              <p className="mt-2 text-sm font-medium text-[color:color-mix(in_oklab,var(--emotion-doubt)_78%,var(--foreground))]">
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
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-2 py-1 font-semibold text-foreground">
                      {item.metric}
                    </span>
                    <span>{formatDateTime(item.createdAt)}</span>
                    <span>valor {item.value.toFixed(2)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{item.decision}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
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
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-2 py-1 font-semibold text-foreground">
                      {item.type}
                    </span>
                    <span>{formatDateTime(item.createdAt)}</span>
                    <span
                      className={`rounded px-2 py-1 font-semibold ${
                        item.priority === "high"
                          ? "bg-signal-danger/15 text-foreground"
                          : item.priority === "medium"
                            ? "bg-signal-warning/15 text-foreground"
                            : "bg-signal-success/15 text-foreground"
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="rounded bg-muted px-2 py-1 font-semibold text-foreground">
                      confianza {item.confidence}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.content}</p>
                  <p className="mt-2 text-sm font-medium text-[color:color-mix(in_oklab,var(--emotion-doubt)_78%,var(--foreground))]">
                    {item.action}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Sin insights historicos registrados todavia.
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
