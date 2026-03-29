import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
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

export async function POST(req: NextRequest) {
  try {
    logInfo("CHAT", "request received", {
      method: req.method,
      path: req.nextUrl.pathname,
      hasToken: hasIncomingToken(req),
    });

    let prisma: ReturnType<typeof getPrismaClient> | null = null;
    try {
      prisma = getPrismaClient();
      logInfo("DB", "prisma_client_ready", { route: "/api/chat" });
    } catch (dbInitError: unknown) {
      logError("DB", dbInitError, { route: "/api/chat", area: "prisma_init" });
      prisma = null;
    }

    let body: Partial<ChatRequestBody>;
    try {
      body = (await req.json()) as Partial<ChatRequestBody>;
    } catch (parseError: unknown) {
      logError("CHAT", parseError, { area: "parse_chat_body" });
      return buildErrorResponse("Body inválido en la solicitud", 400, "neutral", "INVALID_BODY");
    }

    logInfo("CHAT", "request body parsed", {
      hasMessage: !!body.message,
      messageLength: body.message?.length ?? 0,
      providedUserId: body.userId ?? null,
    });

    const message = body.message?.trim() ?? "";
    const identity = resolveIdentity(req);
    const userId = identity.userId;
    logInfo("CHAT", "identity resolved", {
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

    // Guardar estado de usuario.
    try {
      await updateUserState(userId, state);
    } catch (dbError: unknown) {
      logError("STATE", dbError, { userId, area: "updateUserState" });
    }

    // Registrar mensaje de usuario para analítica.
    if (prisma) {
      try {
        await prisma.message.create({
          data: {
            conversationId: userId,
            content: message,
          },
        });
        logInfo("DB", "message_logged_user", { userId });
      } catch (messageError: unknown) {
        logError("DB", messageError, { userId, area: "message_create_user" });
      }
    } else {
      logInfo("DB", "message_log_skipped_user", { userId, reason: "prisma_unavailable" });
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

    // Respuesta IA usando prompt dinámico por estado.
    logInfo("AI", "openrouter_call_requested", {
      userId,
      state,
      messageLength: message.length,
    });
    const aiResult = await generateAIResponse(message, state);
    logInfo("AI", "openrouter_call_completed", {
      userId,
      state,
      fallback: aiResult.fallback,
      errorType: aiResult.errorType ?? null,
      errorMessage: aiResult.errorMessage ?? null,
    });

    // Registrar mensaje del asistente para analítica.
    if (prisma) {
      try {
        await prisma.message.create({
          data: {
            conversationId: userId,
            content: aiResult.response,
          },
        });
        logInfo("DB", "message_logged_assistant", { userId });
      } catch (messageError: unknown) {
        logError("DB", messageError, { userId, area: "message_create_assistant" });
      }
    } else {
      logInfo("DB", "message_log_skipped_assistant", {
        userId,
        reason: "prisma_unavailable",
      });
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
      fallback: aiResult.fallback,
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

    return buildErrorResponse(
      clearMessage,
      500,
      "neutral",
      "INTERNAL_ERROR"
    );
  }
}
