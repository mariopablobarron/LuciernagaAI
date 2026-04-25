import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, bootstrapSessionIdentity } from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { buildAdminAlert, notifyAdmin } from "@/services/telegram";
import { sendWelcomeSequence } from "@/services/telegramOnboarding";
import { getPrismaClient } from "@/db/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestContext, formatDevice, maskIp } from "@/lib/request-info";

// Crawlers/monitoring conocidos. Si cae alguno, respondemos 200 sin crear
// User en BD. No queremos ensuciar métricas con bots ni disparar alertas
// a cada ping de UptimeRobot/cron-job.org.
const BOT_UA_PATTERN =
  /(bot|crawl|spider|slurp|bingpreview|uptime|pingdom|monitor|curl|wget|go-http|python-requests|headlesschrome|puppeteer|playwright|lighthouse|semrush|ahrefs|mj12|dotbot|duckduck|yandex|baidu|sogou|facebookexternalhit|whatsapp|telegrambot|gptbot|claudebot|anthropic-ai|perplexitybot|ccbot|bytespider)/i;

function isBotUserAgent(ua: string | null): boolean {
  if (!ua) return true; // sin UA legítimo — tratamos como bot
  return BOT_UA_PATTERN.test(ua);
}

async function buildBootstrapResponse(req: NextRequest): Promise<NextResponse> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const rl = checkRateLimit(`bootstrap:ip:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "TOO_MANY_REQUESTS" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  // Short-circuit para crawlers: no creamos User ni emitimos cookie.
  const ua = req.headers.get("user-agent");
  if (isBotUserAgent(ua)) {
    return NextResponse.json({ ok: false, error: "BOT_BLOCKED" }, { status: 200 });
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

  // Nuevo anónimo humano: SÍ alertamos al admin. La herramienta está
  // pensada para usuarios que entran sin dejar datos; saber cuándo entra
  // uno es señal útil de producto. Los bots ya se cortaron arriba con el
  // filtro de User-Agent, así que lo que llega aquí es humano real.
  if (identity.source === "generated") {
    const reqCtx = getRequestContext(req);
    notifyAdmin(
      buildAdminAlert({
        tipo: "new_user",
        userId: identity.userId,
        ctx: {
          device: formatDevice(reqCtx.ua),
          language: reqCtx.language,
          referer: reqCtx.referer,
          country: reqCtx.country,
          city: reqCtx.city,
          ip: maskIp(reqCtx.ip),
        },
      })
    );

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
