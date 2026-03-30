import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getErrorMessage } from "@/lib/utils";
import { generateAIResponse } from "@/services/ai";
import {
  ensureUserSession,
  resolveConversationForUser,
  saveConversationMessage,
} from "@/services/conversation";
import { createGoalFromIntentMessage, getActiveGoalForUser } from "@/services/goals";
import { detectUserState, updateUserState } from "@/services/state";
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
    logInfo("STATE", "state_detected", { userId, state, messageLength: message.length });
    let persistenceAvailable = true;
    let activeGoal: Awaited<ReturnType<typeof getActiveGoalForUser>> | null = null;
    let conversationId = body.conversationId?.trim() || `tmp_${Date.now()}`;
    let isNewConversationTitle = false;

    try {
      await ensureUserSession(userId);
      await updateUserState(userId, state);

      const goalIntentResult = await createGoalFromIntentMessage({ userId, message });
      activeGoal = goalIntentResult?.goal ?? (await getActiveGoalForUser(userId));
      if (goalIntentResult?.created) {
        logInfo("STATE", "goal_created_from_intent", {
          userId,
          goalId: goalIntentResult.goal.id,
        });
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
    } catch (dbError: unknown) {
      persistenceAvailable = false;
      logError("DB", dbError, {
        route: "/api/chat",
        userId,
        stage: "pre_ai_persistence",
      });
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
      messageLength: message.length,
    });
    const aiResult = await generateAIResponse(message, state);
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
          content: aiResult.response,
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
      response: aiResult.response,
      state,
      conversationId,
      goal: serializeGoal(activeGoal),
      fallback: aiResult.fallback,
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
