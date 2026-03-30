import type { UserState } from "@/types/chat";

export type TransformationPhase =
  | "bloqueo"
  | "exploracion"
  | "decision"
  | "accion"
  | "consistencia";

export type TransformationContext = {
  state: UserState;
  intent?: string | null;
  hasGoal: boolean;
  totalActions: number;
  pendingActionsCount: number;
  completedActionsCount: number;
  avoidanceCount: number;
  conversationMessageCount: number;
};

export function inferTransformationPhase(
  context: TransformationContext
): TransformationPhase {
  if (
    !context.hasGoal &&
    context.totalActions === 0 &&
    (context.state === "bloqueo" || context.state === "ansiedad")
  ) {
    return "bloqueo";
  }

  if (context.completedActionsCount >= 2) {
    return "consistencia";
  }

  if (context.pendingActionsCount > 0 || context.intent === "action_done") {
    return "accion";
  }

  if (
    context.hasGoal ||
    context.intent === "goal_creation" ||
    context.intent === "problem" ||
    context.intent === "doubt"
  ) {
    if (context.state === "duda" || context.intent === "doubt") {
      return "decision";
    }

    if (context.totalActions > 0) {
      return "accion";
    }

    return "exploracion";
  }

  if (context.avoidanceCount > 0 && context.conversationMessageCount > 3) {
    return "decision";
  }

  return "bloqueo";
}

export function describeTransformationPhase(phase: TransformationPhase): string {
  if (phase === "consistencia") {
    return "El usuario ya ejecuto varias acciones; el foco es sostener el habito y no dispersarse.";
  }

  if (phase === "accion") {
    return "El usuario ya tiene objetivo o accion abierta; el foco es empujar ejecucion y evidencia.";
  }

  if (phase === "decision") {
    return "El usuario esta reduciendo ambiguedad y necesita cerrar una eleccion concreta.";
  }

  if (phase === "exploracion") {
    return "El usuario esta entendiendo el problema; el foco es claridad util, no teoria larga.";
  }

  return "El usuario sigue en bloqueo o parálisis; el foco es destrabar con el siguiente paso minimo.";
}
