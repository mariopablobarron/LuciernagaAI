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
import type { ChatRequestBody } from "@/types/chat";

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrismaClient();
    const body = (await req.json()) as Partial<ChatRequestBody>;
    const message = body.message?.trim() ?? "";
    const identity = resolveIdentity(req);
    const userId = identity.userId;

    if (!message) {
      return NextResponse.json(
        { response: "Necesito un mensaje para ayudarte.", state: "neutral" },
        { status: 400 }
      );
    }

    const rateLimit = checkRateLimit(`chat:${userId}`, 10, 60_000);
    if (!rateLimit.allowed) {
      const limitedResponse = NextResponse.json(
        {
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
    logInfo("STATE", "state_detected", { userId, state });

    // Guardar estado de usuario.
    try {
      await updateUserState(userId, state);
    } catch (dbError: unknown) {
      logError("STATE", dbError, { userId, area: "updateUserState" });
    }

    // Registrar mensaje de usuario para analítica.
    try {
      await prisma.message.create({
        data: {
          conversationId: userId,
          content: message,
        },
      });
      logInfo("STATE", "message_logged_user", { userId });
    } catch (messageError: unknown) {
      logError("CHAT", messageError, { userId, area: "message_create_user" });
    }

    // Respuesta IA usando prompt dinámico por estado.
    const aiResult = await generateAIResponse(message, state);
    logInfo("STATE", "ai_response_generated", { userId, state, fallback: aiResult.fallback });

    // Registrar mensaje del asistente para analítica.
    try {
      await prisma.message.create({
        data: {
          conversationId: userId,
          content: aiResult.response,
        },
      });
      logInfo("STATE", "message_logged_assistant", { userId });
    } catch (messageError: unknown) {
      logError("CHAT", messageError, { userId, area: "message_create_assistant" });
    }

    const response = NextResponse.json({
      response: aiResult.response,
      state,
    });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = NextResponse.json(
        {
          response: "Sesión inválida. Solicita un nuevo token.",
          error: "INVALID_SESSION_TOKEN",
        },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    logError("CHAT", error, { route: "chat" });
    return NextResponse.json(
      {
        response: "No pude procesar tu mensaje ahora. Intenta otra vez.",
        state: "neutral",
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
