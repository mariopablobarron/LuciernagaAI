"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { EmotionalProfile } from "@/types/emotional-profile";

type InsightsPanelProps = {
  state: string;
  emotionalProfile: EmotionalProfile;
  insight: string;
  action: string;
  mode?: "chat" | "plan" | "checkin";
  responseSignals?: {
    searchUsed: boolean;
    fallback: boolean;
    flow: {
      currentIntent: string;
      currentStep: number;
      activeFlow: string | null;
      instruction: string | null;
    } | null;
  };
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

function stateVariant(state: string): "secondary" | "success" | "warning" {
  if (state === "claridad") return "success";
  if (state === "bloqueo" || state === "ansiedad") return "warning";
  return "secondary";
}

function emotionVariant(
  emotion: EmotionalProfile["primaryEmotion"]
): "secondary" | "success" | "warning" | "danger" {
  if (emotion === "frustración") return "danger";
  if (emotion === "ansiedad") return "warning";
  if (emotion === "calma") return "success";
  return "secondary";
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
  mode = "chat",
  responseSignals,
  actionLock,
  alerts,
  goal,
  goalLoading = false,
  onToggleAction,
}: InsightsPanelProps) {
  const flow = responseSignals?.flow;

  const profileSection = (
    <Card className="border-border/80 bg-card/95 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Pulso emocional</CardTitle>
        {/* AI Act art. 50.3: el usuario debe saber que esto es inferencia de la IA. */}
        <p className="text-[11px] text-muted-foreground">
          Estimación automática a partir de tus mensajes · puede equivocarse
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={emotionVariant(emotionalProfile.primaryEmotion)} className="rounded-full px-3 py-1">
            {emotionalProfile.primaryEmotion}
          </Badge>
          <Badge variant={stateVariant(state)} className="rounded-full px-3 py-1 capitalize">
            {state}
          </Badge>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Patrón dominante
            </p>
            <p className="mt-1 font-medium text-foreground">
              {formatPattern(emotionalProfile.dominantPattern)}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-border bg-muted/40 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Energía
              </p>
              <p className="mt-1 font-medium text-foreground">{emotionalProfile.energyLevel}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Tendencia
              </p>
              <p className="mt-1 font-medium text-foreground">{emotionalProfile.progressTrend}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const insightSection = (
    <Card className="border-border/80 bg-card/95 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Lectura del turno</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{insight}</p>
      </CardContent>
    </Card>
  );

  const engineSection = (
    <Card className="border-border/80 bg-card/95 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Señales del motor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={responseSignals?.searchUsed ? "secondary" : "secondary"}
            className="rounded-full px-3 py-1"
          >
            {responseSignals?.searchUsed ? "Internet usado" : "Sin búsqueda externa"}
          </Badge>
          <Badge
            variant={responseSignals?.fallback ? "warning" : "success"}
            className="rounded-full px-3 py-1"
          >
            {responseSignals?.fallback ? "Fallback activo" : "Proveedor IA estable"}
          </Badge>
        </div>
        {flow?.activeFlow ? (
          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Flujo activo
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {flow.activeFlow} · paso {flow.currentStep}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Intent: {flow.currentIntent}</p>
            {flow.instruction ? (
              <p className="mt-2 text-sm text-muted-foreground">{flow.instruction}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin flujo guiado activo en este turno.</p>
        )}
      </CardContent>
    </Card>
  );

  const actionSection = (
    <Card className="border-border/80 bg-card/95 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Siguiente empuje</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium leading-6 text-foreground">{action}</p>
      </CardContent>
    </Card>
  );

  const actionLockSection = actionLock ? (
    <Card className="border-signal-warning/30 bg-signal-warning/12 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">
          Responsabilidad activa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-foreground">
        <p className="font-semibold">{actionLock.actionTitle}</p>
        <p>{actionLock.message}</p>
        <div className="grid gap-2">
          <div className="rounded-xl border border-signal-warning/30 bg-background/85 px-3 py-2">
            Escribe: &quot;ya lo hice&quot;
          </div>
          <div className="rounded-xl border border-signal-warning/30 bg-background/85 px-3 py-2">
            O pospón explícitamente: &quot;lo hago luego&quot;
          </div>
        </div>
      </CardContent>
    </Card>
  ) : null;

  const alertsSection = (
    <Card className="border-border/80 bg-card/95 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Alertas</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin alertas activas.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={`${alert}-${index}`}
                className="rounded-2xl border border-signal-danger/30 bg-signal-danger/12 px-3 py-3 text-sm text-foreground"
              >
                {alert}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const goalSection = (
    <Card className="border-border/80 bg-card/95 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Objetivo activo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!goal ? (
          <p className="text-sm text-muted-foreground">Aún no hay objetivo activo.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {goal.status}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {goal.completedCount}/{goal.totalCount}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-foreground">{goal.title}</p>
            <Progress value={goal.progress} className="h-2.5" />
            <p className="text-sm text-muted-foreground">Progreso visible: {goal.progress}%</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  const checklistSection = (
    <Card className="border-border/80 bg-card/95 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Checklist</CardTitle>
      </CardHeader>
      <CardContent>
        {!goal || goal.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin acciones definidas.</p>
        ) : (
          <ul className="space-y-2">
            {goal.actions.map((goalAction) => (
              <li key={goalAction.id}>
                <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={goalAction.completed}
                    disabled={goalLoading}
                    onChange={(event) => onToggleAction?.(goalAction.id, event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                  <span className={goalAction.completed ? "line-through text-muted-foreground" : ""}>
                    {goalAction.description}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  const sectionMap: Record<string, ReactNode> = {
    profile: profileSection,
    insight: insightSection,
    engine: engineSection,
    action: actionSection,
    actionLock: actionLockSection,
    alerts: alertsSection,
    goal: goalSection,
    checklist: checklistSection,
  };

  const orderedKeys =
    mode === "plan"
      ? ["goal", "checklist", "action", "actionLock", "alerts", "profile", "engine", "insight"]
      : mode === "checkin"
        ? ["profile", "insight", "alerts", "goal", "action", "engine", "checklist", "actionLock"]
        : ["profile", "insight", "engine", "action", "actionLock", "alerts", "goal", "checklist"];

  return (
    <aside className="h-full space-y-3">
      <div className="rounded-2xl border border-border/80 bg-card/95 px-4 py-3 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Panel contextual
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "plan"
            ? "Objetivo, progreso y deuda de acción en primer plano."
            : mode === "checkin"
              ? "Estado emocional y continuidad del hábito diario."
              : "Lectura rápida de estado, señales y siguiente empuje."}
        </p>
      </div>

      {orderedKeys.map((key) => {
        const section = sectionMap[key];
        return section ? <div key={key}>{section}</div> : null;
      })}
    </aside>
  );
}
