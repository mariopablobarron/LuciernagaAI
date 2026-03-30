import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { detectUserState } from "@/services/state";
import { generateMentorReply } from "@/services/ai";
import { logError, logInfo } from "@/lib/logger";
import type { UserState } from "@/types/chat";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unknown error";
}

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
  code?: string,
  details?: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      details,
      reply: message,
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

    let body: { message?: string };
    try {
      body = (await req.json()) as { message?: string };
    } catch (parseError: unknown) {
      logError("CHAT", parseError, { area: "parse_chat_direct_body" });
      return buildErrorResponse("Body inválido en la solicitud", 400, "neutral", "INVALID_BODY");
    }

    logInfo("CHAT", "request body parsed", {
      hasMessage: !!body.message,
      messageLength: body.message?.length ?? 0,
    });

    const message = body.message?.trim() ?? "";
    const identity = await resolveIdentity(req);
    logInfo("CHAT", "identity resolved", {
      userId: identity.userId,
      source: identity.source,
      shouldSetCookie: identity.shouldSetCookie,
      hasToken: hasIncomingToken(req),
    });

    if (!message) {
      logInfo("CHAT", "chat_direct_invalid_input", {
        hasMessage: !!message,
      });
      return buildErrorResponse(
        "Necesito que me cuentes qué te pasa",
        400,
        "neutral",
        "EMPTY_INPUT"
      );
    }

    // Detectar estado
    const state = detectUserState(message);
    logInfo("STATE", "state_detected", {
      userId: identity.userId,
      state,
      messageLength: message.length,
    });

    if (!process.env.OPENROUTER_API_KEY?.trim()) {
      logError("AI", new Error("Missing OPENROUTER_API_KEY"), { route: "/api/chat-direct" });
      return buildErrorResponse(
        "Error de configuración del servidor",
        500,
        state,
        "MISSING_OPENROUTER_API_KEY"
      );
    }

    logInfo("AI", "openrouter_call_requested", {
      userId: identity.userId,
      state,
      messageLength: message.length,
    });
    const aiResult = await generateMentorReply({
      message,
      state,
      profile: "direct",
    });
    logInfo("AI", "openrouter_call_completed", {
      userId: identity.userId,
      state,
      fallback: aiResult.fallback,
      errorType: aiResult.errorType ?? null,
      errorMessage: aiResult.errorMessage ?? null,
    });

    if (aiResult.fallback && aiResult.errorType === "provider_failure") {
      logError("AI", new Error(aiResult.errorMessage || "Provider failure"), {
        route: "/api/chat-direct",
        state,
      });
    }

    const response = NextResponse.json({
      success: true,
      ok: true,
      reply: aiResult.reply,
      state,
      fallback: aiResult.fallback,
      userId: identity.userId,
      timestamp: new Date().toISOString(),
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

    const rawMessage = getErrorMessage(error);
    logError("CHAT", error, { route: "chat-direct", rawMessage });
    const clearMessage = rawMessage.includes("OPENROUTER_API_KEY")
      ? "Error de configuración del servidor"
      : rawMessage.toLowerCase().includes("openrouter")
        ? "Fallo en proveedor de IA"
        : "Error interno del servidor";

    return buildErrorResponse(
      clearMessage,
      500,
      "neutral",
      "INTERNAL_ERROR",
      rawMessage
    );
  }
}
