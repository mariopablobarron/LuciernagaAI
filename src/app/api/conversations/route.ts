import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import {
  createConversationForUser,
  ensureUserSession,
  listConversationsForUser,
} from "@/services/conversation";
import { getEmotionalProfile } from "@/services/emotional-model";

export async function GET(req: NextRequest) {
  try {
    const identity = resolveIdentity(req);
    const userId = identity.userId;

    await ensureUserSession(userId);
    const [conversations, emotionalProfile] = await Promise.all([
      listConversationsForUser(userId),
      getEmotionalProfile(userId),
    ]);

    logInfo("CHAT", "conversations_listed", {
      userId,
      count: conversations.length,
    });

    const response = NextResponse.json({
      success: true,
      emotionalProfile,
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

export async function POST(req: NextRequest) {
  try {
    const identity = resolveIdentity(req);
    const userId = identity.userId;

    let title = "";
    try {
      const body = (await req.json()) as { title?: unknown };
      if (typeof body.title === "string") {
        title = body.title.trim();
      }
    } catch {
      // Body opcional; si no llega JSON válido se crea con título por defecto.
    }

    await ensureUserSession(userId);
    const conversation = await createConversationForUser(userId, title);

    logInfo("CHAT", "conversation_created", {
      userId,
      conversationId: conversation.id,
    });

    const response = NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
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

    logError("CHAT", error, { route: "/api/conversations", method: "POST" });
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo crear la conversación",
      },
      { status: 500 }
    );
  }
}
