import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  bootstrapSessionIdentity,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";

function buildSessionResponse(identity: {
  userId: string;
  source: string;
  sessionToken: string;
  shouldSetCookie: boolean;
}): NextResponse {
  return NextResponse.json({
    success: true,
    authenticated: true,
    userId: identity.userId,
    source: identity.source,
    token: identity.sessionToken,
  });
}

export async function GET(req: NextRequest) {
  try {
    const identity = resolveIdentity(req);
    const response = buildSessionResponse(identity);

    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }

    logInfo("CHAT", "auth_token_validated", {
      userId: identity.userId,
      source: identity.source,
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

    logError("CHAT", error, { route: "/api/auth/token", method: "GET" });
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "TOKEN_VALIDATION_FAILED",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = bootstrapSessionIdentity(req);
    const response = buildSessionResponse(identity);

    if (identity.sessionToken) {
      attachSessionCookie(response, identity.sessionToken);
    }

    logInfo("CHAT", "auth_token_issued", {
      userId: identity.userId,
      source: identity.source,
      shouldSetCookie: true,
    });

    return response;
  } catch (error: unknown) {
    logError("CHAT", error, { route: "/api/auth/token", method: "POST" });
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "TOKEN_ISSUE_FAILED",
      },
      { status: 500 }
    );
  }
}
