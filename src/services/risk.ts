import { getPrismaClient } from "@/db/prisma";
import { PRODUCT_DISCLAIMERS, RESPONSIBLE_USE_NOTES, formatCrisisResourceLines } from "@/lib/legal";
import { logError, logInfo } from "@/lib/logger";
import { dispatchN8nEvent } from "@/lib/n8n";
import { buildAdminAlert, notifyAdmin } from "@/services/telegram";
import { safeFamilyNotify, notifyTrustedContactOnCrisis } from "@/services/family";
import { getHotlinesForCountry, formatHotlinesInline } from "@/lib/crisis-hotlines";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type CrisisResponse = {
  response: string;
  resources: string[];
  shouldEscalate: boolean;
  legalFlag: boolean;
  disclaimer: string;
  continueChat: boolean;
};

export type CrisisEventPayload = {
  userId: string;
  level: RiskLevel;
  message: string;
  response: string;
};

export type CrisisStats = {
  total: number;
  high: number;
  critical: number;
  latestEventAt: string | null;
};

export type CrisisEventListItem = {
  userId: string;
  level: "high" | "critical";
  message: string;
  createdAt: string;
};

type CrisisEventDelegate = {
  create: (args: { data: CrisisEventPayload }) => Promise<unknown>;
  findMany: (args: {
    where: { createdAt: { gte: Date }; level?: { in: RiskLevel[] } };
    select: {
      level?: true;
      createdAt?: true;
      userId?: true;
      message?: true;
    };
    orderBy: { createdAt: "desc" };
    take: number;
  }) => Promise<
    Array<{
      level: string;
      createdAt: Date;
      userId?: string;
      message?: string;
    }>
  >;
};

// Patrones de detección de riesgo. La sensibilidad es ALTA por diseño:
// preferimos falsos positivos (alerta innecesaria) a falsos negativos
// (perder un caso real). En mental health la asimetría justifica el trade-off.
//
// IMPORTANTE para futuras ediciones:
// - Texto se normaliza con normalizeText() (lowercase + strip de tildes).
//   Por eso las regex NO usan tildes ni mayúsculas.
// - Cubrir variantes: typos comunes (kero/kiero), inglés básico (mucho usuario
//   escribe "kill myself" o "i wanna die"), conjugaciones (singular/plural,
//   m/f), eufemismos clínicamente conocidos.
// - Los patrones se evalúan en orden CRITICAL → HIGH → MEDIUM y se devuelve
//   el primero que matchee. Si dudas dónde meter algo nuevo, prefiere subir el
//   nivel (high es seguro; low se le escapa al intercept).

const CRITICAL_PATTERNS: RegExp[] = [
  // Intencionalidad explícita (ES)
  /\b(me quiero matar|me kiero matar|kero matarme|quiero matarme|quiero morir|kero morir|no quiero vivir|no kiero vivir)\b/,
  /\b(voy a matarme|me voy a matar|me mato|me matare)\b/,
  /\b(suicid(a|io|arme|armi)|autolesion|autolesionarme|hacerme dano|hacerme daño)\b/,
  /\b(matar a alguien|matarlos a todos|hacer dano a otros|hacer daño a otros)\b/,
  // Inminencia / temporalidad concreta
  /\b(esta noche termino todo|hoy termino todo|hoy acabo con todo|esta noche acabo con todo)\b/,
  /\b(me voy a quitar la vida|me quito la vida|me voy a quitar de en medio)\b/,
  /\b(voy a acabar con (todo|mi vida|esto|conmigo))\b/,
  /\b(acabar conmigo|acabar con mi vida|terminar con mi vida|terminar con todo ya)\b/,
  // Plan / método concreto (instrumentalidad)
  /\b(tengo (las |el )?(pastillas|cuchillo|cuerda|pistola|navaja) (lista|listas|listo|preparada|preparado))\b/,
  /\b(ya tengo (decidido|el plan|todo planeado|fecha))\b/,
  /\b(tomar(e)? una decision final|hacer lo que tengo que hacer)\b/,
  // Inglés básico (usuarios bilingües / mensajes mixtos)
  /\b(kill myself|killing myself|i wanna die|i want to die|end my life|ending my life|commit suicide)\b/,
  /\b(suicide note|suicide plan|i'?m going to end it|suicidal thoughts|suicidal ideation|thinking about suicide|suicide tonight|suicide today)\b/,
];

const HIGH_PATTERNS: RegExp[] = [
  // Desesperanza profunda
  /\b(no puedo mas|no puedo más|no aguanto mas|no aguanto más|no aguanto nada|estoy al limite|estoy al límite)\b/,
  /\b(todo da igual|nada tiene sentido|no tiene sentido seguir|no le encuentro sentido a nada)\b/,
  /\b(no merece la pena (seguir|vivir)|no vale la pena (seguir|vivir|nada)|para que (seguir|vivir|levantarme))\b/,
  /\b(ya nada (importa|tiene valor)|nada (vale|sirve) ya|nada me llena)\b/,
  // Ideación pasiva (no querer estar, eufemismos clínicos comunes)
  /\b(quiero desaparecer|me quiero (ir|marchar) para siempre|quiero irme para siempre)\b/,
  /\b(ojala no (despertara|despierte|estuviera) (manana|mañana|aqui|aquí))\b/,
  /\b(no me importaria no (estar|despertar|seguir))\b/,
  /\b(seria mejor (no haber nacido|estar muerto|que no existiera|si yo no estuviera|para todos si yo))\b/,
  /\b(no quiero seguir (aqui|aquí|asi|así|viviendo|vivo|sintiendo esto))\b/,
  /\b(quiero que (esto|todo) termine ya)\b/,
  /\b(a veces pienso en (desaparecer|no estar|quitarme))\b/,
  // Auto-rechazo intenso
  /\b(me odio|odio mi vida|odio existir|odio ser yo)\b/,
  /\b(soy una carga|soy un estorbo|el mundo (estaria|estaría) mejor sin mi|todos estarian mejor sin mi)\b/,
  // Estados de "muerto en vida"
  /\b(estoy roto[a]? por dentro|muerto en vida|estoy muerto[a]? por dentro|me siento vacio[a]? del todo)\b/,
  /\b(estoy harto[a]? de (la vida|todo|seguir|existir|vivir))\b/,
  /\b(dolor (insoportable|inaguantable|intolerable))\b/,
  // Inglés básico
  /\b(can'?t go on|can'?t take it anymore|nothing matters|i hate my life|i hate myself|i'?m broken inside)\b/,
];

const MEDIUM_PATTERNS: RegExp[] = [
  /\b(me siento hundid[oa]|estoy muy mal|estoy fatal|me sobrepasa|me supera todo)\b/,
  /\b(ansiedad muy fuerte|ataque de ansiedad|ataque de panico|panico)\b/,
  /\b(no veo (salida|luz)|estoy desbordad[oa]|me siento rot[oa])\b/,
  /\b(siento que me ahogo|me asfixia (todo|esto|la vida)|no puedo respirar)\b/,
  /\b(lloro sin parar|llevo dias llorando|no paro de llorar)\b/,
  /\bno (como|duermo)( nada| bien| apenas| casi nada)?\s+(hace|desde|desde hace)\s+(dias|días|semanas|meses)\b/,
  /\b(me siento vacio[a]?|tengo miedo de mi mismo[a]?|tengo miedo de hacer algo)\b/,
  // Dependencia emocional patológica
  /\b(no puedo vivir sin (el|ella|ti)|sin (el|ella|ti) no soy nada)\b/,
  /\b(dependo completamente de|necesito que (me quiera|este conmigo|no me deje))\b/,
  /\b(si me deja me muero|sin (el|ella) no tengo sentido)\b/,
];

const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

function normalizeText(message: string): string {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getRiskPriority(level: RiskLevel): number {
  return RISK_ORDER.indexOf(level);
}

function getCrisisEventDelegate(): CrisisEventDelegate | null {
  const prisma = getPrismaClient() as unknown as { crisisEvent?: CrisisEventDelegate };
  return prisma.crisisEvent ?? null;
}

export function classifyRisk(message: string): RiskLevel {
  const normalized = normalizeText(message);

  if (CRITICAL_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "critical";
  }

  if (HIGH_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "high";
  }

  if (MEDIUM_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "medium";
  }

  return "low";
}

export function detectRiskLevel(message: string, context: string[] = []): RiskLevel {
  const allMessages = [...context.slice(-5), message];
  let maxLevel: RiskLevel = "low";

  for (const item of allMessages) {
    const current = classifyRisk(item);
    if (getRiskPriority(current) > getRiskPriority(maxLevel)) {
      maxLevel = current;
    }
  }

  return maxLevel;
}

export function getCrisisResponse(level: RiskLevel, countryCode?: string | null): CrisisResponse {
  const resources = formatCrisisResourceLines();
  const disclaimer = `${PRODUCT_DISCLAIMERS[0]} ${RESPONSIBLE_USE_NOTES[1]}`;
  const country = getHotlinesForCountry(countryCode ?? null);
  const hotlinesInline = formatHotlinesInline(country);

  if (level === "critical") {
    return {
      response: `Voy a frenar el flujo normal aquí porque tu seguridad va primero. Busca apoyo humano inmediato ahora mismo. ${hotlinesInline} No te quedes con esto a solas; avisa ya a una persona real de confianza para que esté contigo.\n\n${disclaimer}\n\nCuando estés en un lugar seguro y con alguien de confianza, escríbeme "ya estoy acompañado" y continuamos juntos.`,
      resources,
      shouldEscalate: true,
      legalFlag: true,
      disclaimer,
      continueChat: false,
    };
  }

  if (level === "high") {
    return {
      response: `No voy a seguir con el flujo normal de la conversación porque aquí lo prioritario es tu seguridad. Quiero que contactes hoy, ahora, con una persona real de confianza y con ayuda profesional. ${hotlinesInline}\n\n${disclaimer}\n\nCuando estés en un lugar seguro, escríbeme "ya estoy acompañado" y seguimos.`,
      resources,
      shouldEscalate: true,
      legalFlag: true,
      disclaimer,
      continueChat: false,
    };
  }

  if (level === "medium") {
    return {
      response: `Lo que te pasa importa y merece cuidado. No tienes que sostener esto en soledad; estoy aquí para acompañarte paso a paso. Si en algún momento se vuelve demasiado intenso, busca apoyo de una persona real de confianza. ${hotlinesInline}\n\n${PRODUCT_DISCLAIMERS[0]}`,
      resources: [],
      shouldEscalate: false,
      legalFlag: false,
      disclaimer: PRODUCT_DISCLAIMERS[0],
      continueChat: true,
    };
  }

  return {
    response: `Estoy contigo. Vamos paso a paso. ${PRODUCT_DISCLAIMERS[0]}`,
    resources: [],
    shouldEscalate: false,
    legalFlag: false,
    disclaimer: PRODUCT_DISCLAIMERS[0],
    continueChat: true,
  };
}

export async function registerCrisisEvent(payload: CrisisEventPayload): Promise<void> {
  try {
    const crisisEvent = getCrisisEventDelegate();
    if (!crisisEvent) {
      logInfo("RISK", "crisis_event_delegate_unavailable", {
        userId: payload.userId,
        level: payload.level,
      });
      return;
    }

    await crisisEvent.create({
      data: {
        userId: payload.userId,
        level: payload.level,
        message: payload.message,
        response: payload.response,
      },
    });

    logInfo("RISK", "crisis_event_registered", {
      userId: payload.userId,
      level: payload.level,
    });

    dispatchN8nEvent("crisis.detected", { level: payload.level, message: payload.message }, payload.userId);

    // Notify psychologist/admin immediately for high and critical events
    if (payload.level === "high" || payload.level === "critical") {
      notifyAdmin(
        buildAdminAlert({
          tipo: "crisis",
          userId: payload.userId,
          crisisLevel: payload.level,
          lastMessage: payload.message,
        })
      );
      // Also notify the user's trusted contact (family)
      safeFamilyNotify(
        () => notifyTrustedContactOnCrisis(payload.userId),
        "crisis_trusted_contact",
      );

      // Programar check-in 24h después. El cron /api/cron/scheduled-emails
      // recoge ScheduledEmails con scheduledAt <= now y respeta opt-out
      // (weeklyEmailEnabled=false) + email synthetic anónimos.
      // Fire-and-forget: si falla, no bloqueamos el registro de crisis.
      schedulePostCrisisCheckin(payload.userId).catch((err) => {
        logError("RISK", err, { action: "schedule_post_crisis_checkin_failed", userId: payload.userId });
      });
    }
  } catch (error: unknown) {
    logError("RISK", error, {
      action: "register_crisis_event_failed",
      userId: payload.userId,
      level: payload.level,
    });
  }
}

export async function getRecentCrisisStats(since: Date): Promise<CrisisStats> {
  try {
    const crisisEvent = getCrisisEventDelegate();
    if (!crisisEvent) {
      return {
        total: 0,
        high: 0,
        critical: 0,
        latestEventAt: null,
      };
    }

    const events = await crisisEvent.findMany({
      where: {
        createdAt: { gte: since },
        level: { in: ["high", "critical"] },
      },
      select: {
        level: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const critical = events.filter((event) => event.level === "critical").length;
    const high = events.filter((event) => event.level === "high").length;
    const latestEventAt = events[0]?.createdAt?.toISOString() ?? null;

    return {
      total: events.length,
      high,
      critical,
      latestEventAt,
    };
  } catch (error: unknown) {
    logError("RISK", error, {
      action: "get_recent_crisis_stats_failed",
    });
    return {
      total: 0,
      high: 0,
      critical: 0,
      latestEventAt: null,
    };
  }
}

export async function listRecentCrisisEvents(
  since: Date,
  take = 20
): Promise<CrisisEventListItem[]> {
  try {
    const crisisEvent = getCrisisEventDelegate();
    if (!crisisEvent) {
      return [];
    }

    const safeTake = Math.max(1, Math.min(100, Math.round(take)));
    const events = await crisisEvent.findMany({
      where: {
        createdAt: { gte: since },
        level: { in: ["high", "critical"] },
      },
      select: {
        userId: true,
        level: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: safeTake,
    });

    return events
      .filter((event) => event.level === "high" || event.level === "critical")
      .map((event) => ({
        userId: event.userId || "unknown",
        level: event.level as "high" | "critical",
        message: event.message || "",
        createdAt: event.createdAt.toISOString(),
      }));
  } catch (error: unknown) {
    logError("RISK", error, {
      action: "list_recent_crisis_events_failed",
    });
    return [];
  }
}

/**
 * Programa un email check-in 24h después de un evento de crisis.
 *
 * Tono deliberadamente suave: NO recuerda la crisis, NO pide explicaciones.
 * Solo "estoy aquí si quieres hablar". El hecho de que el producto se
 * acuerde puede valer más que el contenido.
 *
 * Idempotente: si ya hay un ScheduledEmail crisis_followup_24h pendiente
 * de las últimas 26h del mismo userId, NO duplica. Esto evita spam si
 * un usuario activa el panel varias veces seguidas.
 */
async function schedulePostCrisisCheckin(userId: string): Promise<void> {
  const prisma = getPrismaClient();
  const now = new Date();
  const twentySixHoursAgo = new Date(now.getTime() - 26 * 60 * 60 * 1000);

  // Evitar duplicado: ya hay un follow-up reciente programado.
  const existing = await prisma.scheduledEmail.findFirst({
    where: {
      userId,
      template: "crisis_followup_24h",
      cancelled: false,
      sentAt: null,
      scheduledAt: { gte: twentySixHoursAgo },
    },
  });
  if (existing) {
    logInfo("RISK", "post_crisis_checkin_skipped_duplicate", { userId, existingId: existing.id });
    return;
  }

  const scheduledAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await prisma.scheduledEmail.create({
    data: {
      userId,
      template: "crisis_followup_24h",
      scheduledAt,
    },
  });
  logInfo("RISK", "post_crisis_checkin_scheduled", {
    userId,
    scheduledAt: scheduledAt.toISOString(),
  });
}
