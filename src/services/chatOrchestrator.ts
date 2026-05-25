import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  bootstrapSessionIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { assessInputQuality, buildAmbiguousInputResponse } from "@/services/input-quality";
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
  let body: {
    message?: string;
    conversationId?: string;
    mentorModeId?: string | null;
    mentorPrefs?: { noInterpretation?: boolean; verbosity?: number } | null;
  };
  try {
    body = (await req.json()) as typeof body;
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

  // ── 2b. Intercept para input ambiguo (gibberish / muy corto) ─────────────
  // Auditoría 2026-05-25 reveló convo con "Hoka"/"Hzhshdhs"/"No lo se" → el
  // mentor respondía la MISMA plantilla 3 veces. Ahora: detectamos antes de
  // pegar al LLM (cero coste, respuesta instantánea, variantes rotadas).
  //
  // Para `ambiguous_short_reply` (sí/no/ok) NO interceptamos — esas son
  // respuestas válidas cuando hay contexto previo.
  const inputQuality = assessInputQuality(message);
  if (inputQuality.kind === "too_short" || inputQuality.kind === "gibberish") {
    // Locale para la respuesta scripted — mismo orden de prioridad que el
    // resto del orchestrator (body.locale > cookie > "es").
    const localeRaw =
      ((body as Record<string, unknown>).locale as string | undefined) ??
      req.cookies.get("NEXT_LOCALE")?.value ??
      "es";
    const safeLocale = (["es","en","pt","fr"].includes(localeRaw) ? localeRaw : "es") as
      | "es" | "en" | "pt" | "fr";
    // Rotación basada en segundo actual → si el usuario manda 2 gibberish
    // seguidos, la variante NO se repite literal.
    const turnIdx = Math.floor(Date.now() / 1000);
    const scripted = buildAmbiguousInputResponse(safeLocale, turnIdx);

    logInfo("CHAT", "input_ambiguous_intercepted", {
      __route: "/api/chat",
      __userId: identity.userId,
      kind: inputQuality.kind,
      reason: "reason" in inputQuality ? inputQuality.reason : undefined,
      messageLength: message.length,
    });

    // SSE stream con UN solo chunk con la respuesta scripted + meta.
    // El cliente ya sabe parsear SSE estándar del chat.
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", delta: scripted })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "meta", success: true, state: "neutral", intercepted: "ambiguous_input" })}\n\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
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

  // Detect active locale (es/en/pt/fr) en este orden de prioridad:
  //   1. body.locale explícito (el cliente puede mandarlo)
  //   2. cookie NEXT_LOCALE (la que setea LocaleSwitcher + middleware i18n).
  //      Esta es la fuente de verdad para la mayoría de páginas porque viven
  //      fuera del segmento [locale] y se traducen vía cookie.
  //   3. Referer URL path (/en/*, /pt/*, /fr/* → locale). Cubre el caso de
  //      landing pura sin cookie todavía.
  //   4. Default "es".
  //
  // Determina el idioma EN EL QUE responde el mentor + qué recursos de crisis
  // sugerir (024 ES, 988 EN, SNS 24 PT, 3114 FR). No depende del país real
  // del usuario sino de la versión del sitio que está usando.
  const SUPPORTED_LOCALES = ["es", "en", "pt", "fr"] as const;
  type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
  function isSupported(v: string | null | undefined): v is SupportedLocale {
    return !!v && (SUPPORTED_LOCALES as readonly string[]).includes(v);
  }

  let locale: SupportedLocale = "es";
  const bodyLocale = (body as Record<string, unknown>).locale;
  if (typeof bodyLocale === "string" && isSupported(bodyLocale)) {
    locale = bodyLocale;
  } else {
    const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
    if (isSupported(cookieLocale)) {
      locale = cookieLocale;
    } else {
      const referer = req.headers.get("referer") ?? "";
      try {
        const path = new URL(referer).pathname;
        const seg = path.split("/")[1];
        if (isSupported(seg)) {
          locale = seg;
        }
      } catch {
        // Referer ausente o malformado — mantener default "es"
      }
    }
  }

  const result = await processMessage({
    userId: identity.userId,
    message,
    conversationId: body.conversationId,
    mentorModeId: typeof body.mentorModeId === "string" ? body.mentorModeId : null,
    mentorPrefs: body.mentorPrefs ?? null,
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
