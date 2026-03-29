"use client";

type InsightsPanelProps = {
  state: string;
  insight: string;
  action: string;
  alerts: string[];
};

function stateTone(state: string): string {
  if (state === "bloqueado") return "bg-amber-100 text-amber-900";
  if (state === "ansioso") return "bg-orange-100 text-orange-900";
  if (state === "perdido") return "bg-rose-100 text-rose-900";
  return "bg-emerald-100 text-emerald-900";
}

export default function InsightsPanel({
  state,
  insight,
  action,
  alerts,
}: InsightsPanelProps) {
  return (
    <aside className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Panel inteligente
      </h2>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-500">Estado emocional</p>
        <span
          className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stateTone(
            state
          )}`}
        >
          {state}
        </span>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-500">Insight</p>
        <p className="mt-2 text-sm text-slate-700">{insight}</p>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-500">Acción recomendada</p>
        <p className="mt-2 text-sm font-medium text-slate-900">{action}</p>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-500">Alertas</p>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Sin alertas activas.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {alerts.map((alert, index) => (
              <li
                key={`${alert}-${index}`}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {alert}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
