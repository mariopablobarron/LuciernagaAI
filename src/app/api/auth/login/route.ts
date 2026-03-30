import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import {
  getUserSessionProfile,
  IdentityLinkConflictError,
  normalizeEmail,
} from "@/services/user";

type LoginBody = {
  email?: string;
  name?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginBody;
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

    const identity = await resolveIdentity(req, {
      allowAnonymousBootstrap: true,
      email: normalizeEmail(rawEmail),
      name: body.name,
    });
    const user = await getUserSessionProfile(identity.userId);

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      userId: identity.userId,
      source: identity.source,
      token: identity.sessionToken,
      user,
    });

    if (identity.sessionToken) {
      attachSessionCookie(response, identity.sessionToken);
    }

    logInfo("CHAT", "auth_login_completed", {
      userId: identity.userId,
      source: identity.source,
      email: user.email,
    });

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

    logError("CHAT", error, { route: "/api/auth/login", method: "POST" });
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "LOGIN_FAILED",
      },
      { status: 500 }
    );
  }
}
