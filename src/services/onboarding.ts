import { ONBOARDING_STARTER_QUESTION } from "@/lib/onboarding";
import type { UserState } from "@/domain/types";

export type OnboardingStage = "opening" | "reflection" | "first_action";

export type ConversationalOnboardingContext = {
  active: boolean;
  stage: OnboardingStage;
  intent: string;
  starterQuestion: string;
  targetOutcome: string;
};

type OnboardingContextInput = {
  state: UserState;
  intent: string;
  hasGoal: boolean;
  pendingActionsCount: number;
  conversationMessageCount: number;
  goalCreatedThisTurn: boolean;
  actionGeneratedThisTurn: boolean;
};

export function getConversationalOnboarding(
  context: OnboardingContextInput
): ConversationalOnboardingContext {
  const earlyConversation = context.conversationMessageCount <= 3;
  const onboardingActive =
    earlyConversation &&
    (!context.hasGoal || context.pendingActionsCount === 0 || context.goalCreatedThisTurn);

  const stage: OnboardingStage =
    context.actionGeneratedThisTurn || context.pendingActionsCount > 0 || context.state === "claridad"
      ? "first_action"
      : context.conversationMessageCount <= 1
        ? "opening"
        : "reflection";

  const targetOutcome =
    stage === "opening"
      ? "Nombrar el problema real sin rodeos."
      : stage === "reflection"
        ? "Reflejar el bloqueo y reducirlo a un foco concreto."
        : "Salir de la conversación con una primera acción ejecutable hoy.";

  return {
    active: onboardingActive,
    stage,
    intent: context.intent,
    starterQuestion: ONBOARDING_STARTER_QUESTION,
    targetOutcome,
  };
}
