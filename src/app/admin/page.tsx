"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Priority = "low" | "medium" | "high";

interface Insight {
  type: string;
  title: string;
  content: string;
  action: string;
  priority: Priority;
}

interface AlertItem {
  type: "critical" | "warning";
  title: string;
  message: string;
}

interface AdminInsightsResponse {
  metrics: {
    retentionDay3: number;
    retentionDay7: number;
    dropOffPoint: string;
    checkinDrop: number;
    dominantState: string;
  };
  decision: {
    decision: string;
    reason: string;
    priority: Priority;
    action: string;
  };
  alerts: AlertItem[];
  insights: Insight[];
  crisis: {
    last24h: {
      total: number;
      high: number;
      critical: number;
    };
    latestEvents: Array<{
      userId: string;
      level: "high" | "critical";
      message: string;
      createdAt: string;
    }>;
  };
  avoidance: {
    last7d: {
      total: number;
      postpone: number;
      refuse: number;
      uniqueUsers: number;
    };
    topActions: Array<{
      actionId: string;
      description: string;
      goalTitle: string | null;
      total: number;
      postpone: number;
      refuse: number;
    }>;
  };
}

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

  useEffect(() => {
    fetch("/api/admin/insights")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/admin/login?next=/admin");
          return null;
        }

        if (!res.ok) {
          throw new Error("No se pudieron cargar los insights.");
        }

        const payload = (await res.json()) as AdminInsightsResponse;
        return payload;
      })
      .then((payload) => {
        if (payload) {
          setData(payload);
        }
      })
      .catch((fetchError: unknown) => {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Error cargando datos del admin.";
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

  if (!data) return <div className="p-6">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Luciérnaga Admin - Decision Engine</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Retención D3</p>
          <h2 className="text-2xl font-bold text-green-600">{formatPercent(data.metrics.retentionDay3)}</h2>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Retención D7</p>
          <h2 className="text-2xl font-bold text-blue-600">{formatPercent(data.metrics.retentionDay7)}</h2>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Drop-off</p>
          <h2 className="text-xl font-bold text-red-600">{data.metrics.dropOffPoint}</h2>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Check-in Drop</p>
          <h2 className="text-2xl font-bold text-orange-600">{formatPercent(data.metrics.checkinDrop)}</h2>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Estado Dominante</p>
          <h2 className="text-xl font-bold text-purple-600">{data.metrics.dominantState}</h2>
        </div>
      </div>

      <div className="p-6 bg-white rounded border-l-4 border-red-500 shadow">
        <h2 className="text-lg font-bold mb-2">Decisión Automática</h2>
        <p className="text-lg font-semibold text-red-600 mb-2">{data.decision.decision}</p>
        <p className="text-sm text-gray-700 mb-2">{data.decision.reason}</p>
        <p className="text-sm text-blue-700 font-medium">Acción: {data.decision.action}</p>
        <div className="mt-3">
          <span
            className={`px-3 py-1 rounded text-sm font-bold ${
              data.decision.priority === "high"
                ? "bg-red-200 text-red-800"
                : data.decision.priority === "medium"
                  ? "bg-yellow-200 text-yellow-800"
                  : "bg-green-200 text-green-800"
            }`}
          >
            {data.decision.priority.toUpperCase()}
          </span>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">Alerts</h2>
        <div className="space-y-3">
          {data.alerts.length === 0 ? (
            <div className="p-4 bg-white rounded shadow text-sm text-gray-600">Sin alertas críticas.</div>
          ) : (
            data.alerts.map((alert, idx) => (
              <div key={idx} className="p-4 bg-white rounded shadow border-l-4 border-red-500">
                <h3 className="font-bold text-red-900">{alert.title}</h3>
                <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">Crisis (últimas 24h)</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded bg-white p-4 shadow">
            <p className="text-sm text-gray-600">Total eventos</p>
            <p className="text-2xl font-bold text-slate-900">{data.crisis.last24h.total}</p>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <p className="text-sm text-gray-600">High</p>
            <p className="text-2xl font-bold text-orange-600">{data.crisis.last24h.high}</p>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <p className="text-sm text-gray-600">Critical</p>
            <p className="text-2xl font-bold text-red-700">{data.crisis.last24h.critical}</p>
          </div>
        </div>

        <div className="space-y-2">
          {data.crisis.latestEvents.length === 0 ? (
            <div className="rounded bg-white p-4 text-sm text-gray-600 shadow">
              Sin eventos high/critical en las últimas 24h.
            </div>
          ) : (
            data.crisis.latestEvents.map((event, idx) => (
              <div
                key={`${event.userId}-${event.createdAt}-${idx}`}
                className={`rounded border-l-4 bg-white p-4 shadow ${
                  event.level === "critical"
                    ? "border-red-600 bg-red-50/40"
                    : "border-orange-500 bg-orange-50/40"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-700">
                    {event.userId}
                  </span>
                  <span
                    className={`rounded px-2 py-1 font-semibold uppercase ${
                      event.level === "critical"
                        ? "bg-red-100 text-red-800"
                        : "bg-orange-100 text-orange-800"
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
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">Evitación de acciones (últimos 7 días)</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded bg-white p-4 shadow">
            <p className="text-sm text-gray-600">Total eventos</p>
            <p className="text-2xl font-bold text-slate-900">{data.avoidance.last7d.total}</p>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <p className="text-sm text-gray-600">Postergaciones</p>
            <p className="text-2xl font-bold text-amber-600">
              {data.avoidance.last7d.postpone}
            </p>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <p className="text-sm text-gray-600">Rechazos</p>
            <p className="text-2xl font-bold text-rose-700">{data.avoidance.last7d.refuse}</p>
          </div>
          <div className="rounded bg-white p-4 shadow">
            <p className="text-sm text-gray-600">Usuarios implicados</p>
            <p className="text-2xl font-bold text-slate-900">
              {data.avoidance.last7d.uniqueUsers}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {data.avoidance.topActions.length === 0 ? (
            <div className="rounded bg-white p-4 text-sm text-gray-600 shadow">
              Sin acciones evitadas en los últimos 7 días.
            </div>
          ) : (
            data.avoidance.topActions.map((item) => (
              <div
                key={item.actionId}
                className="rounded border-l-4 border-amber-500 bg-white p-4 shadow"
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
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">Insights</h2>
        <div className="space-y-3">
          {data.insights.map((insight, idx: number) => (
            <div key={idx} className="p-4 bg-white rounded shadow border-l-4 border-blue-500">
              <h3 className="font-bold text-blue-900">{insight.title}</h3>
              <p className="text-sm text-gray-700 mt-1">{insight.content}</p>
              <p className="mt-2 text-blue-600 font-medium">{insight.action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
