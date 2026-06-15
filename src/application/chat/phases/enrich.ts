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
import { shouldSilenceAdminLoops, recentActionLockCount } from "@/services/anti-loop";
import {
  countMessagesForConversation,
  ensureUserSession,
  listMessagesForConversation,
  listRecentUserMessagesForUser,
  resolveConversationForUser,
  saveConversationMessage,
} from "@/services/conversation";
import { loadHistoryWithProgressiveSummary } from "@/services/conversation-summarizer";
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
import { getMentorMode, shouldAskForEmail, shouldAskForName } from "@/services/mentor-protocol";
import { getConversationalOnboarding } from "@/services/onboarding";
import { analyzeEmotionalProfile, updateEmotionalProfile } from "@/services/emotional-model";
import { detectEmotionNlp } from "@/services/emotion-nlp";
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
  /** Locale activo del usuario (es/en/pt/fr). Pasado a las funciones que
   *  generan strings hardcoded para que respondan en el idioma correcto. */
  locale?: "es" | "en" | "pt" | "fr" | "de";
};

export type EnrichResult = {
  persistenceAvailable: boolean;
  conversationId: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  conversationSummary: string | null;
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
  captureNameRecommended: boolean;

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
  let conversationSummary: string | null = null;
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
  let captureNameRecommended = false;

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
      // Histórico literal últimos 16 mensajes + resumen acumulado de los más
      // antiguos (LangChain SummaryBufferMemory). Si la conversación es corta
      // (<22 mensajes) el summary es null y el histórico devuelve los literales.
      const ctx = await loadHistoryWithProgressiveSummary({ userId, conversationId });
      conversationHistory = ctx.recentHistory;
      conversationSummary = ctx.summarySoFar;
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

    // Fase observabilidad: ejecutar detector NLP en paralelo (fire-and-forget)
    // para comparar mapeo vs keywords. No altera el perfil aún.
    void detectEmotionNlp(message)
      .then((nlp) => {
        if (!nlp) return;
        logInfo("EMOTION_NLP", "shadow_compare", {
          userId,
          conversationId,
          keywordEmotion: emotionalProfile.primaryEmotion,
          nlpRawLabel: nlp.rawLabel,
          nlpRawScore: Number(nlp.rawScore.toFixed(3)),
          nlpMapped: nlp.mappedEmotion,
          agree: nlp.mappedEmotion === emotionalProfile.primaryEmotion,
        });
      })
      .catch(() => {
        // detectEmotionNlp ya loguea sus propios errores; nada que hacer aquí.
      });

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

      // Bypass del action-lock cuando (a) el usuario expresa confusión o
      // protesta sobre que el sistema le insiste en lo mismo, o (b) el lock
      // ya se mostró en los 2 últimos turnos del assistant. Sin esto, el
      // sistema reproducía la misma plantilla turno tras turno aunque el
      // usuario respondiera con sustancia diferente. El LLM tiene guidance
      // en coach.ts (línea ~385) para explicar el sistema y volver a la
      // acción concreta de forma orgánica.
      const userProtestsLock = /(\bya respond|ya est[aá] (definido|claro|hecho|dicho)|no s[eé] por qu[eé] me preg|por qu[eé] me preg|me pides.*(volver|inicio)|ha dicho que seguimos|me estoy repit|me repito|ya te dije|ya lo dije|estoy respondi|no me escucha|estamos en bucle|no hay di[aá]logo|esto no es (un di[aá]logo|conversaci[oó]n))/i.test(
        message,
      );
      const recentAssistantMessages = conversationHistory
        .filter((m) => m.role === "assistant")
        .slice(-2);
      const lockTemplateRepeated = recentAssistantMessages.length >= 2 &&
        recentAssistantMessages.every((m) =>
          /lo aparcas|lo retomas|qued[oó] abierto|seguimos sin cerrar|dejamos «/i.test(m.content),
        );
      const lockBypass = userProtestsLock || lockTemplateRepeated;

      if (pendingAction) {
        // Respuestas cortas típicas al "¿ya completaste? sí o no" — el
        // detector global no las recogía y el action-lock devolvía la misma
        // plantilla turno tras turno.
        const shortReply = message
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[.!¡¿?…]/g, "")
          .trim();
        const shortYes = /^(si|sip|yep|ya|hecho|listo|ok|vale|done|ya esta|ya lo hice)$/.test(shortReply);
        const shortNo = /^(no|nope|todavia no|aun no|not yet|aun no lo hice|todavia no lo hice)$/.test(shortReply);
        const completionIntent = shortYes || detectActionCompletionIntent(message);
        const postponeIntent = (shortNo && !shortYes) || detectActionPostponeIntent(message);
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

          // Anti-bucle: si el usuario protestó por repetición, hay crisis
          // reciente, o ya hemos pegado el action lock ≥2 veces seguidas,
          // NO volver a pegarlo. Auditoría 2026-05-25 reveló bucles de
          // hasta 14 turnos con el mismo mensaje, incluso pisando crisis.
          const adminLoopGuard = shouldSilenceAdminLoops({
            currentUserMessage: message,
            recentMessages: conversationHistory,
          });
          if (adminLoopGuard.silenceActionLock) {
            logInfo("CHAT", "action_lock_silenced", {
              userId, conversationId, reason: adminLoopGuard.reason,
            });
          }
          if (!shouldBypassActionLock(state) && !lockBypass && !adminLoopGuard.silenceActionLock) {
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
              locale: input.locale,
              // Rotar redacción según cuántas veces ya hemos pegado el
              // action lock — evita repetición textual idéntica observada
              // en conv cmpmww8tr 26-05-2026.
              variant: recentActionLockCount(conversationHistory),
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

      // Anti-bucle: mismo guard que arriba — silenciar si el usuario protestó,
      // hay crisis reciente, o ya repetimos el action lock ≥2 veces. Lo
      // calculamos otra vez (vs cachear) porque el flujo permite que un
      // bypass anterior NO hubiera entrado en el otro bloque.
      const adminLoopGuard2 = shouldSilenceAdminLoops({
        currentUserMessage: message,
        recentMessages: conversationHistory,
      });
      if (
        !actionCompletedThisTurn &&
        !actionLockPayload &&
        pendingAction &&
        !shouldBypassActionLock(state) &&
        !lockBypass &&
        !adminLoopGuard2.silenceActionLock
      ) {
        actionLockAssistantMessage = buildActionRequiredMessage({
          actionTitle: pendingAction.description,
          goalTitle: activeGoal?.title ?? null,
          avoidanceCount: goalAvoidanceCount,
          unfinishedActionsCount: goalPendingActionsCount,
          // Rotar redacción si ya hemos pegado el action lock antes.
          variant: recentActionLockCount(conversationHistory),
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
      const hasName = Boolean(sessionProfile.name && sessionProfile.name.trim().length > 0);
      captureEmailRecommended = shouldAskForEmail({
        isAnonymous: sessionProfile.isAnonymous,
        hasName,
        goalCount: activeGoal ? 1 : 0,
        actionCount: activeGoal?.totalCount ?? 0,
        conversationMessageCount,
        conversionTrigger,
      });
      // Anti-bucle: si el usuario protestó por las peticiones de email, ya
      // dio el email (mensaje contiene "@"), hay crisis reciente, o ya
      // pegamos el prompt de email ≥2 veces seguidas → NO volver a pedirlo.
      // Auditoría 2026-05-25 mostró el bucle del email pisando una conversación
      // sobre suicidio adolescente — inaceptable.
      const emailGuard = shouldSilenceAdminLoops({
        currentUserMessage: message,
        recentMessages: conversationHistory,
      });
      if (captureEmailRecommended && emailGuard.silenceEmailPrompt) {
        captureEmailRecommended = false;
        logInfo("CHAT", "capture_email_silenced", {
          userId, conversationId, reason: emailGuard.reason,
        });
      }
      // Además: si el mensaje actual del usuario contiene un email válido,
      // ya nos lo dio — NO seguir pidiéndolo.
      if (captureEmailRecommended && /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(message)) {
        captureEmailRecommended = false;
        logInfo("CHAT", "capture_email_silenced", {
          userId, conversationId, reason: "user_already_provided",
        });
      }
      captureNameRecommended = shouldAskForName({
        isAnonymous: sessionProfile.isAnonymous,
        hasName,
        conversationMessageCount,
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
    conversationSummary,
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
    captureNameRecommended,
    communityCTA,
  };
}
