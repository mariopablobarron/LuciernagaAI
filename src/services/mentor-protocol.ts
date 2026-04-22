import type { RiskLevel } from "@/services/risk";
import type { TransformationPhase } from "@/services/transformation";
import type { UserState } from "@/domain/types";

export type MentorProtocolContext = {
  state: UserState;
  riskLevel: RiskLevel;
  transformationPhase: TransformationPhase;
  activeGoal: boolean;
  pendingActionsCount: number;
  avoidanceCount: number;
  avoidanceStreak?: number;
  avoidanceDetected: boolean;
  repeatedPattern: boolean;
  conversationMessageCount: number;
  progressTrend?: string;
};

export type MentorMode = {
  mode: "containment" | "supportive" | "directive" | "confrontation";
  validate: boolean;
  confront: boolean;
  pushAction: boolean;
  stopConversation: boolean;
  reason: string;
};

export type EmailCaptureContext = {
  isAnonymous: boolean;
  goalCount: number;
  actionCount: number;
  conversationMessageCount: number;
  conversionTrigger?: boolean;
};

export function getMentorMode(context: MentorProtocolContext): MentorMode {
  if (context.riskLevel === "high" || context.riskLevel === "critical") {
    return {
      mode: "containment",
      validate: true,
      confront: false,
      pushAction: false,
      stopConversation: true,
      reason: "Hay riesgo alto o critico; toca contencion y derivacion humana inmediata.",
    };
  }

  if (
    (context.avoidanceStreak ?? 0) >= 2 || context.avoidanceCount >= 4 ||
    context.repeatedPattern ||
    (context.pendingActionsCount > 0 && context.avoidanceDetected)
  ) {
    // Si el usuario lleva días mejorando (trend positivo) y la racha es baja,
    // preferimos directivo en lugar de confrontación directa.
    const streak = context.avoidanceStreak ?? context.avoidanceCount;
    if (context.progressTrend === "mejor" && streak < 3 && context.avoidanceCount < 4) {
      return {
        mode: "directive",
        validate: true,
        confront: false,
        pushAction: true,
        stopConversation: false,
        reason:
          "Hay evasión puntual pero el usuario lleva racha positiva; se mantiene modo directivo sin confrontación dura.",
      };
    }

    return {
      mode: "confrontation",
      validate: context.state === "ansiedad",
      confront: true,
      pushAction: true,
      stopConversation: false,
      reason: "Hay evasión repetida o patrón sostenido; no conviene suavizar la responsabilidad.",
    };
  }

  if (
    context.pendingActionsCount > 0 ||
    context.activeGoal ||
    context.transformationPhase === "accion" ||
    context.transformationPhase === "decision"
  ) {
    return {
      mode: "directive",
      validate: context.state !== "claridad",
      confront: false,
      pushAction: true,
      stopConversation: false,
      reason: "Ya existe una dirección clara; toca empujar cierre y no abrir más frentes.",
    };
  }

  return {
    mode: "supportive",
    validate: true,
    confront: false,
    pushAction: context.conversationMessageCount > 3,
    stopConversation: false,
    reason: "Todavia estamos construyendo claridad util antes de exigir ejecucion dura.",
  };
}

export function shouldAskForEmail(context: EmailCaptureContext): boolean {
  if (!context.isAnonymous) {
    return false;
  }

  // Se pide email cuando hay señal de valor real que merece la pena guardar:
  // - conversionTrigger explícito (soft paywall, action lock, etc.)
  // - compromiso adquirido (goal o action) aunque la sesión sea corta
  // - o bien conversación ya suficientemente larga (>3 mensajes) sin nag prematuro.
  return (
    Boolean(context.conversionTrigger) ||
    context.goalCount >= 1 ||
    context.actionCount >= 1 ||
    context.conversationMessageCount > 3
  );
}
