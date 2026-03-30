import type { UserState } from "@/types/chat";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

const DEFAULT_CRISIS_ACTIVE_HOURS = 6;

const STATE_KEYWORDS: Record<UserState, string[]> = {
  neutral: ["bien", "normal", "ok", "tranquilo", "calma", "estable", "sereno"],
  perdido: ["no sé", "no se", "perdido", "confund", "desorientado", "sin rumbo"],
  ansioso: ["ansiedad", "ansioso", "pánico", "panico", "miedo", "nervioso", "estrés", "estres"],
  bloqueado: ["bloqueado", "parálisis", "paralisis", "estancado", "atrapado", "no puedo avanzar"],
};

function countMatches(message: string, keywords: string[]): number {
  return keywords.reduce((total, keyword) => {
    return total + (message.includes(keyword) ? 1 : 0);
  }, 0);
}

export function detectUserState(message: string): UserState {
  const normalized = message.toLowerCase();

  const scores: Record<UserState, number> = {
    neutral: countMatches(normalized, STATE_KEYWORDS.neutral),
    perdido: countMatches(normalized, STATE_KEYWORDS.perdido),
    ansioso: countMatches(normalized, STATE_KEYWORDS.ansioso),
    bloqueado: countMatches(normalized, STATE_KEYWORDS.bloqueado),
  };

  const orderedStates: UserState[] = ["bloqueado", "ansioso", "perdido", "neutral"];
  let winner: UserState = "neutral";
  let maxScore = -1;

  for (const state of orderedStates) {
    const score = scores[state];
    if (score > maxScore) {
      winner = state;
      maxScore = score;
    }
  }

  return maxScore > 0 ? winner : "neutral";
}

export function getDominantState(messages: string[]): UserState {
  if (messages.length === 0) {
    return "neutral";
  }

  const counts: Record<UserState, number> = {
    neutral: 0,
    perdido: 0,
    ansioso: 0,
    bloqueado: 0,
  };

  for (const message of messages) {
    const state = detectUserState(message);
    counts[state] += 1;
  }

  const ordered: UserState[] = ["bloqueado", "ansioso", "perdido", "neutral"];
  let dominant: UserState = "neutral";
  let max = -1;

  for (const state of ordered) {
    if (counts[state] > max) {
      dominant = state;
      max = counts[state];
    }
  }

  return dominant;
}

function toUserState(state: string): UserState {
  if (state === "neutral" || state === "ansioso" || state === "bloqueado" || state === "perdido") {
    return state;
  }
  return "neutral";
}

function getCrisisActiveHours(): number {
  const raw = process.env.CRISIS_ACTIVE_HOURS?.trim();
  const parsed = raw ? Number(raw) : DEFAULT_CRISIS_ACTIVE_HOURS;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CRISIS_ACTIVE_HOURS;
  }

  return Math.min(72, Math.max(1, Math.round(parsed)));
}

function buildCrisisActiveUntil(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function updateUserState(userId: string, state: string): Promise<UserState> {
  const normalizedState = toUserState(state);
  const prisma = getPrismaClient();

  try {
    await prisma.userState.upsert({
      where: { userId },
      update: { state: normalizedState, updatedAt: new Date() },
      create: { userId, state: normalizedState },
    });
    logInfo("STATE", "user_state_updated", { userId, state: normalizedState });
    return normalizedState;
  } catch (error: unknown) {
    logError("STATE", error, { userId, state: normalizedState });
    throw error;
  }
}

export type UserCrisisStatus = {
  active: boolean;
  expiresAt: string | null;
  reason: "active" | "expired" | "none";
};

export async function activateUserCrisis(
  userId: string,
  hours = getCrisisActiveHours()
): Promise<Date> {
  const prisma = getPrismaClient();
  const now = new Date();
  const crisisActiveUntil = buildCrisisActiveUntil(hours);

  try {
    await prisma.userState.upsert({
      where: { userId },
      update: {
        crisisActive: true,
        crisisActivatedAt: now,
        crisisActiveUntil,
        updatedAt: now,
      },
      create: {
        userId,
        state: "neutral",
        crisisActive: true,
        crisisActivatedAt: now,
        crisisActiveUntil,
      },
    });

    logInfo("STATE", "user_crisis_activated", {
      userId,
      crisisActiveUntil: crisisActiveUntil.toISOString(),
      hours,
    });
    return crisisActiveUntil;
  } catch (error: unknown) {
    logError("STATE", error, { userId, action: "activate_user_crisis_failed" });
    throw error;
  }
}

export async function clearUserCrisis(userId: string): Promise<void> {
  const prisma = getPrismaClient();

  try {
    await prisma.userState.updateMany({
      where: { userId },
      data: {
        crisisActive: false,
        crisisActivatedAt: null,
        crisisActiveUntil: null,
        updatedAt: new Date(),
      },
    });

    logInfo("STATE", "user_crisis_cleared", { userId });
  } catch (error: unknown) {
    logError("STATE", error, { userId, action: "clear_user_crisis_failed" });
  }
}

export async function getUserCrisisStatus(userId: string): Promise<UserCrisisStatus> {
  const prisma = getPrismaClient();

  try {
    const record = await prisma.userState.findUnique({
      where: { userId },
      select: {
        crisisActive: true,
        crisisActiveUntil: true,
      },
    });

    if (!record?.crisisActive) {
      return {
        active: false,
        expiresAt: null,
        reason: "none",
      };
    }

    const now = Date.now();
    const expiresAtMs = record.crisisActiveUntil?.getTime() ?? 0;
    if (!expiresAtMs || expiresAtMs <= now) {
      await clearUserCrisis(userId);
      return {
        active: false,
        expiresAt: null,
        reason: "expired",
      };
    }

    return {
      active: true,
      expiresAt: record.crisisActiveUntil?.toISOString() ?? null,
      reason: "active",
    };
  } catch (error: unknown) {
    logError("STATE", error, { userId, action: "get_user_crisis_status_failed" });
    return {
      active: false,
      expiresAt: null,
      reason: "none",
    };
  }
}
