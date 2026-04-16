import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  bootstrapSessionIdentity,
  clearSessionCookie,
  InvalidSessionTokenError,
  issueSessionToken,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import {
  getUserSessionProfile,
  IdentityLinkConflictError,
  linkIdentityToEmail,
  normalizeEmail,
} from "@/services/user";
import { buildAdminAlert, notifyAdmin } from "@/services/telegram";
import { triggerWelcomeAvatarVideoAsync } from "@/services/welcomeAvatarVideo";

type CaptureEmailBody = {
  email?: string;
  sessionId?: string;
  name?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CaptureEmailBody;
    const rawEmail = body.email?.trim() ?? "";

    if (!rawEmail || !isValidEmail(rawEmail)) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "EMAIL_INVALID",
        },
        { status: 400 }
      );
    }

    const identity = await bootstrapSessionIdentity(req);
    const requestedSessionId = body.sessionId?.trim();

    if (
      requestedSessionId &&
      requestedSessionId !== identity.userId &&
      identity.source !== "generated"
    ) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "SESSION_MISMATCH",
        },
        { status: 409 }
      );
    }

    const sourceSessionId =
      requestedSessionId && identity.source === "generated"
        ? requestedSessionId
        : (requestedSessionId ?? identity.userId);

    const linkedIdentity = await linkIdentityToEmail({
      currentUserId: sourceSessionId,
      email: normalizeEmail(rawEmail),
      name: body.name,
    });
    const token = issueSessionToken(linkedIdentity.userId);
    const user = await getUserSessionProfile(linkedIdentity.userId);

    // Capture-email is the moment an anonymous browser session becomes a
    // real, identifiable user. Trigger the welcome video here too — it's
    // idempotent so it won't fire twice if the user was already registered.
    triggerWelcomeAvatarVideoAsync(linkedIdentity.userId);

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      userId: linkedIdentity.userId,
      previousSessionId: sourceSessionId,
      source: linkedIdentity.userId === sourceSessionId ? "linked" : "captured",
      token,
      user,
      futureAuthReady: true,
    });

    attachSessionCookie(response, token);

    logInfo("CHAT", "auth_capture_email_completed", {
      previousSessionId: sourceSessionId,
      userId: linkedIdentity.userId,
      email: user.email,
    });

    notifyAdmin(
      buildAdminAlert({
        tipo: "email_captured",
        userId: linkedIdentity.userId,
        email: normalizeEmail(rawEmail),
      })
    );

    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "INVALID_SESSION_TOKEN",
        },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    if (error instanceof IdentityLinkConflictError) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "IDENTITY_ALREADY_LINKED",
          message:
            "Esta sesión ya está vinculada a otro email. El cambio de cuenta llegará en una fase posterior.",
        },
        { status: 409 }
      );
    }

    logError("CHAT", error, { route: "/api/auth/capture-email", method: "POST" });
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "CAPTURE_EMAIL_FAILED",
      },
      { status: 500 }
    );
  }
}
