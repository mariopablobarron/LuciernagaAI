import type { Decision as DomainDecision, Insight as DomainInsight, SystemState } from "@/domain/types";
import type { analyzeEmotionalProfile } from "@/services/emotional-model";
import type { getActiveGoalForUser } from "@/services/goals";
import type { getMentorMode } from "@/services/mentor-protocol";
import type { RiskLevel } from "@/services/risk";
import type { searchWeb } from "@/services/search";
import type { inferTransformationPhase } from "@/services/transformation";
import type { SessionContext } from "../processMessage";

// ─── Flow Context (from services/flows) ──────────────────────────────────────

export type FlowContext = {
  currentIntent: string;
  currentStep: number;
  activeFlow: string | null;
  instruction: string | null;
};

// ─── Pipeline Context — accumulates data across phases ───────────────────────

export type PipelineContext = {
  // Input
  userId: string;
  message: string;
  conversationId: string;
  session: SessionContext;
  jsonMode: boolean;
  remainingMessagesAfterTurn: number | null;
  softPaywallActive: boolean;

  // Phase 1: Analyze
  state: string;
  tvSignals: { confusionScore: number; identityShift: boolean; directionClarity: number };
  detectedIntent: string;
  riskLevel: RiskLevel;
  emotionalProfile: ReturnType<typeof analyzeEmotionalProfile>;
  flowContext: FlowContext;

  // Phase 2: Enrich (DB)
  persistenceAvailable: boolean;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  activeGoal: Awaited<ReturnType<typeof getActiveGoalForUser>> | null;
  searchResults: Awaited<ReturnType<typeof searchWeb>>;
  searchQuery: string | null;
  conversationMessageCount: number;

  // Crisis
  crisisMode: boolean;
  crisisSource: "detected" | "active_state" | "none";
  crisisActiveUntil: string | null;

  // Goals & avoidance
  goalAvoidanceCount: number;
  goalAvoidanceStreak: number;
  goalPendingActionsCount: number;
  goalCreatedThisTurn: boolean;
  actionGeneratedThisTurn: boolean;
  avoidanceDetectedThisTurn: boolean;
  actionCompletedThisTurn: boolean;
  completionMicroFeedback: string | null;

  // Domain engine
  domainInsight: DomainInsight;
  domainState: SystemState;
  domainDecision: DomainDecision;

  // Transformation & mentor
  transformationPhase: ReturnType<typeof inferTransformationPhase>;
  transformationSummary: string;
  mentorMode: ReturnType<typeof getMentorMode>;
  onboardingContext: ReturnType<typeof import("@/services/onboarding").getConversationalOnboarding>;

  // Conversion & capture
  conversionTrigger: boolean;
  captureEmailRecommended: boolean;
  captureEmailMessage: string;

  // Action lock
  actionLockPayload: Record<string, unknown> | null;
  actionLockAssistantMessage: string | null;

  // Coach context (built in phase 4)
  coachContext: Record<string, unknown> | null;

  // Community CTA (null unless a recurrent-blocker or ask-community signal fires)
  communityCTA:
    | import("@/services/community-cta").CommunityCtaAction
    | import("@/services/ask-community-cta").AskCommunityCtaAction
    | null;
};
