/**
 * Phase 2: ENRICH
 *
 * Async DB-heavy phase. Loads conversation, history, active goal,
 * emotional profile, avoidance state, transformation phase, and builds
 * the initial domain insight/state/decision. All database work is wrapped
 * in a single try/catch so a DB outage degrades gracefully to
 * `persistenceAvailable: false` without losing the analysis already done.
 */

import { logError, logInfo } from "@/lib/logger";
import { sendAvoidanceEscalationAlert } from "@/lib/alerts";
import { generateDecision as generateDomainDecision } from "@/domain/decisionEngine";
import type {
  Decision as DomainDecision,
  Insight as DomainInsight,
  SystemState,
  UserState,
} from "@/domain/types";
import { buildUserState } from "@/domain/userStateEngine";
import { trackSafe } from "@/services/events";
import { buildActionRequiredMessage } from "@/services/coach";
import {
  countMessagesForConversation,
  ensureUserSession,
  listMessagesForConversation,
  listRecentUserMessagesForUser,
  resolveConversationForUser,
  saveConversationMessage,
} from "@/services/conversation";
import { upsertDailyImpulseLog } from "@/services/impulse-challenges";
import {
  countPendingActions,
  completeFirstPendingActionForUser,
  createGoalFromIntentMessage,
  detectActionCompletionIntent,
  detectActionPostponeIntent,
  detectActionRefusalIntent,
  detectAvoidance,
  getFirstPendingAction,
  getActiveGoalForUser,
  getAvoidanceCountForAction,
  getAvoidanceStreakForUser,
  registerAvoidanceEvent,
} from "@/services/goals";
import { getMentorMode, shouldAskForEmail } from "@/services/mentor-protocol";
import { getConversationalOnboarding } from "@/services/onboarding";
import { analyzeEmotionalProfile, updateEmotionalProfile } from "@/services/emotional-model";
import { type RiskLevel } from "@/services/risk";
import {
  activateUserCrisis,
  clearUserCrisis,
  getUserCrisisStatus,
  shouldBypassActionLock,
  updateUserTransformationPhase,
  updateUserState,
} from "@/services/state";
import { describeTransformationPhase, inferTransformationPhase } from "@/services/transformation";
import { getUserSessionProfile } from "@/services/user";
import { resolveCommunityCta, type CommunityCtaAction } from "@/services/community-cta";
import { resolveAskCommunityCta, type AskCommunityCtaAction } from "@/services/ask-community-cta";
import { isCrisisInterventionMessage, isCrisisLevel, mapRiskLevelToCrisisCount } from "./analyze";
import type { FlowContext } from "./types";

// ─── Local helpers ────────────────────────────────────────────────────────────

function buildChatInsight(params: {
  retentionDay3?: number;
  retentionDay7?: number;
  checkinDrop?: number;
  avoidanceRate?: number;
  actionCompletionRate?: number;
  crisisCount?: number;
  confusionScore?: number;
  identityShift?: boolean;
  directionClarity?: number;
}): DomainInsight {
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

// ─── Input / Output types ─────────────────────────────────────────────────────

export type EnrichInput = {
  userId: string;
  message: string;
  conversationIdHint: string | undefined;
  state: UserState;
  detectedIntent: string;
  riskLevel: RiskLevel;
  tvSignals: { confusionScore: number; identityShift: boolean; directionClarity: number };
  flowContext: FlowContext;
  crisisMode: boolean;
  crisisSource: "detected" | "active_state" | "none";
  crisisActiveUntil: string | null;
};

export type EnrichResult = {
  persistenceAvailable: boolean;
  conversationId: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  conversationMessageCount: number;
  emotionalProfile: ReturnType<typeof analyzeEmotionalProfile>;

  // Crisis (possibly mutated)
  crisisMode: boolean;
  crisisSource: "detected" | "active_state" | "none";
  crisisActiveUntil: string | null;

  // Goals & avoidance
  activeGoal: Awaited<ReturnType<typeof getActiveGoalForUser>> | null;
  goalAvoidanceCount: number;
  goalAvoidanceStreak: number;
  goalPendingActionsCount: number;
  goalCreatedThisTurn: boolean;
  actionGeneratedThisTurn: boolean;
  actionCompletedThisTurn: boolean;
  avoidanceDetectedThisTurn: boolean;
  completionMicroFeedback: string | null;

  // Action lock
  actionLockPayload: Record<string, unknown> | null;
  actionLockAssistantMessage: string | null;

  // Domain engine
  domainInsight: DomainInsight;
  domainState: SystemState;
  domainDecision: DomainDecision;

  // Transformation & mentor
  transformationPhase: ReturnType<typeof inferTransformationPhase>;
  transformationSummary: string;
  mentorMode: ReturnType<typeof getMentorMode>;
  onboardingContext: ReturnType<typeof getConversationalOnboarding>;

  // Conversion & capture
  conversionTrigger: boolean;
  captureEmailRecommended: boolean;

  // Community CTA (null unless a recurrent-blocker or ask-community signal fires)
  communityCTA: CommunityCtaAction | AskCommunityCtaAction | null;
};

// ─── Main phase function ──────────────────────────────────────────────────────

export async function enrichContext(input: EnrichInput): Promise<EnrichResult> {
  const {
    userId,
    message,
    conversationIdHint,
    state,
    detectedIntent,
    riskLevel,
    tvSignals,
    flowContext,
  } = input;

  // ── Initial defaults (visible when DB fails early) ──────────────────────
  const avoidanceDetectedThisTurn = detectAvoidance(message);

  let crisisMode = input.crisisMode;
  let crisisSource: "detected" | "active_state" | "none" = input.crisisSource;
  let crisisActiveUntil: string | null = input.crisisActiveUntil;

  let persistenceAvailable = true;
  let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  let activeGoal: Awaited<ReturnType<typeof getActiveGoalForUser>> | null = null;
  let conversationId = conversationIdHint?.trim() || `tmp_${Date.now()}`;
  let conversationMessageCount = 0;

  let emotionalProfile!: ReturnType<typeof analyzeEmotionalProfile>;

  let goalAvoidanceCount = 0;
  let goalAvoidanceStreak = 0;
  let goalPendingActionsCount = 0;
  let goalCreatedThisTurn = false;
  let actionGeneratedThisTurn = false;
  let completionMicroFeedback: string | null = null;
  let actionCompletedThisTurn = false;

  let conversionTrigger = state === "claridad";
  let domainInsight = buildChatInsight({
    crisisCount: mapRiskLevelToCrisisCount(riskLevel),
    ...tvSignals,
  });
  let domainState: SystemState = buildUserState(domainInsight);
  let domainDecision: DomainDecision = generateDomainDecision(domainState, domainInsight);

  let transformationPhase: ReturnType<typeof inferTransformationPhase> = "bloqueo";
  let transformationSummary = "";
  let mentorMode: ReturnType<typeof getMentorMode> = {
    mode: "supportive",
    validate: true,
    confront: false,
    pushAction: false,
    stopConversation: false,
    reason: "pending_db",
  };
  let onboardingContext = getConversationalOnboarding({
    state,
    intent: detectedIntent,
    hasGoal: false,
    pendingActionsCount: 0,
    conversationMessageCount: 0,
    goalCreatedThisTurn: false,
    actionGeneratedThisTurn: false,
  });
  let captureEmailRecommended = false;

  let actionLockPayload: Record<string, unknown> | null = null;
  let actionLockAssistantMessage: string | null = null;

  // ── DB + async enrichment ──────────────────────────────────────────────
  try {
    await ensureUserSession(userId);
    await updateUserState(userId, state);

    if (isCrisisInterventionMessage(message)) {
      await clearUserCrisis(userId);
      logInfo("RISK", "crisis_intervention_detected", { userId });
    }

    const currentCrisisStatus = await getUserCrisisStatus(userId);
    if (currentCrisisStatus.active) {
      crisisMode = true;
      crisisSource = "active_state";
      crisisActiveUntil = currentCrisisStatus.expiresAt;
    }

    if (isCrisisLevel(riskLevel)) {
      const activeUntil = await activateUserCrisis(userId);
      crisisMode = true;
      crisisSource = "detected";
      crisisActiveUntil = activeUntil.toISOString();
      await trackSafe({
        userId,
        type: "CRISIS_DETECTED",
        metadata: {
          riskLevel,
          source: "detected",
          activatedAt: new Date().toISOString(),
          expiresAt: activeUntil.toISOString(),
        },
      });
    }

    const conversation = await resolveConversationForUser(userId, conversationIdHint, message);
    conversationId = conversation.id;
    const isNewConversationTitle = conversation.title === "Nueva conversación";

    logInfo("DB", "conversation_resolved", {
      userId,
      conversationId,
      requestedConversationId: conversationIdHint ?? null,
    });

    await saveConversationMessage({
      conversationId,
      userId,
      role: "user",
      content: message,
      updateTitleFromUserMessage: isNewConversationTitle,
    });
    logInfo("DB", "message_saved", { userId, conversationId, role: "user" });

    try {
      const msgs = await listMessagesForConversation({ userId, conversationId });
      if (msgs && msgs.length > 1) {
        conversationHistory = msgs
          .slice(0, -1)
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }));
      }
    } catch {
      // history is optional; continue without it
    }

    await trackSafe({
      userId,
      type: "MESSAGE_SENT",
      metadata: { conversationId, messageLength: message.length, intent: detectedIntent },
    });

    if (state === "claridad") {
      await trackSafe({
        userId,
        type: "MESSAGE_RECEIVED",
        metadata: { source: "clarity_state", signal: "value_moment", conversationId },
      });
    }

    conversationMessageCount = await countMessagesForConversation(conversationId);

    try {
      const userMessageHistory = await listRecentUserMessagesForUser(userId, 16);
      emotionalProfile = analyzeEmotionalProfile(message, userMessageHistory.slice(0, -1));
      await updateEmotionalProfile(userId, emotionalProfile);
    } catch (emotionalError: unknown) {
      emotionalProfile = analyzeEmotionalProfile(message, []);
      logError("EMOTION", emotionalError, {
        route: "/api/chat",
        userId,
        stage: "update_emotional_profile",
      });
    }

    await upsertDailyImpulseLog({
      userId,
      note: message,
      emotionalState: state,
      mood: null,
      incrementMessage: true,
    }).catch((err: unknown) =>
      logError("IMPULSE", err, { route: "/api/chat", userId, stage: "upsert_daily_log" })
    );

    if (!crisisMode) {
      activeGoal = await getActiveGoalForUser(userId);
      let pendingAction = getFirstPendingAction(activeGoal);
      const pendingActionBeforeTurn = pendingAction;
      goalPendingActionsCount = countPendingActions(activeGoal);

      if (pendingAction) {
        goalAvoidanceCount = await getAvoidanceCountForAction(userId, pendingAction.id);
      }
      goalAvoidanceStreak = await getAvoidanceStreakForUser(userId);

      const repeatedPattern =
        conversationMessageCount > 3 &&
        (emotionalProfile.dominantPattern === "evita_decidir" ||
          emotionalProfile.dominantPattern === "procrastinación");

      transformationPhase = inferTransformationPhase({
        state,
        intent: detectedIntent,
        hasGoal: Boolean(activeGoal),
        totalActions: activeGoal?.totalCount ?? 0,
        pendingActionsCount: goalPendingActionsCount,
        completedActionsCount: activeGoal?.completedCount ?? 0,
        avoidanceCount: goalAvoidanceCount,
        conversationMessageCount,
      });
      transformationSummary = describeTransformationPhase(transformationPhase);
      mentorMode = getMentorMode({
        state,
        riskLevel,
        transformationPhase,
        activeGoal: Boolean(activeGoal),
        pendingActionsCount: goalPendingActionsCount,
        avoidanceCount: goalAvoidanceCount,
        avoidanceStreak: goalAvoidanceStreak,
        avoidanceDetected: avoidanceDetectedThisTurn,
        repeatedPattern,
        conversationMessageCount,
        progressTrend: emotionalProfile.progressTrend,
      });

      if (pendingAction) {
        const completionIntent = detectActionCompletionIntent(message);
        const postponeIntent = detectActionPostponeIntent(message);
        const refusalIntent = detectActionRefusalIntent(message);
        const sidestepAvoidance = avoidanceDetectedThisTurn && !completionIntent;

        if (completionIntent) {
          const progressedGoal = await completeFirstPendingActionForUser(userId);
          activeGoal = progressedGoal ?? activeGoal;
          pendingAction = getFirstPendingAction(activeGoal);
          goalPendingActionsCount = countPendingActions(activeGoal);
          actionCompletedThisTurn = true;
          completionMicroFeedback = pendingAction
            ? `Bien. Has avanzado. Siguiente paso: ${pendingAction.description}`
            : "Bien. Has avanzado. Siguiente paso: consolida este avance hoy con una evidencia concreta.";

          if (activeGoal) {
            logInfo("STATE", "goal_action_auto_completed", { userId, goalId: activeGoal.id });
            await trackSafe({
              userId,
              type: "ACTION_COMPLETED",
              metadata: {
                actionId: pendingActionBeforeTurn?.id,
                actionDescription: pendingActionBeforeTurn?.description,
                goalId: activeGoal.id,
                goalTitle: activeGoal.title,
                completedCount: activeGoal.completedCount,
                totalCount: activeGoal.totalCount,
                conversationId,
              },
            });
          }
        } else {
          if (postponeIntent) {
            goalAvoidanceCount = await registerAvoidanceEvent({
              userId,
              actionId: pendingAction.id,
              type: "postpone",
            });
            await sendAvoidanceEscalationAlert({
              userId,
              type: "postpone",
              count: goalAvoidanceCount,
              actionTitle: pendingAction.description,
              goalTitle: activeGoal?.title ?? null,
            });
          } else if (refusalIntent) {
            goalAvoidanceCount = await registerAvoidanceEvent({
              userId,
              actionId: pendingAction.id,
              type: "refuse",
            });
            await sendAvoidanceEscalationAlert({
              userId,
              type: "refuse",
              count: goalAvoidanceCount,
              actionTitle: pendingAction.description,
              goalTitle: activeGoal?.title ?? null,
            });
          } else if (sidestepAvoidance) {
            goalAvoidanceCount = await registerAvoidanceEvent({
              userId,
              actionId: pendingAction.id,
              type: "avoidance",
            });
            await sendAvoidanceEscalationAlert({
              userId,
              type: "avoidance",
              count: goalAvoidanceCount,
              actionTitle: pendingAction.description,
              goalTitle: activeGoal?.title ?? null,
            });
          }

          if (!shouldBypassActionLock(state)) {
            await trackSafe({
              userId,
              type: "AVOIDANCE_DETECTED",
              metadata: { actionId: pendingAction.id, reason: "not_completed", conversationId },
            });
            actionLockAssistantMessage = buildActionRequiredMessage({
              actionTitle: pendingAction.description,
              goalTitle: activeGoal?.title ?? null,
              avoidanceCount: goalAvoidanceCount,
              unfinishedActionsCount: goalPendingActionsCount,
              mentorMode,
            });
            actionLockPayload = {
              success: true,
              type: "action_required",
              message: actionLockAssistantMessage,
              response: actionLockAssistantMessage,
              state,
              conversationId,
              goal: serializeGoal(activeGoal),
              emotionalProfile,
              fallback: true,
              persistenceAvailable,
              searchUsed: false,
              flow: serializeFlow(flowContext),
              mentorMode: mentorMode.mode,
              transformationPhase,
              captureEmail: false,
              captureEmailMessage: null,
              action: { id: pendingAction.id, title: pendingAction.description },
            };
          }
        }
      }

      if (
        !actionCompletedThisTurn &&
        !actionLockPayload &&
        pendingAction &&
        !shouldBypassActionLock(state)
      ) {
        actionLockAssistantMessage = buildActionRequiredMessage({
          actionTitle: pendingAction.description,
          goalTitle: activeGoal?.title ?? null,
          avoidanceCount: goalAvoidanceCount,
          unfinishedActionsCount: goalPendingActionsCount,
          mentorMode,
        });
        actionLockPayload = {
          success: true,
          type: "action_required",
          message: actionLockAssistantMessage,
          response: actionLockAssistantMessage,
          state,
          conversationId,
          goal: serializeGoal(activeGoal),
          emotionalProfile,
          fallback: true,
          persistenceAvailable,
          searchUsed: false,
          flow: serializeFlow(flowContext),
          mentorMode: mentorMode.mode,
          transformationPhase,
          captureEmail: false,
          captureEmailMessage: null,
          action: { id: pendingAction.id, title: pendingAction.description },
        };
      }

      if (!activeGoal || activeGoal.status !== "active") {
        const goalIntentResult = await createGoalFromIntentMessage({ userId, message });
        activeGoal = goalIntentResult?.goal ?? activeGoal;
        goalPendingActionsCount = countPendingActions(activeGoal);
        if (goalIntentResult?.created) {
          goalCreatedThisTurn = true;
          logInfo("STATE", "goal_created_from_intent", {
            userId,
            goalId: goalIntentResult.goal.id,
          });
          await trackSafe({
            userId,
            type: "GOAL_CREATED",
            metadata: {
              goalId: goalIntentResult.goal.id,
              goalTitle: goalIntentResult.goal.title,
              actionCount: goalIntentResult.goal.totalCount,
              conversationId,
            },
          });
        }
      }

      const pendingActionAfterGoalResolution = getFirstPendingAction(activeGoal);
      actionGeneratedThisTurn = Boolean(
        pendingActionAfterGoalResolution && (!pendingAction || goalCreatedThisTurn)
      );

      if (actionGeneratedThisTurn && pendingActionAfterGoalResolution) {
        await trackSafe({
          userId,
          type: "ACTION_CREATED",
          metadata: {
            actionId: pendingActionAfterGoalResolution.id,
            actionText: pendingActionAfterGoalResolution.description,
            goalId: activeGoal?.id,
            conversationId,
            source: "chat",
          },
        });
      }

      transformationPhase = inferTransformationPhase({
        state,
        intent: detectedIntent,
        hasGoal: Boolean(activeGoal),
        totalActions: activeGoal?.totalCount ?? 0,
        pendingActionsCount: goalPendingActionsCount,
        completedActionsCount: activeGoal?.completedCount ?? 0,
        avoidanceCount: goalAvoidanceCount,
        conversationMessageCount,
      });
      transformationSummary = describeTransformationPhase(transformationPhase);
      mentorMode = getMentorMode({
        state,
        riskLevel,
        transformationPhase,
        activeGoal: Boolean(activeGoal),
        pendingActionsCount: goalPendingActionsCount,
        avoidanceCount: goalAvoidanceCount,
        avoidanceStreak: goalAvoidanceStreak,
        avoidanceDetected: avoidanceDetectedThisTurn,
        repeatedPattern,
        conversationMessageCount,
        progressTrend: emotionalProfile.progressTrend,
      });
      conversionTrigger = goalCreatedThisTurn || actionGeneratedThisTurn || state === "claridad";
      onboardingContext = getConversationalOnboarding({
        state,
        intent: detectedIntent,
        hasGoal: Boolean(activeGoal),
        pendingActionsCount: goalPendingActionsCount,
        conversationMessageCount,
        goalCreatedThisTurn,
        actionGeneratedThisTurn,
      });

      const sessionProfile = await getUserSessionProfile(userId);
      captureEmailRecommended = shouldAskForEmail({
        isAnonymous: sessionProfile.isAnonymous,
        goalCount: activeGoal ? 1 : 0,
        actionCount: activeGoal?.totalCount ?? 0,
        conversationMessageCount,
        conversionTrigger,
      });
      await updateUserTransformationPhase(userId, transformationPhase);

      const totalActions = activeGoal?.totalCount ?? 0;
      const completedActions = activeGoal?.completedCount ?? 0;
      const pendingActions = Math.max(totalActions - completedActions, 0);
      const actionCompletionRate = totalActions > 0 ? completedActions / totalActions : 0;
      const avoidanceRate =
        totalActions > 0 ? Math.min(1, goalAvoidanceCount / Math.max(totalActions, 1)) : 0;
      const checkinDropProxy = Math.min(1, pendingActions / Math.max(totalActions, 1));

      domainInsight = buildChatInsight({
        retentionDay3: transformationPhase === "bloqueo" ? 0.3 : 0.55,
        retentionDay7: transformationPhase === "accion" ? 0.7 : 0.5,
        checkinDrop: checkinDropProxy,
        avoidanceRate,
        actionCompletionRate,
        crisisCount: mapRiskLevelToCrisisCount(riskLevel),
        ...tvSignals,
      });
      domainState = buildUserState(domainInsight);
      domainDecision = generateDomainDecision(domainState, domainInsight);
    }
  } catch (dbError: unknown) {
    persistenceAvailable = false;
    logError("DB", dbError, { route: "/api/chat", userId, stage: "pre_ai_persistence" });
  }

  // If emotionalProfile was never assigned (DB failed before the try that
  // sets it), fall back to a fresh analysis without history so the rest of
  // the pipeline always has a valid profile.
  if (!emotionalProfile) {
    emotionalProfile = analyzeEmotionalProfile(message, []);
  }

  // Community CTA — only when DB is available; fails closed on any error.
  // Priority: recurrent-blocker (weekly pattern) over ask-community (per-turn).
  // Only one CTA per turn to avoid noise in the chat.
  let communityCTA: CommunityCtaAction | AskCommunityCtaAction | null = null;
  if (persistenceAvailable) {
    communityCTA = await resolveCommunityCta({ userId, crisisMode });
    if (!communityCTA) {
      communityCTA = resolveAskCommunityCta({ userId, message, crisisMode });
    }
  }

  return {
    persistenceAvailable,
    conversationId,
    conversationHistory,
    conversationMessageCount,
    emotionalProfile,
    crisisMode,
    crisisSource,
    crisisActiveUntil,
    activeGoal,
    goalAvoidanceCount,
    goalAvoidanceStreak,
    goalPendingActionsCount,
    goalCreatedThisTurn,
    actionGeneratedThisTurn,
    actionCompletedThisTurn,
    avoidanceDetectedThisTurn,
    completionMicroFeedback,
    actionLockPayload,
    actionLockAssistantMessage,
    domainInsight,
    domainState,
    domainDecision,
    transformationPhase,
    transformationSummary,
    mentorMode,
    onboardingContext,
    conversionTrigger,
    captureEmailRecommended,
    communityCTA,
  };
}
