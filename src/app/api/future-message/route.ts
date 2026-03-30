import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";
import {
  createFutureMessage,
  listAvailableFutureMessages,
} from "@/services/future-message";

export async function GET(req: NextRequest) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const payload = await listAvailableFutureMessages(identity.userId);
    const response = NextResponse.json({
      success: true,
      ...payload,
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error: unknown) {
    logError("IMPULSE", error, { route: "/api/future-message", method: "GET" });
    return NextResponse.json(
      { success: false, error: "No se pudieron cargar los mensajes futuros." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await bootstrapSessionIdentity(req);
    const body = (await req.json()) as {
      title?: string;
      content?: string;
      unlockAt?: string;
    };

    const title = body.title?.trim() ?? "";
    const content = body.content?.trim() ?? "";
    const unlockAt = body.unlockAt ? new Date(body.unlockAt) : null;

    if (!title || !content || !unlockAt || Number.isNaN(unlockAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "title, content and unlockAt are required" },
        { status: 400 }
      );
    }

    const futureMessage = await createFutureMessage({
      userId: identity.userId,
      title,
      content,
      unlockAt,
    });

    const response = NextResponse.json({
      success: true,
      futureMessage,
    });

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    return response;
  } catch (error: unknown) {
    logError("IMPULSE", error, { route: "/api/future-message", method: "POST" });
    return NextResponse.json(
      { success: false, error: "No se pudo guardar el mensaje futuro." },
      { status: 500 }
    );
  }
}
