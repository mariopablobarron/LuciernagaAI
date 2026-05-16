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
import type { UserState } from "@/domain/types";

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
  // El chat es ilimitado para todos. Pro se diferencia por extras (continuidad
  // cross-device, memoria persistente, Modo Impulso, prioridad), no por cap.
  // El bloqueo PLAN_LIMIT_REACHED se eliminó en abril 2026.

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

  // Detect country from edge proxy headers (Cloudflare / Vercel) so crisis
  // responses can route to the right local hotlines (024 ES, 988 US, 188 BR, etc.)
  const countryHeader =
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("x-country");
  const countryCode =
    countryHeader && /^[A-Za-z]{2}$/.test(countryHeader) ? countryHeader.toUpperCase() : null;

  // Detect active locale (es/en/pt/fr) from:
  //   1. Explicit body.locale (cliente lo puede mandar)
  //   2. Referer URL path (/en/*, /pt/*, /fr/* → locale; otherwise → es)
  //
  // Determina el idioma EN EL QUE responde el mentor + qué recursos de crisis
  // sugerir (024 ES, 988 EN, SNS 24 PT, 3114 FR). No depende del país real del
  // usuario sino de la versión del sitio que está usando.
  const SUPPORTED_LOCALES = ["es", "en", "pt", "fr"] as const;
  type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
  let locale: SupportedLocale = "es";
  const bodyLocale = (body as Record<string, unknown>).locale;
  if (typeof bodyLocale === "string" && SUPPORTED_LOCALES.includes(bodyLocale as SupportedLocale)) {
    locale = bodyLocale as SupportedLocale;
  } else {
    const referer = req.headers.get("referer") ?? "";
    try {
      const path = new URL(referer).pathname;
      const seg = path.split("/")[1];
      if (seg && SUPPORTED_LOCALES.includes(seg as SupportedLocale)) {
        locale = seg as SupportedLocale;
      }
    } catch {
      // Referer ausente o malformado — mantener default "es"
    }
  }

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
    countryCode,
    locale,
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
