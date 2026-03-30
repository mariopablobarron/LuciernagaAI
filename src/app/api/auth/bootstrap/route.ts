import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";

function buildBootstrapResponse(req: NextRequest): NextResponse {
  const identity = bootstrapSessionIdentity(req);

  const response = NextResponse.json({
    ok: true,
    userId: identity.userId,
    source: identity.source,
  });

  if (identity.shouldSetCookie) {
    attachSessionCookie(response, identity.sessionToken);

    const cookie = response.headers.get("set-cookie") || "";
    if (!cookie.includes("mw_session=")) {
      logError("CHAT", new Error("Session cookie was not attached"), {
        route: "auth-bootstrap",
        userId: identity.userId,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "SESSION_COOKIE_NOT_SET",
          message: "No se pudo establecer la sesión en el navegador.",
        },
        { status: 500 }
      );
    }
  }

  logInfo("CHAT", "session_bootstrap_completed", {
    source: identity.source,
    userId: identity.userId,
    shouldSetCookie: identity.shouldSetCookie,
  });

  return response;
}

export async function GET(req: NextRequest) {
  try {
    return buildBootstrapResponse(req);
  } catch (error: unknown) {
    logError("CHAT", error, { route: "auth-bootstrap-get" });
    return NextResponse.json(
      {
        ok: false,
        error: "SESSION_BOOTSTRAP_FAILED",
        message: "No se pudo inicializar la sesión.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    return buildBootstrapResponse(req);
  } catch (error: unknown) {
    logError("CHAT", error, { route: "auth-bootstrap-post" });
    return NextResponse.json(
      {
        ok: false,
        error: "SESSION_BOOTSTRAP_FAILED",
        message: "No se pudo inicializar la sesión.",
      },
      { status: 500 }
    );
  }
}
