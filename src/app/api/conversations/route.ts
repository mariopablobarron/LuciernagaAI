import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { ensureUserSession, listConversationsForUser } from "@/services/conversation";

export async function GET(req: NextRequest) {
  try {
    const identity = resolveIdentity(req);
    const userId = identity.userId;

    await ensureUserSession(userId);
    const conversations = await listConversationsForUser(userId);

    logInfo("CHAT", "conversations_listed", {
      userId,
      count: conversations.length,
    });

    const response = NextResponse.json({
      success: true,
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messageCount: conversation.messageCount,
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

    logError("CHAT", error, { route: "/api/conversations" });
    return NextResponse.json(
      {
        success: false,
        error: "No se pudieron cargar las conversaciones",
      },
      { status: 500 }
    );
  }
}
