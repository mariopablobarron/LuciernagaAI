import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type CrisisResponse = {
  response: string;
  resources: string[];
  shouldEscalate: boolean;
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

const CRITICAL_PATTERNS: RegExp[] = [
  /\b(me quiero matar|quiero matarme|quiero morir|no quiero vivir)\b/,
  /\b(suicid(a|io)|autolesion|autolesionarme|hacerme daño|hacerme dano)\b/,
  /\b(matar a alguien|hacer daño a otros|hacer dano a otros)\b/,
  /\b(esta noche termino todo|hoy termino todo|me voy a quitar la vida)\b/,
];

const HIGH_PATTERNS: RegExp[] = [
  /\b(no puedo más|no puedo mas|no aguanto|estoy al límite|estoy al limite)\b/,
  /\b(todo da igual|nada tiene sentido|no tiene sentido seguir)\b/,
  /\b(quiero desaparecer|me quiero ir para siempre)\b/,
  /\b(me odio|odio mi vida)\b/,
];

const MEDIUM_PATTERNS: RegExp[] = [
  /\b(me siento hundid[oa]|estoy muy mal|me sobrepasa)\b/,
  /\b(ansiedad muy fuerte|ataque de ansiedad|panico)\b/,
  /\b(no veo salida|estoy desbordad[oa]|me siento roto)\b/,
];

const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

function normalizeText(message: string): string {
  return message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

export function getCrisisResponse(level: RiskLevel): CrisisResponse {
  const resources = [
    "Si hay riesgo inmediato, llama al 112 (ES/UE) o 911 (EE.UU.).",
    "Si estás en EE.UU., también puedes llamar o escribir al 988 (24/7).",
    "Si estás en España, puedes llamar al 024 (24/7).",
  ];

  if (level === "critical") {
    return {
      response:
        "Lo que estás sintiendo es muy importante y no voy a juzgarte por ello. No tienes que pasar por esto solo: me quedo contigo mientras damos un paso seguro ahora. En este momento, habla con una persona real de confianza o con un profesional de urgencias para que te acompañe directamente. Si hay riesgo inmediato, llama al 112/911 ahora mismo, y usa 024 (España) o 988 (EE.UU.) para apoyo continuo.",
      resources,
      shouldEscalate: true,
    };
  }

  if (level === "high") {
    return {
      response:
        "Lo que estás viviendo pesa mucho, y tiene sentido que te sientas así. No estás solo en esto: podemos priorizar tu seguridad y apoyo ahora mismo. Te propongo hablar hoy con alguien real de confianza y pedir ayuda profesional cuanto antes para no cargar con todo a solas. Si notas que el riesgo sube, llama al 112/911 y usa 024 (España) o 988 (EE.UU.).",
      resources,
      shouldEscalate: true,
    };
  }

  if (level === "medium") {
    return {
      response:
        "Lo que te pasa importa y merece cuidado. No tienes que sostener esto en soledad; estoy aquí para acompañarte paso a paso. Si en algún momento se vuelve demasiado intenso, busca apoyo de una persona real de confianza. Si hay urgencia, llama al 112/911 y utiliza 024 (España) o 988 (EE.UU.).",
      resources: [],
      shouldEscalate: false,
    };
  }

  return {
    response: "Estoy contigo. Vamos paso a paso.",
    resources: [],
    shouldEscalate: false,
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
