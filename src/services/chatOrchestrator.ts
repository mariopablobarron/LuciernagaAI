import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  bootstrapSessionIdentity,
} from "@/lib/auth";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getErrorMessage } from "@/lib/utils";
import { getUserSessionProfile, isSyntheticEmail } from "@/services/user";
import { processMessage } from "@/application/chat/processMessage";
import { PAYWALL_MESSAGE } from "@/services/coach";
import type { UserState } from "@/domain/types";
import { FREE_LIMIT_MESSAGE } from "@/lib/plans";

export function buildErrorResponse(
  message: string,
  status: number,
  state: UserState = "neutral",
  code?: string
): NextResponse {
  return NextResponse.json(
    { success: false, error: message, code, response: message, state },
    { status }
  );
}

function buildHardPaywallMessage(): string {
  return PAYWALL_MESSAGE;
}

export async function orchestrateChat(req: NextRequest): Promise<Response> {
  // ── 1. Parse body ───────────────────────────────────────────────────────
  let body: { message?: string; conversationId?: string; mentorModeId?: string | null };
  try {
    body = (await req.json()) as { message?: string; conversationId?: string; mentorModeId?: string | null };
  } catch (parseError: unknown) {
    logError("CHAT", parseError, { area: "parse_chat_body" });
    return buildErrorResponse("Body inválido en la solicitud", 400, "neutral", "INVALID_BODY");
  }

  // ── 2. Auth (allows anonymous bootstrap for new users) ──────────────────
  let identity: Awaited<ReturnType<typeof bootstrapSessionIdentity>>;
  try {
    identity = await bootstrapSessionIdentity(req);
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      const res = buildErrorResponse(
        "Token inválido o expirado",
        401,
        "neutral",
        "INVALID_SESSION_TOKEN"
      );
      clearSessionCookie(res);
      return res;
    }
    logError("CHAT", e, { area: "resolve_identity" });
    return buildErrorResponse("Error interno del servidor", 500, "neutral", "INTERNAL_ERROR");
  }

  const message = body.message?.trim() ?? "";
  if (!message) {
    return buildErrorResponse(
      "Necesito un mensaje para ayudarte.",
      400,
      "neutral",
      "EMPTY_MESSAGE"
    );
  }

  // ── 3. Email verification gate ────────────────────────────────────────────
  const accessState = await getUserSessionProfile(identity.userId);
  if (!accessState.emailVerified && !isSyntheticEmail(accessState.email)) {
    const res = buildErrorResponse(
      "Verifica tu email para poder chatear.",
      403,
      "neutral",
      "EMAIL_NOT_VERIFIED"
    );
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  }

  // ── 4. Plan limit ────────────────────────────────────────────────────────
  if (
    !accessState.hasPlan &&
    accessState.messageLimitPerDay !== null &&
    accessState.messagesUsedToday >= accessState.messageLimitPerDay
  ) {
    const hardPaywallMessage = buildHardPaywallMessage();
    const res = NextResponse.json(
      {
        success: false,
        error: `${hardPaywallMessage}\n\n${FREE_LIMIT_MESSAGE}`,
        response: `${hardPaywallMessage}\n\n${FREE_LIMIT_MESSAGE}`,
        state: "neutral",
        code: "PLAN_LIMIT_REACHED",
        plan: accessState.planLabel,
        subscriptionStatus: accessState.subscriptionStatus,
        messagesUsedToday: accessState.messagesUsedToday,
        messageLimitPerDay: accessState.messageLimitPerDay,
      },
      { status: 403 }
    );
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  }

  // ── 5. Rate limit ────────────────────────────────────────────────────────
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const rateLimits = [
    checkRateLimit(`chat:burst:${identity.userId}`, 5, 60_000),
    checkRateLimit(`chat:hour:${identity.userId}`, 30, 3_600_000),
    checkRateLimit(`chat:ip:${ip}`, 100, 3_600_000),
  ];
  const blocked = rateLimits.find((r) => !r.allowed);
  if (blocked) {
    const isHourly = blocked.retryAfterSeconds > 60;
    const res = NextResponse.json(
      {
        success: false,
        error: isHourly
          ? "Has alcanzado el límite por hora. Vuelve en unos minutos."
          : "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
        response: isHourly
          ? "Has alcanzado el límite por hora. Vuelve en unos minutos."
          : "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
        state: "neutral",
        retryAfterSeconds: blocked.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(blocked.retryAfterSeconds),
          "X-RateLimit-Limit": String(blocked.limit),
          "X-RateLimit-Remaining": String(blocked.remaining),
        },
      }
    );
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  }

  // ── 6. Process ───────────────────────────────────────────────────────────
  const jsonMode =
    process.env.NODE_ENV === "test" ||
    req.headers.get("x-response-mode") === "json" ||
    req.nextUrl.searchParams.get("responseMode") === "json";

  const result = await processMessage({
    userId: identity.userId,
    message,
    conversationId: body.conversationId,
    mentorModeId: typeof body.mentorModeId === "string" ? body.mentorModeId : null,
    session: {
      isAnonymous: accessState.isAnonymous,
      hasPlan: accessState.hasPlan,
      userPlan: accessState.hasPlan ? "pro" : "free",
      messageLimitPerDay: accessState.messageLimitPerDay,
      messagesUsedToday: accessState.messagesUsedToday,
      planLabel: accessState.planLabel,
      subscriptionStatus: accessState.subscriptionStatus,
    },
    jsonMode,
  });

  // ── 7. Return ──────────────────────────────────────────────────────────
  if ("stream" in result) {
    const isProduction = process.env.NODE_ENV === "production";
    const headers: Record<string, string> = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Desactiva el buffering de Nginx/Coolify para que los chunks lleguen
      // al cliente según se emiten. Sin esto, un proxy delante agrupa la
      // respuesta y el usuario ve 9 s de pantalla en blanco + todo de golpe.
      "X-Accel-Buffering": "no",
    };
    if (identity.shouldSetCookie && identity.sessionToken) {
      headers["Set-Cookie"] =
        `mw_session=${identity.sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isProduction ? "; Secure" : ""}`;
    }
    return new Response(result.stream, { headers });
  }

  const res = NextResponse.json(result.data);
  if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
  return res;
}
