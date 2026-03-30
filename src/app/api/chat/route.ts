import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import {
  sendAvoidanceEscalationAlert,
  sendCrisisEscalationAlert,
} from "@/lib/alerts";
import { logError, logInfo } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getErrorMessage } from "@/lib/utils";
import { generateAIResponse } from "@/services/ai";
import { buildActionRequiredMessage } from "@/services/coach";
import {
  ensureUserSession,
  listRecentUserMessagesForUser,
  resolveConversationForUser,
  saveConversationMessage,
} from "@/services/conversation";
import {
  buildGoalCoachContext,
  completeFirstPendingActionForUser,
  createGoalFromIntentMessage,
  detectActionCompletionIntent,
  detectActionPostponeIntent,
  detectActionRefusalIntent,
  getFirstPendingAction,
  getActiveGoalForUser,
  registerAvoidanceEvent,
} from "@/services/goals";
import { runFlow, loadDialogueState, saveDialogueState } from "@/services/flows";
import { detectIntent } from "@/services/intent";
import { analyzeEmotionalProfile, updateEmotionalProfile } from "@/services/emotional-model";
import { buildSearchQuery, needsExternalInfo, searchWeb } from "@/services/search";
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
  updateUserState,
} from "@/services/state";
import type { ChatRequestBody, UserState } from "@/types/chat";

function hasIncomingToken(req: NextRequest): boolean {
  const hasBearer = (req.headers.get("authorization") || "").startsWith("Bearer ");
  const hasHeaderToken = !!req.headers.get("x-session-token")?.trim();
  const hasCookieToken = !!req.cookies.get("mw_session")?.value?.trim();
  return hasBearer || hasHeaderToken || hasCookieToken;
}

function buildErrorResponse(
  message: string,
  status: number,
  state: UserState = "neutral",
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      response: message,
      state,
    },
    { status }
  );
}

function serializeGoal(goal: Awaited<ReturnType<typeof getActiveGoalForUser>>) {
  if (!goal) {
    return null;
  }

  return {
    id: goal.id,
    title: goal.title,
    status: goal.status,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
    completedCount: goal.completedCount,
    totalCount: goal.totalCount,
    progress: goal.progress,
    actions: goal.actions.map((action) => ({
      id: action.id,
      description: action.description,
      completed: action.completed,
      createdAt: action.createdAt.toISOString(),
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

function buildActionRequiredResponse(params: {
  message: string;
  state: UserState;
  conversationId: string;
  goal: Awaited<ReturnType<typeof getActiveGoalForUser>>;
  emotionalProfile: ReturnType<typeof analyzeEmotionalProfile>;
  action: {
    id: string;
    description: string;
  };
  persistenceAvailable: boolean;
  flow: {
    currentIntent: string;
    currentStep: number;
    activeFlow: string | null;
    instruction: string | null;
  };
}): NextResponse {
  return NextResponse.json({
    success: true,
    type: "action_required",
    message: params.message,
    response: params.message,
    state: params.state,
    conversationId: params.conversationId,
    goal: serializeGoal(params.goal),
    emotionalProfile: params.emotionalProfile,
    fallback: true,
    persistenceAvailable: params.persistenceAvailable,
    searchUsed: false,
    flow: serializeFlow(params.flow),
    action: {
      id: params.action.id,
      title: params.action.description,
    },
  });
}

function isCrisisLevel(level: RiskLevel): level is "high" | "critical" {
  return level === "high" || level === "critical";
}

function isCrisisInterventionMessage(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const interventionSignals = [
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

  return interventionSignals.some((signal) => normalized.includes(signal));
}

export async function POST(req: NextRequest) {
  try {
    logInfo("CHAT", "request_received", {
      method: req.method,
      path: req.nextUrl.pathname,
      hasToken: hasIncomingToken(req),
    });

    let body: Partial<ChatRequestBody>;
    try {
      body = (await req.json()) as Partial<ChatRequestBody>;
    } catch (parseError: unknown) {
      logError("CHAT", parseError, { area: "parse_chat_body" });
      return buildErrorResponse("Body inválido en la solicitud", 400, "neutral", "INVALID_BODY");
    }

    logInfo("CHAT", "request_body_parsed", {
      hasMessage: !!body.message,
      messageLength: body.message?.length ?? 0,
      conversationId: body.conversationId ?? null,
    });

    const message = body.message?.trim() ?? "";
    const identity = resolveIdentity(req);
    const userId = identity.userId;

    logInfo("CHAT", "identity_resolved", {
      userId,
      source: identity.source,
      shouldSetCookie: identity.shouldSetCookie,
      hasToken: hasIncomingToken(req),
    });

    if (!message) {
      return buildErrorResponse(
        "Necesito un mensaje para ayudarte.",
        400,
        "neutral",
        "EMPTY_MESSAGE"
      );
    }

    const rateLimit = checkRateLimit(`chat:${userId}`, 10, 60_000);
    if (!rateLimit.allowed) {
      const limitedResponse = NextResponse.json(
        {
          success: false,
          error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
          response: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
          state: "neutral",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
      if (identity.shouldSetCookie) {
        attachSessionCookie(limitedResponse, identity.sessionToken);
      }
      return limitedResponse;
    }

    const state = detectUserState(message);
    const detectedIntent = detectIntent(message);
    const riskLevel = detectRiskLevel(message);
    let emotionalProfile = analyzeEmotionalProfile(message, []);
    const dialogueState = loadDialogueState(userId);
    const flowContext = runFlow(
      {
        ...dialogueState,
        currentIntent: detectedIntent,
      },
      message
    );
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
    logInfo("RISK", "risk_level_detected", {
      userId,
      riskLevel,
      crisisMode,
    });

    let persistenceAvailable = true;
    let activeGoal: Awaited<ReturnType<typeof getActiveGoalForUser>> | null = null;
    let searchResults: Awaited<ReturnType<typeof searchWeb>> = [];
    let searchQuery: string | null = null;
    let conversationId = body.conversationId?.trim() || `tmp_${Date.now()}`;
    let isNewConversationTitle = false;
    let actionLockResponse: NextResponse | null = null;
    let actionLockAssistantMessage: string | null = null;
    let goalAvoidanceCount = 0;
    let completionMicroFeedback: string | null = null;
    let actionCompletedThisTurn = false;

    try {
      await ensureUserSession(userId);
      await updateUserState(userId, state);

      if (isCrisisInterventionMessage(message)) {
        await clearUserCrisis(userId);
        logInfo("RISK", "crisis_intervention_detected", {
          userId,
        });
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
      }

      const conversation = await resolveConversationForUser(userId, body.conversationId, message);
      conversationId = conversation.id;
      isNewConversationTitle = conversation.title === "Nueva conversación";

      logInfo("DB", "conversation_resolved", {
        userId,
        conversationId,
        requestedConversationId: body.conversationId ?? null,
      });

      await saveConversationMessage({
        conversationId,
        userId,
        role: "user",
        content: message,
        updateTitleFromUserMessage: isNewConversationTitle,
      });
      logInfo("DB", "message_saved", {
        userId,
        conversationId,
        role: "user",
      });

      try {
        const userMessageHistory = await listRecentUserMessagesForUser(userId, 16);
        const previousMessages = userMessageHistory.slice(0, -1);
        emotionalProfile = analyzeEmotionalProfile(message, previousMessages);
        await updateEmotionalProfile(userId, emotionalProfile);
      } catch (emotionalError: unknown) {
        emotionalProfile = analyzeEmotionalProfile(message, []);
        logError("EMOTION", emotionalError, {
          route: "/api/chat",
          userId,
          stage: "update_emotional_profile",
        });
      }

      if (!crisisMode) {
        activeGoal = await getActiveGoalForUser(userId);
        let pendingAction = getFirstPendingAction(activeGoal);

        if (pendingAction) {
          if (detectActionCompletionIntent(message)) {
            const progressedGoal = await completeFirstPendingActionForUser(userId);
            activeGoal = progressedGoal ?? activeGoal;
            pendingAction = getFirstPendingAction(activeGoal);
            actionCompletedThisTurn = true;
            completionMicroFeedback = pendingAction
              ? `Bien. Has avanzado. Siguiente paso: ${pendingAction.description}`
              : "Bien. Has avanzado. Siguiente paso: consolida este avance hoy con una evidencia concreta.";
            if (activeGoal) {
              logInfo("STATE", "goal_action_auto_completed", {
                userId,
                goalId: activeGoal.id,
              });
            }
          } else {
            if (detectActionPostponeIntent(message)) {
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
            } else if (detectActionRefusalIntent(message)) {
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
            }

            if (!shouldBypassActionLock(state)) {
              actionLockAssistantMessage = buildActionRequiredMessage(goalAvoidanceCount);
              actionLockResponse = buildActionRequiredResponse({
                message: actionLockAssistantMessage,
                state,
                conversationId,
                goal: activeGoal,
                emotionalProfile,
                action: pendingAction,
                persistenceAvailable,
                flow: flowContext,
              });
            }
          }
        }

        if (
          !actionCompletedThisTurn &&
          !actionLockResponse &&
          pendingAction &&
          !shouldBypassActionLock(state)
        ) {
          actionLockAssistantMessage = buildActionRequiredMessage(goalAvoidanceCount);
          actionLockResponse = buildActionRequiredResponse({
            message: actionLockAssistantMessage,
            state,
            conversationId,
            goal: activeGoal,
            emotionalProfile,
            action: pendingAction,
            persistenceAvailable,
            flow: flowContext,
          });
        }

        if (!activeGoal || activeGoal.status !== "active") {
          const goalIntentResult = await createGoalFromIntentMessage({ userId, message });
          activeGoal = goalIntentResult?.goal ?? activeGoal;
          if (goalIntentResult?.created) {
            logInfo("STATE", "goal_created_from_intent", {
              userId,
              goalId: goalIntentResult.goal.id,
            });
          }
        }
      }
    } catch (dbError: unknown) {
      persistenceAvailable = false;
      logError("DB", dbError, {
        route: "/api/chat",
        userId,
        stage: "pre_ai_persistence",
      });
    }

    if (actionLockResponse) {
      if (persistenceAvailable && actionLockAssistantMessage) {
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
          logError("DB", dbError, {
            route: "/api/chat",
            userId,
            stage: "action_lock_persistence",
          });
          actionLockResponse = buildActionRequiredResponse({
            message: actionLockAssistantMessage,
            state,
            conversationId,
            goal: activeGoal,
            emotionalProfile,
            action: getFirstPendingAction(activeGoal) ?? {
              id: "unknown",
              description: "Acción pendiente",
            },
            persistenceAvailable,
            flow: flowContext,
          });
        }
      }

      if (identity.shouldSetCookie) {
        attachSessionCookie(actionLockResponse, identity.sessionToken);
      }

      return actionLockResponse;
    }

    if (crisisMode) {
      const containmentLevel: RiskLevel = isCrisisLevel(riskLevel) ? riskLevel : "high";
      const crisisPayload = getCrisisResponse(containmentLevel);

      await registerCrisisEvent({
        userId,
        level: containmentLevel,
        message,
        response: crisisPayload.response,
      });
      await sendCrisisEscalationAlert({
        userId,
        level: containmentLevel,
        message,
      });

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

      const crisisResponse = NextResponse.json({
        success: true,
        response: crisisPayload.response,
        state,
        conversationId,
        goal: null,
        emotionalProfile,
        fallback: true,
        persistenceAvailable,
        crisis: true,
        riskLevel: containmentLevel,
        detectedRiskLevel: riskLevel,
        crisisActive: true,
        crisisActiveUntil,
        searchUsed: false,
        flow: serializeFlow(flowContext),
        alerts: crisisPayload.resources,
      });

      if (identity.shouldSetCookie) {
        attachSessionCookie(crisisResponse, identity.sessionToken);
      }

      return crisisResponse;
    }

    if (!process.env.OPENROUTER_API_KEY?.trim()) {
      logError("AI", new Error("Missing OPENROUTER_API_KEY"), { route: "/api/chat" });
      return buildErrorResponse(
        "Error de configuración del servidor",
        500,
        state,
        "MISSING_OPENROUTER_API_KEY"
      );
    }

    logInfo("AI", "openrouter_call_requested", {
      userId,
      conversationId,
      state,
      primaryEmotion: emotionalProfile.primaryEmotion,
      dominantPattern: emotionalProfile.dominantPattern,
      energyLevel: emotionalProfile.energyLevel,
      messageLength: message.length,
    });
    if (needsExternalInfo(message)) {
      searchQuery = buildSearchQuery(message);
      if (searchQuery) {
        searchResults = await searchWeb(searchQuery, 3).catch((searchError: unknown) => {
          logError("SEARCH", searchError, {
            route: "/api/chat",
            userId,
            query: searchQuery,
          });
          return [];
        });
      }
    }

    const conversationContext = buildConversationContext({
      state,
      lastGoal: activeGoal?.title ?? null,
      pendingActions:
        activeGoal?.actions
          .filter((action) => !action.completed)
          .map((action) => action.description) ?? [],
    });

    const aiResult = await generateAIResponse(message, state, emotionalProfile, {
      goal: buildGoalCoachContext(activeGoal, message, goalAvoidanceCount),
      continuity: {
        ...conversationContext,
        hesitationDetected: goalAvoidanceCount > 0,
      },
      flow: {
        currentIntent: flowContext.currentIntent,
        currentStep: flowContext.currentStep,
        activeFlow: flowContext.activeFlow,
        instruction: flowContext.instruction,
      },
      web: searchQuery
        ? {
            query: searchQuery,
            results: searchResults,
          }
        : null,
    });

    const assistantResponse = completionMicroFeedback
      ? `${completionMicroFeedback}\n\n${aiResult.response}`
      : aiResult.response;

    logInfo("AI", "openrouter_call_completed", {
      userId,
      conversationId,
      state,
      fallback: aiResult.fallback,
      errorType: aiResult.errorType ?? null,
      errorMessage: aiResult.errorMessage ?? null,
    });

    if (persistenceAvailable) {
      try {
        await saveConversationMessage({
          conversationId,
          userId,
          role: "assistant",
          content: assistantResponse,
        });
        logInfo("DB", "message_saved", {
          userId,
          conversationId,
          role: "assistant",
        });
      } catch (dbError: unknown) {
        persistenceAvailable = false;
        logError("DB", dbError, {
          route: "/api/chat",
          userId,
          stage: "post_ai_persistence",
        });
      }
    }

    if (aiResult.fallback && aiResult.errorType === "provider_failure") {
      logError("AI", new Error(aiResult.errorMessage || "Provider failure"), {
        route: "/api/chat",
        state,
      });
    }

    const response = NextResponse.json({
      success: true,
      response: assistantResponse,
      state,
      conversationId,
      goal: serializeGoal(activeGoal),
      emotionalProfile,
      searchUsed: searchResults.length > 0,
      fallback: aiResult.fallback,
      flow: serializeFlow(flowContext),
      persistenceAvailable,
    });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = buildErrorResponse(
        "Token inválido o expirado",
        401,
        "neutral",
        "INVALID_SESSION_TOKEN"
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    logError("CHAT", error, { route: "chat" });
    const rawMessage = getErrorMessage(error);
    const clearMessage = rawMessage.includes("OPENROUTER_API_KEY")
      ? "Error de configuración del servidor"
      : rawMessage.toLowerCase().includes("openrouter")
        ? "Fallo en proveedor de IA"
        : "Error interno del servidor";

    return buildErrorResponse(clearMessage, 500, "neutral", "INTERNAL_ERROR");
  }
}
