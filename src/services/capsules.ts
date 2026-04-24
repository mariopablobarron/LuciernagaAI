// Servicio de la cápsula del tiempo.
// Dos modos en una sola tabla `Capsule`:
//   - snapshot: payload generado a partir del estado del usuario en T0.
//   - letter:   texto que el usuario escribe en T0 dirigido a sí mismo.
// Ambos comparten cron de entrega (capsule-deliver) que pasa pending → ready
// cuando deliverAt <= now.
//
// PR A: este archivo + endpoints CRUD + tests. Sin UI ni cron todavía.

import type { CapsuleKind, CapsuleStatus, Prisma } from "@prisma/client";
import { getPrismaClient } from "@/db/prisma";

const SNAPSHOT_WINDOW_DAYS = 30;
const LETTER_MIN_DAYS = 7;
const LETTER_MAX_DAYS = 365;

export type SnapshotPayload = {
  kind: "snapshot";
  windowDays: number;
  createdAt: string;
  stats: {
    messagesSent: number;
    heartbeats: number;
    dominantState: string | null;
    activeGoalTitle: string | null;
    activeGoalProgress: number | null;
  };
  // Hasta 3 fragmentos de mensajes recientes del usuario para que en T0+30
  // pueda reconocer su voz. Truncados a 140 chars.
  snippets: Array<{ at: string; preview: string }>;
};

export type LetterPayload = {
  kind: "letter";
  createdAt: string;
  text: string;
};

export type CapsulePayload = SnapshotPayload | LetterPayload;

export type CapsuleSummary = {
  id: string;
  kind: CapsuleKind;
  status: CapsuleStatus;
  createdAt: Date;
  deliverAt: Date;
  openedAt: Date | null;
};

// ── Snapshots ────────────────────────────────────────────────────────────────

/**
 * Genera un snapshot del estado actual del usuario y lo agenda para abrirse
 * en T0+windowDays. Idempotente por día: si ya existe un snapshot creado hoy
 * para este usuario, devuelve null.
 */
export async function createSnapshotForUser(
  userId: string,
  options: { windowDays?: number; now?: Date } = {},
): Promise<{ id: string } | null> {
  const prisma = getPrismaClient();
  const now = options.now ?? new Date();
  const windowDays = options.windowDays ?? SNAPSHOT_WINDOW_DAYS;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const alreadyToday = await prisma.capsule.findFirst({
    where: {
      userId,
      kind: "snapshot",
      createdAt: { gte: startOfDay },
    },
    select: { id: true },
  });
  if (alreadyToday) return null;

  const payload = await buildSnapshotPayload(userId, windowDays, now);

  const deliverAt = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const created = await prisma.capsule.create({
    data: {
      userId,
      kind: "snapshot",
      status: "pending",
      deliverAt,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  return created;
}

async function buildSnapshotPayload(
  userId: string,
  windowDays: number,
  now: Date,
): Promise<SnapshotPayload> {
  const prisma = getPrismaClient();

  const [messagesSent, heartbeats, userState, activeGoal, recentMessages] = await Promise.all([
    prisma.message.count({ where: { userId, role: "user" } }),
    prisma.heartbeat.count({ where: { userId } }),
    prisma.userState.findUnique({
      where: { userId },
      select: { state: true },
    }),
    prisma.goal.findFirst({
      where: { userId, status: "active" },
      orderBy: { updatedAt: "desc" },
      select: {
        title: true,
        actions: { select: { completed: true } },
      },
    }),
    prisma.message.findMany({
      where: { userId, role: "user" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { createdAt: true, content: true },
    }),
  ]);

  const goalProgress = activeGoal && activeGoal.actions.length > 0
    ? Math.round(
        (activeGoal.actions.filter((a) => a.completed).length / activeGoal.actions.length) * 100,
      )
    : null;

  return {
    kind: "snapshot",
    windowDays,
    createdAt: now.toISOString(),
    stats: {
      messagesSent,
      heartbeats,
      dominantState: userState?.state ?? null,
      activeGoalTitle: activeGoal?.title ?? null,
      activeGoalProgress: goalProgress,
    },
    snippets: recentMessages.map((m) => ({
      at: m.createdAt.toISOString(),
      preview: m.content.slice(0, 140),
    })),
  };
}

// ── Letters (carta activa) ───────────────────────────────────────────────────

export class InvalidLetterError extends Error {
  constructor(public reason: "TEXT_REQUIRED" | "TEXT_TOO_LONG" | "DELIVER_AT_INVALID") {
    super(reason);
  }
}

const LETTER_MAX_CHARS = 4000;

export async function createLetterForUser(
  userId: string,
  text: string,
  deliverAt: Date,
  options: { now?: Date } = {},
): Promise<{ id: string }> {
  const now = options.now ?? new Date();
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new InvalidLetterError("TEXT_REQUIRED");
  if (trimmed.length > LETTER_MAX_CHARS) throw new InvalidLetterError("TEXT_TOO_LONG");

  const minDeliverAt = new Date(now.getTime() + LETTER_MIN_DAYS * 24 * 60 * 60 * 1000);
  const maxDeliverAt = new Date(now.getTime() + LETTER_MAX_DAYS * 24 * 60 * 60 * 1000);
  if (deliverAt < minDeliverAt || deliverAt > maxDeliverAt) {
    throw new InvalidLetterError("DELIVER_AT_INVALID");
  }

  const prisma = getPrismaClient();
  const payload: LetterPayload = {
    kind: "letter",
    createdAt: now.toISOString(),
    text: trimmed,
  };

  const created = await prisma.capsule.create({
    data: {
      userId,
      kind: "letter",
      status: "pending",
      deliverAt,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  return created;
}

// ── Listado y apertura ──────────────────────────────────────────────────────

export async function listCapsulesForUser(userId: string): Promise<CapsuleSummary[]> {
  const prisma = getPrismaClient();
  const rows = await prisma.capsule.findMany({
    where: { userId, status: { not: "expired" } },
    orderBy: { deliverAt: "asc" },
    select: {
      id: true,
      kind: true,
      status: true,
      createdAt: true,
      deliverAt: true,
      openedAt: true,
    },
  });
  return rows;
}

export class CapsuleAccessError extends Error {
  constructor(public reason: "NOT_FOUND" | "NOT_READY") {
    super(reason);
  }
}

/**
 * Abre una cápsula y devuelve el payload. Sólo puede abrirla el dueño.
 * Marca status=delivered y openedAt si aún no estaba abierta.
 */
export async function openCapsule(
  userId: string,
  capsuleId: string,
  options: { now?: Date } = {},
): Promise<{ summary: CapsuleSummary; payload: CapsulePayload }> {
  const prisma = getPrismaClient();
  const now = options.now ?? new Date();

  const capsule = await prisma.capsule.findFirst({
    where: { id: capsuleId, userId },
    select: {
      id: true,
      kind: true,
      status: true,
      createdAt: true,
      deliverAt: true,
      deliveredAt: true,
      openedAt: true,
      payload: true,
    },
  });
  if (!capsule) throw new CapsuleAccessError("NOT_FOUND");

  if (capsule.deliverAt > now) {
    throw new CapsuleAccessError("NOT_READY");
  }

  if (!capsule.openedAt) {
    await prisma.capsule.update({
      where: { id: capsuleId },
      data: { status: "delivered", openedAt: now, deliveredAt: capsule.deliveredAt ?? now },
    });
  }

  return {
    summary: {
      id: capsule.id,
      kind: capsule.kind,
      status: capsule.openedAt ? capsule.status : "delivered",
      createdAt: capsule.createdAt,
      deliverAt: capsule.deliverAt,
      openedAt: capsule.openedAt ?? now,
    },
    payload: capsule.payload as unknown as CapsulePayload,
  };
}

// Constantes exportadas para que API y UI compartan validación.
export const CAPSULE_LIMITS = {
  SNAPSHOT_WINDOW_DAYS,
  LETTER_MIN_DAYS,
  LETTER_MAX_DAYS,
  LETTER_MAX_CHARS,
} as const;
