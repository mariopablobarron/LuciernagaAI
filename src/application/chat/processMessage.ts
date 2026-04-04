import { generateDecision as generateDomainDecision } from "@/domain/decisionEngine";
import type {
  Decision as DomainDecision,
  Insight as DomainInsight,
  SystemState,
} from "@/domain/types";
import { buildUserState } from "@/domain/userStateEngine";
import { sendAvoidanceEscalationAlert, sendCrisisEscalationAlert } from "@/lib/alerts";
import { logError, logInfo } from "@/lib/logger";
import { generateAIResponse, streamOpenRouterTokens } from "@/services/ai";
import { generateImpulseResponse } from "@/services/impulse-ai";
import { trackSafe } from "@/services/events";
import {
  appendCaptureEmailPrompt,
  appendConversionPrompt,
  finalizeLuciernagaResponse,
  appendSoftPaywallPrompt,
  buildActionRequiredMessage,
  buildCoachPrompt,
} from "@/services/coach";
import {
  countMessagesForConversation,
  ensureUserSession,
  listMessagesForConversation,
  listRecentUserMessagesForUser,
  resolveConversationForUser,
  saveConversationMessage,
} from "@/services/conversation";
import { listRecentImpulseLogs, upsertDailyImpulseLog } from "@/services/impulse-challenges";
import { getUserImpulseProfile } from "@/services/impulse-diagnostic";
import {
  buildGoalCoachContext,
  countPendingActions,
  completeFirstPendingActionForUser,
  createGoalFromIntentMessage,
  detectActionCompletionIntent,
  detectAvoidance,
  detectActionPostponeIntent,
  detectActionRefusalIntent,
  getFirstPendingAction,
  getActiveGoalForUser,
  getAvoidanceCountForAction,
  getAvoidanceStreakForUser,
  registerAvoidanceEvent,
} from "@/services/goals";
import { runFlow, loadDialogueState, saveDialogueState } from "@/services/flows";
import { detectIntent } from "@/services/intent";
import { getMentorMode, shouldAskForEmail } from "@/services/mentor-protocol";
import { getConversationalOnboarding } from "@/services/onboarding";
import { analyzeEmotionalProfile, updateEmotionalProfile } from "@/services/emotional-model";
import {
  buildSearchQuery,
  classifyExternalInfoNeed,
  needsExternalInfo,
  searchWeb,
} from "@/services/search";
import {
  detectRiskLevel,
  getCrisisResponse,
  registerCrisisEvent,
  type RiskLevel,
} from "@/services/risk";
import {
  activateUserCrisis,
  buildConversationContext,
  clearUserCrisis,
  detectUserState,
  getUserCrisisStatus,
  shouldBypassActionLock,
  updateUserTransformationPhase,
  updateUserState,
} from "@/services/state";
import { describeTransformationPhase, inferTransformationPhase } from "@/services/transformation";
import { getUserSessionProfile } from "@/services/user";

export interface SessionContext {
  isAnonymous: boolean;
  hasPlan: boolean;
  userPlan: "free" | "pro";
  messageLimitPerDay: number | null;
  messagesUsedToday: number;
  planLabel: string;
  subscriptionStatus: string;
}

export interface ProcessMessageInput {
  userId: string;
  message: string;
  conversationId?: string;
  session: SessionContext;
  jsonMode: boolean;
}

export type ProcessMessageResult =
  | { stream: ReadableStream; meta: Record<string, unknown> }
  | { data: Record<string, unknown> };

// ─── helpers ───────────────────────────────────────────────────────────────

function isCrisisLevel(level: RiskLevel): level is "high" | "critical" {
  return level === "high" || level === "critical";
}

function isCrisisInterventionMessage(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const signals = [
    "ya hable con",
    "ya pedi ayuda",
    "ya contacte",
    "ya llame al 112",
    "ya llame al 911",
    "estoy con mi familia",
    "estoy acompanado",
    "estoy acompañado",
    "ya estoy seguro",
  ];
  return signals.some((s) => normalized.includes(s));
}

function mapRiskLevelToCrisisCount(level: RiskLevel): number {
  return level === "high" || level === "critical" ? 1 : 0;
}

function buildChatInsight(params: {
  retentionDay3?: number;
  retentionDay7?: number;
  checkinDrop?: number;
  avoidanceRate?: number;
  actionCompletionRate?: number;
  crisisCount?: number;
}): DomainInsight {
  return {
    retentionDay3: params.retentionDay3 ?? 0.5,
    retentionDay7: params.retentionDay7 ?? 0.5,
    checkinDrop: params.checkinDrop ?? 0.4,
    avoidanceRate: params.avoidanceRate ?? 0,
    actionCompletionRate: params.actionCompletionRate ?? 0.4,
    crisisCount: params.crisisCount ?? 0,
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

function serializeFlow(flow: {
  currentIntent: string;
  currentStep: number;
  activeFlow: string | null;
  instruction: string | null;
}) {
  return {
    currentIntent: flow.currentIntent,
    currentStep: flow.currentStep,
    activeFlow: flow.activeFlow,
    instruction: flow.instruction,
  };
}

// ─── main use case ─────────────────────────────────────────────────────────

export async function processMessage(input: ProcessMessageInput): Promise<ProcessMessageResult> {
  const { userId, message, session, jsonMode } = input;

  const remainingMessagesAfterTurn =
    session.messageLimitPerDay === null
      ? null
      : Math.max(0, session.messageLimitPerDay - (session.messagesUsedToday + 1));

  const softPaywallActive =
    !session.hasPlan && remainingMessagesAfterTurn !== null && remainingMessagesAfterTurn <= 2;

  // ── 1. Quick synchronous analysis ──────────────────────────────────────
  const state = detectUserState(message);
  const detectedIntent = detectIntent(message);
  const riskLevel = detectRiskLevel(message);
  let emotionalProfile = analyzeEmotionalProfile(message, []);
  const dialogueState = loadDialogueState(userId);
  const flowContext = runFlow({ ...dialogueState, currentIntent: detectedIntent }, message);
  saveDialogueState(userId, {
    currentIntent: flowContext.currentIntent,
    currentStep: flowContext.currentStep,
    activeFlow: flowContext.activeFlow,
  });

  let crisisMode = isCrisisLevel(riskLevel);
  let crisisActiveUntil: string | null = null;
  let crisisSource: "detected" | "active_state" | "none" = crisisMode ? "detected" : "none";

  logInfo("STATE", "state_detected", {
    userId,
    state,
    intent: detectedIntent,
    activeFlow: flowContext.activeFlow,
    flowStep: flowContext.currentStep,
    messageLength: message.length,
  });
  logInfo("RISK", "risk_level_detected", { userId, riskLevel, crisisMode });

  // ── 2. Mutable state for DB phase ──────────────────────────────────────
  let persistenceAvailable = true;
  let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  let activeGoal: Awaited<ReturnType<typeof getActiveGoalForUser>> | null = null;
  let searchResults: Awaited<ReturnType<typeof searchWeb>> = [];
  let searchQuery: string | null = null;
  let conversationId = input.conversationId?.trim() || `tmp_${Date.now()}`;
  let goalAvoidanceCount = 0;
  let goalAvoidanceStreak = 0;
  let goalPendingActionsCount = 0;
  let goalCreatedThisTurn = false;
  let actionGeneratedThisTurn = false;
  const avoidanceDetectedThisTurn = detectAvoidance(message);
  let completionMicroFeedback: string | null = null;
  let actionCompletedThisTurn = false;
  let conversationMessageCount = 0;
  let conversionTrigger = state === "claridad";
  let domainInsight = buildChatInsight({ crisisCount: mapRiskLevelToCrisisCount(riskLevel) });
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
  const captureEmailMessage = "¿Quieres guardar tu progreso y continuar otro día? Déjame tu email.";
  let actionLockPayload: Record<string, unknown> | null = null;
  let actionLockAssistantMessage: string | null = null;

  // ── 3. DB + async enrichment ────────────────────────────────────────────
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

    const conversation = await resolveConversationForUser(userId, input.conversationId, message);
    conversationId = conversation.id;
    const isNewConversationTitle = conversation.title === "Nueva conversación";

    logInfo("DB", "conversation_resolved", {
      userId,
      conversationId,
      requestedConversationId: input.conversationId ?? null,
    });

    await saveConversationMessage({
      conversationId,
      userId,
      role: "user",
      content: message,
      updateTitleFromUserMessage: isNewConversationTitle,
    });
    logInfo("DB", "message_saved", { userId, conversationId, role: "user" });

    // Load last 8 turns of conversation history (excluding the just-saved message)
    try {
      const msgs = await listMessagesForConversation({ userId, conversationId });
      if (msgs && msgs.length > 1) {
        conversationHistory = msgs
          .slice(0, -1) // exclude current user message (just saved)
          .slice(-8)    // keep last 8 turns max
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
      });
      domainState = buildUserState(domainInsight);
      domainDecision = generateDomainDecision(domainState, domainInsight);
    }
  } catch (dbError: unknown) {
    persistenceAvailable = false;
    logError("DB", dbError, { route: "/api/chat", userId, stage: "pre_ai_persistence" });
  }

  const conversionType = conversionTrigger ? "progress" : undefined;
  const softPaywallPrompt = softPaywallActive && (conversionTrigger || Boolean(activeGoal));

  // ── 4. Action lock response ─────────────────────────────────────────────
  if (actionLockPayload && actionLockAssistantMessage) {
    if (captureEmailRecommended) {
      actionLockAssistantMessage = appendCaptureEmailPrompt(
        actionLockAssistantMessage,
        captureEmailRecommended
      );
    }
    actionLockPayload = {
      ...actionLockPayload,
      captureEmail: captureEmailRecommended,
      captureEmailMessage: captureEmailRecommended ? captureEmailMessage : null,
      message: actionLockAssistantMessage,
      response: actionLockAssistantMessage,
    };

    if (persistenceAvailable) {
      try {
        await saveConversationMessage({
          conversationId,
          userId,
          role: "assistant",
          content: actionLockAssistantMessage,
        });
        logInfo("DB", "message_saved", {
          userId,
          conversationId,
          role: "assistant",
          actionLock: true,
        });
      } catch (dbError: unknown) {
        persistenceAvailable = false;
        logError("DB", dbError, { route: "/api/chat", userId, stage: "action_lock_persistence" });
        actionLockPayload = { ...actionLockPayload, persistenceAvailable };
      }
    }

    return { data: actionLockPayload };
  }

  // ── 5. Crisis response ─────────────────────────────────────────────────
  if (crisisMode) {
    const containmentLevel: RiskLevel = isCrisisLevel(riskLevel) ? riskLevel : "high";
    const crisisPayload = getCrisisResponse(containmentLevel);

    await registerCrisisEvent({
      userId,
      level: containmentLevel,
      message,
      response: crisisPayload.response,
    });
    await sendCrisisEscalationAlert({ userId, level: containmentLevel, message });

    if (persistenceAvailable) {
      try {
        await saveConversationMessage({
          conversationId,
          userId,
          role: "assistant",
          content: crisisPayload.response,
        });
        logInfo("DB", "message_saved", {
          userId,
          conversationId,
          role: "assistant",
          crisisMode: true,
        });
      } catch (dbError: unknown) {
        persistenceAvailable = false;
        logError("DB", dbError, {
          route: "/api/chat",
          userId,
          stage: "crisis_response_persistence",
        });
      }
    }

    logInfo("RISK", "crisis_mode_activated", {
      userId,
      conversationId,
      riskLevel,
      containmentLevel,
      crisisSource,
      crisisActiveUntil,
    });

    return {
      data: {
        success: true,
        type: "crisis",
        response: crisisPayload.response,
        state,
        systemState: "CRISIS",
        decision: generateDomainDecision(
          "CRISIS",
          buildChatInsight({
            crisisCount: 1,
            checkinDrop: 1,
            retentionDay3: 0.1,
            retentionDay7: 0.1,
          })
        ),
        conversationId,
        goal: null,
        emotionalProfile,
        fallback: true,
        persistenceAvailable,
        crisis: true,
        continueChat: crisisPayload.continueChat,
        riskLevel: containmentLevel,
        detectedRiskLevel: riskLevel,
        crisisActive: true,
        crisisActiveUntil,
        searchUsed: false,
        flow: serializeFlow(flowContext),
        alerts: crisisPayload.resources,
        legalFlag: crisisPayload.legalFlag,
        legalDisclaimer: crisisPayload.disclaimer,
      },
    };
  }

  // ── 6. AI key guard ────────────────────────────────────────────────────
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    logError("AI", new Error("Missing OPENROUTER_API_KEY"), { route: "/api/chat" });
    throw new Error("MISSING_OPENROUTER_API_KEY");
  }

  logInfo("AI", "openrouter_call_requested", {
    userId,
    conversationId,
    state,
    primaryEmotion: emotionalProfile.primaryEmotion,
    dominantPattern: emotionalProfile.dominantPattern,
    energyLevel: emotionalProfile.energyLevel,
    messageLength: message.length,
    mentorMode: mentorMode.mode,
    transformationPhase,
  });

  // ── 7. Web search ──────────────────────────────────────────────────────
  const externalInfo = classifyExternalInfoNeed(message);
  if (needsExternalInfo(message) && externalInfo.shouldUse) {
    searchQuery = buildSearchQuery(message);
    if (searchQuery) {
      searchResults = await searchWeb(searchQuery, 3).catch((searchError: unknown) => {
        logError("SEARCH", searchError, { route: "/api/chat", userId, query: searchQuery });
        return [];
      });
    }
  }

  // ── 8. Build coach context ─────────────────────────────────────────────
  const conversationContext = buildConversationContext({
    state,
    lastGoal: activeGoal?.title ?? null,
    pendingActions: activeGoal?.actions.filter((a) => !a.completed).map((a) => a.description) ?? [],
  });

  const [impulseProfile, impulseLogs] = await Promise.all([
    getUserImpulseProfile(userId).catch(() => null),
    listRecentImpulseLogs(userId, 5).catch(() => []),
  ]);

  const activeAction = getFirstPendingAction(activeGoal);
  const defaultAction = activeGoal
    ? "Cierra hoy una sola accion visible de tu objetivo activo."
    : "Define una sola accion concreta para hoy y ejecútala.";

  const coachContext = {
    goal: buildGoalCoachContext(activeGoal, message, {
      avoidanceCount: goalAvoidanceCount,
      avoidanceDetected: avoidanceDetectedThisTurn,
    }),
    continuity: {
      ...conversationContext,
      hesitationDetected: goalAvoidanceCount > 0 || avoidanceDetectedThisTurn,
      trend: emotionalProfile.progressTrend,
    },
    flow: {
      currentIntent: flowContext.currentIntent,
      currentStep: flowContext.currentStep,
      activeFlow: flowContext.activeFlow,
      instruction: flowContext.instruction,
    },
    mentor: mentorMode,
    transformation: { phase: transformationPhase, summary: transformationSummary },
    legal: {
      limitsNote:
        "Luciernaga AI orienta y empuja accion, pero no sustituye terapia ni soporte de emergencia.",
      critical: false,
    },
    onboarding: onboardingContext,
    access: {
      userPlan: session.userPlan,
      remainingMessages: remainingMessagesAfterTurn,
      hasActiveGoal: Boolean(activeGoal),
      conversionTrigger,
    },
    web: searchQuery
      ? { query: searchQuery, usage: "practical_decision" as const, results: searchResults }
      : null,
  };

  // ── 9. Impulse mode (non-streaming JSON) ──────────────────────────────
  if (impulseProfile) {
    const aiResult = await generateImpulseResponse(message, impulseProfile, impulseLogs);

    if (persistenceAvailable) {
      try {
        await saveConversationMessage({
          conversationId,
          userId,
          role: "assistant",
          content: aiResult.response,
        });
      } catch (dbError: unknown) {
        persistenceAvailable = false;
        logError("DB", dbError, { route: "/api/chat", userId, stage: "impulse_persistence" });
      }
    }

    return {
      data: {
        success: true,
        response: aiResult.response,
        state,
        conversationId,
        goal: serializeGoal(activeGoal),
        action: activeAction?.description ?? defaultAction,
        emotionalProfile,
        searchUsed: false,
        fallback: aiResult.fallback,
        flow: serializeFlow(flowContext),
        persistenceAvailable,
        mentorMode: mentorMode.mode,
        transformationPhase,
        conversionTrigger,
        conversionType,
        captureEmail: captureEmailRecommended,
        captureEmailMessage: captureEmailRecommended ? captureEmailMessage : null,
      },
    };
  }

  // ── 10. JSON path ──────────────────────────────────────────────────────
  if (jsonMode) {
    const aiResult = await generateAIResponse(message, state, emotionalProfile, coachContext, conversationHistory);
    let assistantResponse = completionMicroFeedback
      ? `${completionMicroFeedback}\n\n${aiResult.response}`
      : aiResult.response;
    assistantResponse = finalizeLuciernagaResponse(assistantResponse, {
      state,
      mentor: mentorMode,
      goal: buildGoalCoachContext(activeGoal, message, {
        avoidanceCount: goalAvoidanceCount,
        avoidanceDetected: avoidanceDetectedThisTurn,
      }),
      onboarding: onboardingContext,
    });
    assistantResponse = appendConversionPrompt(assistantResponse, conversionTrigger);
    assistantResponse = appendSoftPaywallPrompt(assistantResponse, softPaywallPrompt);
    assistantResponse = appendCaptureEmailPrompt(assistantResponse, captureEmailRecommended);

    if (persistenceAvailable) {
      try {
        await saveConversationMessage({
          conversationId,
          userId,
          role: "assistant",
          content: assistantResponse,
        });
      } catch (dbError: unknown) {
        persistenceAvailable = false;
        logError("DB", dbError, { route: "/api/chat", userId, stage: "post_ai_persistence_json" });
      }
    }

    await trackSafe({
      userId,
      type: "MESSAGE_RECEIVED",
      metadata: {
        conversationId,
        responseLength: assistantResponse.length,
        fallback: aiResult.fallback,
        userState: domainState,
        decisionType: domainDecision.type,
      },
    });

    return {
      data: {
        success: true,
        response: assistantResponse,
        state,
        systemState: domainState,
        decision: domainDecision,
        conversationId,
        goal: serializeGoal(activeGoal),
        action: activeAction?.description ?? defaultAction,
        emotionalProfile,
        searchUsed: searchResults.length > 0,
        fallback: aiResult.fallback,
        flow: serializeFlow(flowContext),
        persistenceAvailable,
        mentorMode: mentorMode.mode,
        transformationPhase,
        conversionTrigger,
        conversionType,
        captureEmail: captureEmailRecommended,
        captureEmailMessage: captureEmailRecommended ? captureEmailMessage : null,
      },
    };
  }

  // ── 11. SSE streaming path ─────────────────────────────────────────────
  const systemPrompt = buildCoachPrompt(state, emotionalProfile, coachContext);
  const metaPayload = {
    success: true,
    state,
    systemState: domainState,
    decision: domainDecision,
    conversationId,
    goal: serializeGoal(activeGoal),
    action: activeAction?.description ?? defaultAction,
    emotionalProfile,
    searchUsed: searchResults.length > 0,
    flow: serializeFlow(flowContext),
    mentorMode: mentorMode.mode,
    transformationPhase,
    conversionTrigger,
    conversionType,
    captureEmail: captureEmailRecommended,
    captureEmailMessage: captureEmailRecommended ? captureEmailMessage : null,
  };

  const streamUserId = userId;
  const streamConversationId = conversationId;
  let streamPersistence = persistenceAvailable;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let rawText = "";
      let streamFallback = false;

      try {
        for await (const token of streamOpenRouterTokens(message, systemPrompt, conversationHistory)) {
          rawText += token;
          send({ type: "delta", delta: token });
        }
      } catch (streamError: unknown) {
        logError("AI", streamError, { area: "chat_stream", userId: streamUserId });
        streamFallback = true;
      }

      if (!rawText) {
        const fallbackResult = await generateAIResponse(
          message,
          state,
          emotionalProfile,
          coachContext,
          conversationHistory,
        );
        rawText = fallbackResult.response;
        streamFallback = fallbackResult.fallback;
        send({ type: "delta", delta: rawText });
      }

      let finalText = completionMicroFeedback
        ? `${completionMicroFeedback}\n\n${rawText}`
        : rawText;
      finalText = finalizeLuciernagaResponse(finalText, {
        state,
        mentor: mentorMode,
        goal: buildGoalCoachContext(activeGoal, message, {
          avoidanceCount: goalAvoidanceCount,
          avoidanceDetected: avoidanceDetectedThisTurn,
        }),
        onboarding: onboardingContext,
      });
      finalText = appendConversionPrompt(finalText, conversionTrigger);
      finalText = appendSoftPaywallPrompt(finalText, softPaywallPrompt);
      finalText = appendCaptureEmailPrompt(finalText, captureEmailRecommended);

      if (finalText !== rawText) {
        send({ type: "replace", content: finalText });
      }

      if (streamPersistence) {
        try {
          await saveConversationMessage({
            conversationId: streamConversationId,
            userId: streamUserId,
            role: "assistant",
            content: finalText,
          });
        } catch (dbError: unknown) {
          streamPersistence = false;
          logError("DB", dbError, {
            route: "/api/chat",
            userId: streamUserId,
            stage: "stream_persistence",
          });
        }
      }

      await trackSafe({
        userId: streamUserId,
        type: "MESSAGE_RECEIVED",
        metadata: {
          conversationId: streamConversationId,
          responseLength: finalText.length,
          fallback: streamFallback,
          streaming: true,
          userState: domainState,
          decisionType: domainDecision.type,
        },
      });

      logInfo("AI", "stream_completed", {
        userId: streamUserId,
        conversationId: streamConversationId,
        fallback: streamFallback,
      });

      send({
        type: "meta",
        ...metaPayload,
        fallback: streamFallback,
        persistenceAvailable: streamPersistence,
      });
      send({ type: "done" });
      controller.close();
    },
  });

  return { stream, meta: metaPayload };
}
