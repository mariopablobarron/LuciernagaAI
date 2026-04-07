import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { buildAdminAlert, notifyAdmin } from "@/services/telegram";
import { sendWelcomeSequence } from "@/services/telegramOnboarding";
import { getPrismaClient } from "@/db/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

async function buildBootstrapResponse(req: NextRequest): Promise<NextResponse> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const rl = checkRateLimit(`bootstrap:ip:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "TOO_MANY_REQUESTS" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const identity = await bootstrapSessionIdentity(req);

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

  // New user: notify admin + send Telegram welcome if they came via bot
  if (identity.source === "generated") {
    notifyAdmin(buildAdminAlert({ tipo: "new_user", userId: identity.userId }));

    // If the user came from Telegram (tg_ prefix), fire welcome sequence
    if (identity.userId.startsWith("tg_")) {
      const telegramId = identity.userId.replace("tg_", "");
      const prisma = getPrismaClient();
      const user = await prisma.user.findUnique({
        where: { id: identity.userId },
        select: { telegramId: true },
      }).catch(() => null);

      const resolvedId = user?.telegramId ?? telegramId;
      void sendWelcomeSequence(identity.userId, resolvedId).catch((err) =>
        logError("CHAT", err instanceof Error ? err : new Error(String(err)), { context: "sendWelcomeSequence", userId: identity.userId }),
      );
    }
  }

  return response;
}

export async function GET(req: NextRequest) {
  try {
    return await buildBootstrapResponse(req);
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
    return await buildBootstrapResponse(req);
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
