import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";

const SESSION_DURATION_MIN = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_ECHO_QUOTA = 5;

// ── Prompt bank (curated, per circle phase) ────────────────────────────────
// The clinical responsible (Amaya) signs off on this bank. New prompts must
// be added via PR + her review, not ad-hoc from the admin panel yet.

const PROMPT_BANK: Record<string, string[]> = {
  bloqueo: [
    "¿Qué estás dejando de hacer esta semana y por qué?",
    "Hay una acción que sabes que tendrías que dar y no estás dando. ¿Qué la está frenando hoy?",
    "Si esta semana fuera sobre una sola cosa, ¿cuál sería? ¿Por qué sigue sin pasar?",
    "Nombra el miedo concreto que está debajo de tu bloqueo actual. Sin rodeos.",
    "¿Qué estás esperando que ocurra para poder empezar?",
  ],
  exploracion: [
    "¿Qué decisión estás posponiendo y qué cambiaría si la tomaras mañana?",
    "¿Qué estás explorando y qué estás evitando mirar?",
    "Si pudieras hacer una pregunta honesta a alguien esta semana y tener respuesta, ¿cuál sería?",
    "¿Qué parte de ti está empezando a ver algo nuevo? ¿Qué?",
  ],
  decision: [
    "Si esto sale bien, ¿quién serás en 6 meses? Y si sale mal, ¿quién serás?",
    "¿Qué estás dejando de elegir mientras no eliges esto?",
    "Nombra la decisión en una sola frase, sin adornos. ¿Cómo suena cuando la dices?",
    "¿Qué perderías si decidieras hoy? ¿Y qué perderías si no decides nunca?",
  ],
  accion: [
    "¿Qué hiciste esta semana que no hubieras hecho hace un mes?",
    "¿Dónde avanzaste realmente y dónde solo parecía que avanzabas?",
    "La acción que diste, ¿te acerca a quien quieres ser, o solo a lo que debías hacer?",
    "¿Qué fricción encontraste y cómo la pasaste o no la pasaste?",
  ],
  consistencia: [
    "¿Qué estás a punto de abandonar por cansancio?",
    "¿Qué llevas haciendo tiempo y ya no sabes por qué?",
    "¿Qué se te ha vuelto invisible por estar haciéndolo todos los días?",
    "¿Dónde estás confundiendo persistencia con terquedad?",
  ],
};

function promptForPhase(phase: string): { prompt: string; source: string } {
  const bank = PROMPT_BANK[phase] ?? PROMPT_BANK.bloqueo;
  const idx = Math.floor(Math.random() * bank.length);
  return { prompt: bank[idx], source: `auto_phase:${phase}:${idx}` };
}

// ── Scheduling helpers ─────────────────────────────────────────────────────

/**
 * Returns the next datetime (in UTC) matching the given day-of-week and hour.
 * If the target moment is in the past for today, rolls forward by a week.
 */
export function nextScheduledDate(
  dayOfWeek: number,
  hour: number,
  from: Date = new Date(),
): Date {
  const d = new Date(from);
  d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(hour);
  const todayDow = d.getUTCDay();
  let diff = (dayOfWeek - todayDow + 7) % 7;
  if (diff === 0 && d.getTime() <= from.getTime()) {
    diff = 7;
  }
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

// ── Scheduler ──────────────────────────────────────────────────────────────

export type SchedulerStats = {
  scheduled: number;
  opened: number;
  closed: number;
};

/**
 * Orchestrates the three transitions:
 *   1. Schedule upcoming sessions (create row within 48h of scheduledFor).
 *   2. Open sessions whose scheduledFor <= now.
 *   3. Close sessions active past 30 min.
 */
export async function runCircleSyncScheduler(): Promise<SchedulerStats> {
  const prisma = getPrismaClient();
  const now = new Date();
  const stats: SchedulerStats = { scheduled: 0, opened: 0, closed: 0 };

  // 1. Create sessions up to 48h ahead for active, sync-enabled circles
  const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const circles = await prisma.circle.findMany({
    where: { isActive: true, syncEnabled: true },
    select: { id: true, phase: true, syncDayOfWeek: true, syncHour: true },
  });

  for (const c of circles) {
    const next = nextScheduledDate(c.syncDayOfWeek, c.syncHour, now);
    if (next.getTime() > horizon.getTime()) continue;

    const existing = await prisma.circleSyncSession.findUnique({
      where: { circleId_scheduledFor: { circleId: c.id, scheduledFor: next } },
      select: { id: true },
    });
    if (existing) continue;

    const { prompt, source } = promptForPhase(c.phase);
    try {
      await prisma.circleSyncSession.create({
        data: {
          circleId: c.id,
          scheduledFor: next,
          prompt,
          promptSource: source,
          status: "scheduled",
        },
      });
      stats.scheduled += 1;
    } catch (error: unknown) {
      logError("CIRCLE_SYNC", error, {
        area: "schedule",
        circleId: c.id,
        scheduledFor: next.toISOString(),
      });
    }
  }

  // 2. Open scheduled sessions whose time has arrived
  const toOpen = await prisma.circleSyncSession.findMany({
    where: { status: "scheduled", scheduledFor: { lte: now } },
    select: { id: true },
    take: 100,
  });
  for (const s of toOpen) {
    await prisma.circleSyncSession.update({
      where: { id: s.id },
      data: { status: "active", openedAt: now },
    });
    stats.opened += 1;
  }

  // 3. Close sessions that have been active for SESSION_DURATION_MIN
  const closeBefore = new Date(now.getTime() - SESSION_DURATION_MIN * 60 * 1000);
  const toClose = await prisma.circleSyncSession.findMany({
    where: { status: "active", openedAt: { lte: closeBefore } },
    select: { id: true },
    take: 100,
  });
  for (const s of toClose) {
    await prisma.circleSyncSession.update({
      where: { id: s.id },
      data: { status: "ended", closedAt: now },
    });
    stats.closed += 1;
  }

  logInfo("CIRCLE_SYNC", "scheduler_run", { ...stats });
  return stats;
}

// ── User-facing read ───────────────────────────────────────────────────────

export type SessionDetail = {
  id: string;
  circleId: string;
  circleName: string;
  prompt: string;
  status: string;
  scheduledFor: string;
  openedAt: string | null;
  closedAt: string | null;
  msRemaining: number | null;
  myResponse: {
    id: string;
    content: string;
    anonymous: boolean;
    submittedAt: string;
    editedAt: string | null;
  } | null;
  responses: Array<{
    id: string;
    content: string;
    anonymous: boolean;
    authorName: string | null;
    submittedAt: string;
    echoCount: number;
    echoedByMe: boolean;
  }>;
  echoQuotaRemaining: number;
};

export async function getSessionDetailForUser(
  sessionId: string,
  userId: string,
): Promise<SessionDetail | null> {
  const prisma = getPrismaClient();

  const session = await prisma.circleSyncSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      circleId: true,
      scheduledFor: true,
      prompt: true,
      status: true,
      openedAt: true,
      closedAt: true,
      circle: { select: { name: true } },
      responses: {
        where: { flagged: false },
        orderBy: { submittedAt: "asc" },
        select: {
          id: true,
          userId: true,
          content: true,
          anonymous: true,
          submittedAt: true,
          editedAt: true,
          user: { select: { name: true } },
          echoes: {
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!session) return null;

  // Membership check
  const membership = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId: session.circleId, userId } },
    select: { id: true, leftAt: true },
  });
  if (!membership || membership.leftAt) return null;

  const msRemaining =
    session.status === "active" && session.openedAt
      ? Math.max(
          0,
          session.openedAt.getTime() + SESSION_DURATION_MIN * 60 * 1000 - Date.now(),
        )
      : null;

  const mine = session.responses.find((r) => r.userId === userId);

  // Daily echo quota: count echoes created by this user in the last 24h
  const since = new Date(Date.now() - DAY_MS);
  const echoesToday = await prisma.circleSyncEcho.count({
    where: { userId, createdAt: { gte: since } },
  });
  const echoQuotaRemaining = Math.max(0, DAILY_ECHO_QUOTA - echoesToday);

  return {
    id: session.id,
    circleId: session.circleId,
    circleName: session.circle.name,
    prompt: session.prompt,
    status: session.status,
    scheduledFor: session.scheduledFor.toISOString(),
    openedAt: session.openedAt?.toISOString() ?? null,
    closedAt: session.closedAt?.toISOString() ?? null,
    msRemaining,
    myResponse: mine
      ? {
          id: mine.id,
          content: mine.content,
          anonymous: mine.anonymous,
          submittedAt: mine.submittedAt.toISOString(),
          editedAt: mine.editedAt?.toISOString() ?? null,
        }
      : null,
    responses: session.responses
      .filter((r) => r.userId !== userId || session.status !== "active")
      .map((r) => ({
        id: r.id,
        content: r.content,
        anonymous: r.anonymous,
        authorName: r.anonymous
          ? null
          : r.user.name?.split(/\s+/)[0] ?? null,
        submittedAt: r.submittedAt.toISOString(),
        echoCount: r.echoes.length,
        echoedByMe: r.echoes.some((e) => e.userId === userId),
      })),
    echoQuotaRemaining,
  };
}

export async function getCurrentSessionForUser(userId: string): Promise<string | null> {
  const prisma = getPrismaClient();
  const membership = await prisma.circleMember.findFirst({
    where: { userId, leftAt: null },
    select: { circleId: true },
  });
  if (!membership) return null;

  const session = await prisma.circleSyncSession.findFirst({
    where: {
      circleId: membership.circleId,
      status: { in: ["active", "scheduled"] },
      scheduledFor: { lte: new Date(Date.now() + 2 * 60 * 60 * 1000) },
    },
    orderBy: { scheduledFor: "asc" },
    select: { id: true },
  });

  return session?.id ?? null;
}

// ── Content safety ─────────────────────────────────────────────────────────

const BLOCKED_PATTERNS: RegExp[] = [
  /\b(matar|suicid|autolesion|violar?|viola\b|porn|nazi|terroris|bomb[ae])\b/i,
  /\b(me quiero morir|quiero matarme|hacerme da[nñ]o)\b/i,
  /\b(odio a|te voy a|voy a hacerte)\b/i,
];

function isContentSafe(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  return !BLOCKED_PATTERNS.some((p) => p.test(normalized));
}

// ── Write operations ───────────────────────────────────────────────────────

export type SubmitResult =
  | { ok: true; responseId: string; flagged: boolean }
  | { ok: false; reason: string };

export async function submitResponse(params: {
  sessionId: string;
  userId: string;
  content: string;
  anonymous: boolean;
}): Promise<SubmitResult> {
  const prisma = getPrismaClient();
  const content = params.content.trim();
  if (content.length === 0) return { ok: false, reason: "empty" };
  if (content.length > 2000) return { ok: false, reason: "too_long" };

  const session = await prisma.circleSyncSession.findUnique({
    where: { id: params.sessionId },
    select: { id: true, circleId: true, status: true },
  });
  if (!session) return { ok: false, reason: "session_not_found" };
  if (session.status !== "active") return { ok: false, reason: "session_not_active" };

  const membership = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: { circleId: session.circleId, userId: params.userId },
    },
    select: { leftAt: true },
  });
  if (!membership || membership.leftAt) {
    return { ok: false, reason: "not_member" };
  }

  const flagged = !isContentSafe(content);

  const existing = await prisma.circleSyncResponse.findUnique({
    where: {
      sessionId_userId: { sessionId: params.sessionId, userId: params.userId },
    },
    select: { id: true },
  });

  const saved = existing
    ? await prisma.circleSyncResponse.update({
        where: { id: existing.id },
        data: {
          content,
          anonymous: params.anonymous,
          flagged,
          editedAt: new Date(),
        },
      })
    : await prisma.circleSyncResponse.create({
        data: {
          sessionId: params.sessionId,
          userId: params.userId,
          content,
          anonymous: params.anonymous,
          flagged,
        },
      });

  // Safety escalation: if flagged, create clinical intervention + alert
  if (flagged) {
    try {
      await prisma.intervention.create({
        data: {
          userId: params.userId,
          adminId: "system",
          type: "resource",
          content:
            "Hemos recibido tu mensaje en el círculo. Lo que has escrito contiene señales que merecen acompañamiento profesional. El teléfono 024 está disponible 24/7, gratis. Tu mensaje no se ha publicado al círculo — está visible solo para el equipo clínico.",
          metadata: {
            trigger: "circle_sync_flagged",
            sessionId: params.sessionId,
            responseId: saved.id,
          },
        },
      });
      sendAutomatedAlert({
        type: "critical",
        title: "Círculo sync: mensaje marcado",
        message: `Usuario ${params.userId.slice(0, 8)}... escribió contenido marcado por el filtro en la sesión ${params.sessionId}. Revisar en /admin-clinical.`,
      }).catch(() => {});
    } catch (error: unknown) {
      logError("CIRCLE_SYNC", error, { area: "safety_escalation", userId: params.userId });
    }
  }

  logInfo("CIRCLE_SYNC", "response_submitted", {
    sessionId: params.sessionId,
    userId: params.userId,
    flagged,
    edited: !!existing,
  });

  return { ok: true, responseId: saved.id, flagged };
}

export type EchoResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: string; remaining?: number };

/**
 * Records a "te escucho" from the user to another response. Enforces daily
 * quota of DAILY_ECHO_QUOTA echoes (scarcity = intentional).
 */
export async function recordEcho(params: {
  responseId: string;
  userId: string;
}): Promise<EchoResult> {
  const prisma = getPrismaClient();

  const response = await prisma.circleSyncResponse.findUnique({
    where: { id: params.responseId },
    select: { id: true, userId: true, session: { select: { circleId: true } } },
  });
  if (!response) return { ok: false, reason: "response_not_found" };
  if (response.userId === params.userId) {
    return { ok: false, reason: "cant_echo_self" };
  }

  const membership = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId: response.session.circleId,
        userId: params.userId,
      },
    },
    select: { leftAt: true },
  });
  if (!membership || membership.leftAt) {
    return { ok: false, reason: "not_member" };
  }

  // Daily quota
  const since = new Date(Date.now() - DAY_MS);
  const todayCount = await prisma.circleSyncEcho.count({
    where: { userId: params.userId, createdAt: { gte: since } },
  });
  if (todayCount >= DAILY_ECHO_QUOTA) {
    return { ok: false, reason: "quota_exceeded", remaining: 0 };
  }

  try {
    await prisma.circleSyncEcho.create({
      data: { responseId: params.responseId, userId: params.userId },
    });
  } catch (error: unknown) {
    // Unique constraint: already echoed — treat as idempotent
    logError("CIRCLE_SYNC", error, {
      area: "echo_duplicate_or_failed",
      responseId: params.responseId,
      userId: params.userId,
    });
    return { ok: false, reason: "already_echoed" };
  }

  return { ok: true, remaining: DAILY_ECHO_QUOTA - todayCount - 1 };
}
