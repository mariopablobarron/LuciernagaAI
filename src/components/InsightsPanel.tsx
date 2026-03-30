"use client";

import type { EmotionalProfile } from "@/types/emotional-profile";

type InsightsPanelProps = {
  state: string;
  emotionalProfile: EmotionalProfile;
  insight: string;
  action: string;
  actionLock?: {
    message: string;
    actionTitle: string;
  } | null;
  alerts: string[];
  goal: {
    id: string;
    title: string;
    status: string;
    progress: number;
    completedCount: number;
    totalCount: number;
    actions: Array<{
      id: string;
      description: string;
      completed: boolean;
    }>;
  } | null;
  goalLoading?: boolean;
  onToggleAction?: (actionId: string, completed: boolean) => Promise<void> | void;
};

function stateTone(state: string): string {
  if (state === "bloqueo") return "bg-amber-100 text-amber-900";
  if (state === "ansiedad") return "bg-orange-100 text-orange-900";
  if (state === "duda") return "bg-sky-100 text-sky-900";
  if (state === "claridad") return "bg-emerald-100 text-emerald-900";
  return "bg-emerald-100 text-emerald-900";
}

function emotionTone(emotion: EmotionalProfile["primaryEmotion"]): string {
  if (emotion === "ansiedad") return "bg-orange-100 text-orange-900";
  if (emotion === "apatía") return "bg-slate-200 text-slate-800";
  if (emotion === "confusión") return "bg-sky-100 text-sky-900";
  if (emotion === "frustración") return "bg-rose-100 text-rose-900";
  return "bg-emerald-100 text-emerald-900";
}

function formatPattern(pattern: EmotionalProfile["dominantPattern"]): string {
  if (pattern === "evita_decidir") return "Evita decidir";
  if (pattern === "miedo_al_error") return "Miedo al error";
  if (pattern === "perfeccionismo") return "Perfeccionismo";
  if (pattern === "comparación") return "Comparación";
  return "Procrastinación";
}

export default function InsightsPanel({
  state,
  emotionalProfile,
  insight,
  action,
  actionLock,
  alerts,
  goal,
  goalLoading = false,
  onToggleAction,
}: InsightsPanelProps) {
  return (
    <aside className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Panel inteligente
      </h2>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-500">Perfil emocional actual</p>
        <span
          className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${emotionTone(
            emotionalProfile.primaryEmotion
          )}`}
        >
          {emotionalProfile.primaryEmotion}
        </span>
        <p className="mt-2 text-xs text-slate-600">
          Estado operativo:{" "}
          <span className={`rounded-full px-2 py-1 font-semibold ${stateTone(state)}`}>
            {state}
          </span>
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Patrón dominante
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatPattern(emotionalProfile.dominantPattern)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Energía
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {emotionalProfile.energyLevel}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Tendencia
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {emotionalProfile.progressTrend}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-500">Insight</p>
        <p className="mt-2 text-sm text-slate-700">{insight}</p>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-500">Acción recomendada</p>
        <p className="mt-2 text-sm font-medium text-slate-900">{action}</p>
      </section>

      {actionLock ? (
        <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">Acción obligatoria</p>
          <p className="mt-2 text-sm font-semibold text-amber-950">{actionLock.actionTitle}</p>
          <p className="mt-2 text-sm text-amber-900">{actionLock.message}</p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-900">
              Marca progreso: escribe &quot;ya lo hice&quot;
            </div>
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-900">
              Pospón explícitamente: &quot;lo hago luego&quot;
            </div>
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-900">
              Rechaza explícitamente: &quot;no lo voy a hacer&quot;
            </div>
          </div>
        </section>
      ) : null}

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

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-500">Objetivo activo</p>
        {!goal ? (
          <p className="mt-2 text-sm text-slate-600">Aún no hay objetivo activo.</p>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="text-sm font-semibold text-slate-900">{goal.title}</p>
            <p className="text-xs text-slate-600">
              Estado: <span className="font-medium">{goal.status}</span>
            </p>
            <p className="text-xs text-slate-600">
              Progreso:{" "}
              <span className="font-medium">
                {goal.completedCount}/{goal.totalCount} ({goal.progress}%)
              </span>
            </p>
            <div className="h-2 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-500">Checklist de acciones</p>
        {!goal || goal.actions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Sin acciones definidas.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {goal.actions.map((goalAction) => (
              <li key={goalAction.id}>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={goalAction.completed}
                    disabled={goalLoading}
                    onChange={(event) =>
                      onToggleAction?.(goalAction.id, event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <span
                    className={goalAction.completed ? "line-through text-slate-400" : ""}
                  >
                    {goalAction.description}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
