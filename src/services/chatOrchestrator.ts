import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  bootstrapSessionIdentity,
} from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { assessInputQuality, buildAmbiguousInputResponse } from "@/services/input-quality";
import { detectLanguageRequest, detectMessageLanguage } from "@/services/language-request";
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

const CHAT_LOCALES = ["es", "en", "pt", "fr", "de"] as const;
type ChatLocale = (typeof CHAT_LOCALES)[number];
function isChatLocale(v: string | null | undefined): v is ChatLocale {
  return !!v && (CHAT_LOCALES as readonly string[]).includes(v);
}

/**
 * Locale de la petición para mensajes de error/gate: body.locale > cookie
 * NEXT_LOCALE > referer path > "es". Mismo orden que la resolución principal
 * del mentor (más abajo). Se usa en los returns tempranos, que ocurren antes
 * de esa resolución, para no dejar errores del chat en español fijo.
 */
function resolveRequestLocale(req: NextRequest, body?: unknown): ChatLocale {
  const bodyLocale =
    body && typeof body === "object" ? (body as Record<string, unknown>).locale : undefined;
  if (typeof bodyLocale === "string" && isChatLocale(bodyLocale)) return bodyLocale;
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  if (isChatLocale(cookieLocale)) return cookieLocale;
  try {
    const seg = new URL(req.headers.get("referer") ?? "").pathname.split("/")[1];
    if (isChatLocale(seg)) return seg;
  } catch {
    // referer ausente/malformado → default
  }
  return "es";
}

type ChatErrorCode =
  | "INVALID_BODY"
  | "INVALID_SESSION_TOKEN"
  | "INTERNAL_ERROR"
  | "EMPTY_MESSAGE"
  | "EMAIL_NOT_VERIFIED"
  | "RATE_LIMIT_HOURLY"
  | "RATE_LIMIT_BURST";

// Mensajes de error/gate localizados. ES fuente, EN revisado; PT/FR/DE
// pendientes de revisión nativa (no técnicos → traducción directa segura).
const CHAT_ERROR_MESSAGES: Record<ChatErrorCode, Record<ChatLocale, string>> = {
  INVALID_BODY: {
    es: "Body inválido en la solicitud",
    en: "Invalid request body",
    pt: "Corpo do pedido inválido",
    fr: "Corps de la requête invalide",
    de: "Ungültiger Anfragetext",
  },
  INVALID_SESSION_TOKEN: {
    es: "Token inválido o expirado",
    en: "Invalid or expired token",
    pt: "Token inválido ou expirado",
    fr: "Jeton invalide ou expiré",
    de: "Ungültiger oder abgelaufener Token",
  },
  INTERNAL_ERROR: {
    es: "Error interno del servidor",
    en: "Internal server error",
    pt: "Erro interno do servidor",
    fr: "Erreur interne du serveur",
    de: "Interner Serverfehler",
  },
  EMPTY_MESSAGE: {
    es: "Necesito un mensaje para ayudarte.",
    en: "I need a message to help you.",
    pt: "Preciso de uma mensagem para te ajudar.",
    fr: "J'ai besoin d'un message pour t'aider.",
    de: "Ich brauche eine Nachricht, um dir zu helfen.",
  },
  EMAIL_NOT_VERIFIED: {
    es: "Verifica tu email para poder chatear.",
    en: "Verify your email to start chatting.",
    pt: "Verifica o teu email para poderes conversar.",
    fr: "Vérifie ton e-mail pour pouvoir discuter.",
    de: "Bestätige deine E-Mail, um chatten zu können.",
  },
  RATE_LIMIT_HOURLY: {
    es: "Has alcanzado el límite por hora. Vuelve en unos minutos.",
    en: "You've hit the hourly limit. Come back in a few minutes.",
    pt: "Atingiste o limite por hora. Volta daqui a uns minutos.",
    fr: "Tu as atteint la limite horaire. Reviens dans quelques minutes.",
    de: "Du hast das Stundenlimit erreicht. Komm in ein paar Minuten wieder.",
  },
  RATE_LIMIT_BURST: {
    es: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
    en: "Too many requests. Try again in a few seconds.",
    pt: "Demasiados pedidos. Tenta de novo daqui a uns segundos.",
    fr: "Trop de requêtes. Réessaie dans quelques secondes.",
    de: "Zu viele Anfragen. Versuch es in ein paar Sekunden erneut.",
  },
};

function chatErr(code: ChatErrorCode, locale: ChatLocale): string {
  return CHAT_ERROR_MESSAGES[code][locale] ?? CHAT_ERROR_MESSAGES[code].es;
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
    return buildErrorResponse(
      chatErr("INVALID_BODY", resolveRequestLocale(req)),
      400,
      "neutral",
      "INVALID_BODY"
    );
  }

  // ── 2. Auth (allows anonymous bootstrap for new users) ──────────────────
  let identity: Awaited<ReturnType<typeof bootstrapSessionIdentity>>;
  try {
    identity = await bootstrapSessionIdentity(req);
  } catch (e: unknown) {
    if (e instanceof InvalidSessionTokenError) {
      const res = buildErrorResponse(
        chatErr("INVALID_SESSION_TOKEN", resolveRequestLocale(req, body)),
        401,
        "neutral",
        "INVALID_SESSION_TOKEN"
      );
      clearSessionCookie(res);
      return res;
    }
    logError("CHAT", e, { area: "resolve_identity" });
    return buildErrorResponse(
      chatErr("INTERNAL_ERROR", resolveRequestLocale(req, body)),
      500,
      "neutral",
      "INTERNAL_ERROR"
    );
  }

  const message = body.message?.trim() ?? "";
  if (!message) {
    return buildErrorResponse(
      chatErr("EMPTY_MESSAGE", resolveRequestLocale(req, body)),
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
    const safeLocale = (["es","en","pt","fr","de"].includes(localeRaw) ? localeRaw : "es") as
      | "es" | "en" | "pt" | "fr" | "de";
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
      chatErr("EMAIL_NOT_VERIFIED", resolveRequestLocale(req, body)),
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
    const rlMsg = chatErr(
      isHourly ? "RATE_LIMIT_HOURLY" : "RATE_LIMIT_BURST",
      resolveRequestLocale(req, body)
    );
    const res = NextResponse.json(
      {
        success: false,
        error: rlMsg,
        response: rlMsg,
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
  const SUPPORTED_LOCALES = ["es", "en", "pt", "fr", "de"] as const;
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

  // ── 5b. Detector de cambio de idioma en el mensaje del usuario ──────────
  // Si el usuario dice "en inglés" / "em português" / etc. → override del
  // locale + persistir en User.locale. El mentor le hace caso desde ESTE
  // turn. Auditoría 2026-05-25 reveló que antes el mentor rechazaba con
  // "Respondo siempre en español, trabajo mejor así" — comportamiento
  // inaceptable.
  const languageReq = detectLanguageRequest(message, locale);
  if (languageReq.changed) {
    locale = languageReq.newLocale;
    logInfo("CHAT", "language_override_from_chat", {
      __route: "/api/chat",
      __userId: identity.userId,
      from: bodyLocale ?? "?",
      to: languageReq.newLocale,
    });
    // Persistir en BD fire-and-forget — el siguiente turn también vendrá en
    // el nuevo idioma porque el cliente refrescará cookie en el próximo render.
    // Si la persistencia falla, no bloqueamos el chat.
    (async () => {
      try {
        const { getPrismaClient } = await import("@/db/prisma");
        const prisma = getPrismaClient();
        await prisma.user.update({
          where: { id: identity.userId },
          data: { locale: languageReq.newLocale },
        });
      } catch (e) {
        logError("CHAT", e, { __userId: identity.userId, area: "persist_locale_override" });
      }
    })();
  } else {
    // ── 5c. Auto-detección por idioma del propio mensaje ────────────────
    // Si el usuario no pidió cambio explícito pero escribió en un idioma
    // distinto al UI (caso "Hi, how are you?" desde /es), respondemos en
    // SU idioma SOLO para esta request. NO persistimos: UI sigue en /es,
    // cookie intacta, próximo mensaje se evalúa de nuevo. Si vuelve al
    // español, el coach también vuelve. Conversación multilingüe natural.
    const messageLang = detectMessageLanguage(message, locale);
    if (messageLang.detected) {
      logInfo("CHAT", "language_override_autodetect", {
        __route: "/api/chat",
        __userId: identity.userId,
        from: locale,
        to: messageLang.locale,
      });
      locale = messageLang.locale;
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
