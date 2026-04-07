import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { ensureUserSession, listMessagesForConversation } from "@/services/conversation";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const userId = identity.userId;

    const conversationId = req.nextUrl.searchParams.get("conversationId")?.trim() ?? "";
    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          error: "conversationId es requerido",
          code: "MISSING_CONVERSATION_ID",
        },
        { status: 400 }
      );
    }

    await ensureUserSession(userId);
    const messages = await listMessagesForConversation({
      userId,
      conversationId,
    });

    if (!messages) {
      return NextResponse.json(
        {
          success: false,
          error: "Conversación no encontrada",
          code: "CONVERSATION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    logInfo("CHAT", "conversation_messages_listed", {
      userId,
      conversationId,
      count: messages.length,
    });

    const response = NextResponse.json({
      success: true,
      conversationId,
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      })),
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = NextResponse.json(
        {
          success: false,
          error: "Token inválido o expirado",
          code: "INVALID_SESSION_TOKEN",
        },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    logError("CHAT", error, { route: "/api/messages" });
    return NextResponse.json(
      {
        success: false,
        error: "No se pudieron cargar los mensajes",
      },
      { status: 500 }
    );
  }
}, { limit: 60, keyFn: (req) => `rl:/api/messages:${getClientIp(req)}` });
