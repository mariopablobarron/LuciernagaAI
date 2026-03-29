import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";

function buildTokenResponse(req: NextRequest): NextResponse {
  const identity = resolveIdentity(req);
  const response = NextResponse.json({
    ok: true,
    token: identity.sessionToken,
    userId: identity.userId,
    source: identity.source,
  });

  if (identity.shouldSetCookie) {
    attachSessionCookie(response, identity.sessionToken);
  }

  logInfo("CHAT", "session_token_issued", {
    source: identity.source,
    userId: identity.userId,
  });

  return response;
}

export async function GET(req: NextRequest) {
  try {
    return buildTokenResponse(req);
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = NextResponse.json(
        { ok: false, error: "INVALID_SESSION_TOKEN" },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    logError("CHAT", error, { route: "auth-token-get" });
    return NextResponse.json(
      { ok: false, error: "TOKEN_ISSUE_FAILED" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    return buildTokenResponse(req);
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = NextResponse.json(
        { ok: false, error: "INVALID_SESSION_TOKEN" },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }

    logError("CHAT", error, { route: "auth-token-post" });
    return NextResponse.json(
      { ok: false, error: "TOKEN_ISSUE_FAILED" },
      { status: 500 }
    );
  }
}
