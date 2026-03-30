import type { RiskLevel } from "@/services/risk";
import type { TransformationPhase } from "@/services/transformation";
import type { UserState } from "@/types/chat";

export type MentorProtocolContext = {
  state: UserState;
  riskLevel: RiskLevel;
  transformationPhase: TransformationPhase;
  activeGoal: boolean;
  pendingActionsCount: number;
  avoidanceCount: number;
  avoidanceDetected: boolean;
  repeatedPattern: boolean;
  conversationMessageCount: number;
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
    context.avoidanceCount >= 2 ||
    context.repeatedPattern ||
    (context.pendingActionsCount > 0 && context.avoidanceDetected)
  ) {
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
    pushAction: context.conversationMessageCount > 1,
    stopConversation: false,
    reason: "Todavia estamos construyendo claridad util antes de exigir ejecucion dura.",
  };
}

export function shouldAskForEmail(context: EmailCaptureContext): boolean {
  if (!context.isAnonymous) {
    return false;
  }

  return (
    context.goalCount >= 1 ||
    context.actionCount >= 1 ||
    context.conversationMessageCount > 3
  );
}
