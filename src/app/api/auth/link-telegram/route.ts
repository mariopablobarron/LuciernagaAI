import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { verifyTelegramLinkToken } from "@/lib/telegram-link";
import { logError, logInfo } from "@/lib/logger";
import { getUserSessionProfile, linkTelegramIdentity } from "@/services/user";

type LinkTelegramBody = {
  token?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LinkTelegramBody;
    const token = body.token?.trim() ?? "";

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "TOKEN_REQUIRED",
        },
        { status: 400 }
      );
    }

    const identity = await resolveIdentity(req, { allowAnonymousBootstrap: true });
    const payload = verifyTelegramLinkToken(token);

    const linked = await linkTelegramIdentity({
      currentUserId: identity.userId,
      telegramUserId: payload.tgUserId,
    });

    const user = await getUserSessionProfile(linked.userId);

    const response = NextResponse.json({
      success: true,
      userId: linked.userId,
      user,
    });

    if (identity.shouldSetCookie && identity.sessionToken) {
      attachSessionCookie(response, identity.sessionToken);
    }

    logInfo("CHAT", "telegram_link_completed", {
      userId: linked.userId,
      telegramUserId: payload.tgUserId,
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = NextResponse.json(
        {
          success: false,
          error: "INVALID_SESSION_TOKEN",
        },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    const message = error instanceof Error ? error.message : "LINK_TELEGRAM_FAILED";
    if (message === "INVALID_LINK_TOKEN" || message === "EXPIRED_LINK_TOKEN") {
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 400 }
      );
    }

    if (message === "TELEGRAM_USER_NOT_FOUND" || message === "CURRENT_USER_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 404 }
      );
    }

    if (message === "TELEGRAM_ALREADY_LINKED") {
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 409 }
      );
    }

    logError("CHAT", error, { route: "/api/auth/link-telegram", method: "POST" });
    return NextResponse.json(
      {
        success: false,
        error: "LINK_TELEGRAM_FAILED",
      },
      { status: 500 }
    );
  }
}
