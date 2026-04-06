/**
 * Phase 3: INTERCEPT
 *
 * Handles early-return scenarios that bypass AI generation:
 * - Action lock: user has a pending action and hasn't completed it
 * - Crisis: risk level is high/critical or user has active crisis state
 * - Transitional void: domain engine detected identity confusion
 *
 * Returns the response payload if intercepted, or null to continue pipeline.
 */

import { logError, logInfo } from "@/lib/logger";
import { sendCrisisEscalationAlert } from "@/lib/alerts";
import { generateDecision as generateDomainDecision } from "@/domain/decisionEngine";
import {
  getCrisisResponse,
  registerCrisisEvent,
  type RiskLevel,
} from "@/services/risk";
import {
  appendCaptureEmailPrompt,
  buildActionRequiredMessage,
} from "@/services/coach";
import { saveConversationMessage } from "@/services/conversation";
import { trackSafe } from "@/services/events";
import type { SystemState, Decision as DomainDecision, Insight as DomainInsight } from "@/domain/types";
import type { getMentorMode } from "@/services/mentor-protocol";
import type { getActiveGoalForUser } from "@/services/goals";
import type { analyzeEmotionalProfile } from "@/services/emotional-model";
import type { FlowContext } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeGoal(goal: Awaited<ReturnType<typeof getActiveGoalForUser>>) {
  if (!goal) return null;
  return {
    id: goal.id,
    title: goal.title,
    status: goal.status,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
    completedCount: goal.completedCount,
    totalCount: goal.totalCount,
    progress: goal.progress,
    actions: goal.actions.map((a) => ({
      id: a.id,
      description: a.description,
      completed: a.completed,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

function serializeFlow(flow: FlowContext) {
  return {
    currentIntent: flow.currentIntent,
    currentStep: flow.currentStep,
    activeFlow: flow.activeFlow,
    instruction: flow.instruction,
  };
}

function buildChatInsight(params: Partial<DomainInsight>): DomainInsight {
  return {
    retentionDay3: params.retentionDay3 ?? 0.5,
    retentionDay7: params.retentionDay7 ?? 0.5,
    checkinDrop: params.checkinDrop ?? 0.4,
    avoidanceRate: params.avoidanceRate ?? 0,
    actionCompletionRate: params.actionCompletionRate ?? 0.4,
    crisisCount: params.crisisCount ?? 0,
    confusionScore: params.confusionScore,
    identityShift: params.identityShift,
    directionClarity: params.directionClarity,
  };
}

// ─── Intercept params ─────────────────────────────────────────────────────────

export type InterceptInput = {
  userId: string;
  message: string;
  state: string;
  conversationId: string;
  persistenceAvailable: boolean;
  flowContext: FlowContext;
  emotionalProfile: ReturnType<typeof analyzeEmotionalProfile>;

  // Crisis
  crisisMode: boolean;
  crisisSource: "detected" | "active_state" | "none";
  crisisActiveUntil: string | null;
  riskLevel: RiskLevel;

  // Action lock
  actionLockPayload: Record<string, unknown> | null;
  actionLockAssistantMessage: string | null;
  captureEmailRecommended: boolean;
  captureEmailMessage: string;

  // Transitional void
  domainState: SystemState;
  domainDecision: DomainDecision;

  // Context for serialization
  activeGoal: Awaited<ReturnType<typeof getActiveGoalForUser>> | null;
};

export type InterceptResult =
  | { intercepted: true; data: Record<string, unknown> }
  | { intercepted: false };

// ─── Action Lock ──────────────────────────────────────────────────────────────

export async function interceptActionLock(input: InterceptInput): Promise<InterceptResult> {
  if (!input.actionLockPayload || !input.actionLockAssistantMessage) {
    return { intercepted: false };
  }

  let assistantMessage = input.actionLockAssistantMessage;
  if (input.captureEmailRecommended) {
    assistantMessage = appendCaptureEmailPrompt(assistantMessage, true);
  }

  const payload = {
    ...input.actionLockPayload,
    captureEmail: input.captureEmailRecommended,
    captureEmailMessage: input.captureEmailRecommended ? input.captureEmailMessage : null,
    message: assistantMessage,
    response: assistantMessage,
  };

  if (input.persistenceAvailable) {
    try {
      await saveConversationMessage({
        conversationId: input.conversationId,
        userId: input.userId,
        role: "assistant",
        content: assistantMessage,
      });
    } catch (dbError: unknown) {
      logError("DB", dbError, { route: "/api/chat", userId: input.userId, stage: "action_lock_persistence" });
    }
  }

  return { intercepted: true, data: payload };
}

// ─── Crisis ───────────────────────────────────────────────────────────────────

export async function interceptCrisis(input: InterceptInput): Promise<InterceptResult> {
  if (!input.crisisMode) return { intercepted: false };

  const containmentLevel: RiskLevel = input.riskLevel === "high" || input.riskLevel === "critical"
    ? input.riskLevel
    : "high";

  const crisisPayload = getCrisisResponse(containmentLevel);

  await registerCrisisEvent({
    userId: input.userId,
    level: containmentLevel,
    message: input.message,
    response: crisisPayload.response,
  });
  await sendCrisisEscalationAlert({ userId: input.userId, level: containmentLevel, message: input.message });

  if (input.persistenceAvailable) {
    try {
      await saveConversationMessage({
        conversationId: input.conversationId,
        userId: input.userId,
        role: "assistant",
        content: crisisPayload.response,
      });
    } catch (dbError: unknown) {
      logError("DB", dbError, { route: "/api/chat", userId: input.userId, stage: "crisis_persistence" });
    }
  }

  logInfo("RISK", "crisis_mode_activated", {
    userId: input.userId,
    conversationId: input.conversationId,
    riskLevel: input.riskLevel,
    containmentLevel,
    crisisSource: input.crisisSource,
    crisisActiveUntil: input.crisisActiveUntil,
  });

  return {
    intercepted: true,
    data: {
      success: true,
      type: "crisis",
      response: crisisPayload.response,
      state: input.state,
      systemState: "CRISIS",
      decision: generateDomainDecision("CRISIS", buildChatInsight({ crisisCount: 1, checkinDrop: 1, retentionDay3: 0.1, retentionDay7: 0.1 })),
      conversationId: input.conversationId,
      goal: null,
      emotionalProfile: input.emotionalProfile,
      fallback: true,
      persistenceAvailable: input.persistenceAvailable,
      crisis: true,
      continueChat: crisisPayload.continueChat,
      riskLevel: containmentLevel,
      detectedRiskLevel: input.riskLevel,
      crisisActive: true,
      crisisActiveUntil: input.crisisActiveUntil,
      searchUsed: false,
      flow: serializeFlow(input.flowContext),
      alerts: crisisPayload.resources,
      legalFlag: crisisPayload.legalFlag,
      legalDisclaimer: crisisPayload.disclaimer,
    },
  };
}

// ─── Transitional Void ────────────────────────────────────────────────────────

export async function interceptTransitionalVoid(input: InterceptInput): Promise<InterceptResult> {
  if (input.domainState !== "TRANSITIONAL_VOID" || input.crisisMode) {
    return { intercepted: false };
  }

  const tvResponse =
    `No estás perdido.\n\nEstás en una transición.\n\n` +
    `El problema no es que no sepas qué hacer.\n` +
    `Es que estás intentando decidir demasiado pronto.\n\n` +
    `Vamos a hacer algo simple.\n\n` +
    `Escribe:\n→ qué parte de tu vida ya no encaja contigo`;

  void trackSafe({
    userId: input.userId,
    type: "TRANSITIONAL_VOID_DETECTED",
    metadata: { conversationId: input.conversationId, state: input.state },
  });

  const n8nWebhook = process.env.N8N_TRANSITIONAL_VOID_WEBHOOK;
  if (n8nWebhook) {
    void fetch(n8nWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: input.userId, state: "TRANSITIONAL_VOID" }),
    }).catch(() => {});
  }

  if (input.persistenceAvailable) {
    try {
      const { getPrismaClient } = await import("@/db/prisma");
      const prisma = getPrismaClient();
      await Promise.all([
        saveConversationMessage({
          conversationId: input.conversationId,
          userId: input.userId,
          role: "assistant",
          content: tvResponse,
        }),
        prisma.userState.upsert({
          where: { userId: input.userId },
          update: { systemState: "TRANSITIONAL_VOID" },
          create: { userId: input.userId, state: input.state, systemState: "TRANSITIONAL_VOID" },
        }),
      ]);
    } catch {
      // non-critical
    }
  }

  return {
    intercepted: true,
    data: {
      success: true,
      type: "transitional_void",
      response: tvResponse,
      state: input.state,
      systemState: "TRANSITIONAL_VOID",
      decision: input.domainDecision,
      conversationId: input.conversationId,
      goal: serializeGoal(input.activeGoal),
      emotionalProfile: input.emotionalProfile,
      persistenceAvailable: input.persistenceAvailable,
      fallback: false,
      searchUsed: false,
      flow: serializeFlow(input.flowContext),
    },
  };
}
