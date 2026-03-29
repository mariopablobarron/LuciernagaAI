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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unknown error";
}

export async function POST(req: NextRequest) {
  try {
    logInfo("CHAT", "chat_direct_request_received");

    const body = (await req.json()) as { message?: string; userId?: string };
    const message = body.message?.trim() ?? "";
    const identity = resolveIdentity(req);

    if (!message) {
      logInfo("CHAT", "chat_direct_invalid_input", {
        hasMessage: !!message,
      });
      return NextResponse.json(
        { reply: "Necesito que me cuentes qué te pasa", error: "EMPTY_INPUT" },
        { status: 400 }
      );
    }

    // Detectar estado
    const state = detectUserState(message);
    logInfo("CHAT", "chat_direct_state_detected", { state });

    const aiResult = await generateMentorReply({
      message,
      state,
      profile: "direct",
    });
    logInfo("CHAT", "chat_direct_ai_result", {
      fallback: aiResult.fallback,
    });

    const response = NextResponse.json({
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
      const unauthorized = NextResponse.json(
        {
          reply: "Sesión inválida. Solicita un nuevo token.",
          error: "INVALID_SESSION_TOKEN",
        },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    const errorMessage = getErrorMessage(error);
    logError("CHAT", new Error(errorMessage), { route: "chat-direct" });
    return NextResponse.json(
      {
        reply: "Error interno. Por favor intenta de nuevo.",
        error: "INTERNAL_ERROR",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
