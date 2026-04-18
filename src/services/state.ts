import type { UserState } from "@/domain/types";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { DEFAULT_EMOTIONAL_PROFILE } from "@/types/emotional-profile";
import type { PrimaryEmotion } from "@/types/emotional-profile";
import { analyzeEmotionalProfile } from "@/services/emotional-model";
import { normalizeText, countMatches } from "@/services/text-analysis";
import type { TransformationPhase } from "@/services/transformation";

const DEFAULT_CRISIS_ACTIVE_HOURS = 6;

/**
 * Map the richer PrimaryEmotion (from emotional-model) to the simpler
 * UserState used by the UI. Single source of truth for keyword analysis
 * lives in emotional-model.ts — this function only translates.
 */
const EMOTION_TO_STATE: Record<PrimaryEmotion, UserState> = {
  ansiedad: "ansiedad",
  apatía: "bloqueo",
  confusión: "duda",
  frustración: "bloqueo",
  calma: "claridad",
};

const CLARITY_KEYWORDS = [
  "claro", "claridad", "ya se", "ya sé", "decidido", "decidida",
  "tengo claro", "plan definido", "avance", "progreso",
];

export function detectUserState(message: string): UserState {
  const profile = analyzeEmotionalProfile(message, []);
  // "calma" is the emotional-model fallback when no keywords match.
  // In the simpler UI model that means "neutral", not "claridad".
  // Reserve "claridad" for messages with explicit clarity signals.
  if (profile.primaryEmotion === "calma") {
    return countMatches(normalizeText(message), CLARITY_KEYWORDS) > 0 ? "claridad" : "neutral";
  }
  return EMOTION_TO_STATE[profile.primaryEmotion] ?? "neutral";
}

export function shouldBypassActionLock(state: UserState): boolean {
  return state === "ansiedad";
}

export type ConversationContextSummary = {
  lastGoal: string | null;
  pendingActions: string[];
  emotionalState: UserState;
  summary: string;
};

export function buildConversationContext(userState: {
  state: string;
  lastGoal?: string | null;
  pendingActions?: string[] | null;
}): ConversationContextSummary {
  const emotionalState = toUserState(userState.state);
  const lastGoal = userState.lastGoal?.trim() || null;
  const pendingActions = (userState.pendingActions || [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 3);

  const summaryParts: string[] = [`Estado emocional: ${emotionalState}.`];

  if (lastGoal) {
    summaryParts.push(`Último objetivo: ${lastGoal}.`);
  }

  if (pendingActions.length > 0) {
    summaryParts.push(`Acciones pendientes: ${pendingActions.join(" | ")}.`);
  }

  return {
    lastGoal,
    pendingActions,
    emotionalState,
    summary: summaryParts.join(" "),
  };
}

export function getDominantState(messages: string[]): UserState {
  if (messages.length === 0) return "neutral";

  const counts: Record<UserState, number> = {
    neutral: 0, duda: 0, bloqueo: 0, ansiedad: 0, claridad: 0,
  };

  for (const message of messages) {
    counts[detectUserState(message)] += 1;
  }

  const ordered: UserState[] = ["bloqueo", "ansiedad", "duda", "claridad", "neutral"];
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
  if (
    state === "neutral" ||
    state === "duda" ||
    state === "bloqueo" ||
    state === "ansiedad" ||
    state === "claridad"
  ) {
    return state;
  }

  if (state === "perdido") {
    return "duda";
  }

  if (state === "bloqueado") {
    return "bloqueo";
  }

  if (state === "ansioso") {
    return "ansiedad";
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

export async function updateUserState(
  userId: string,
  state: string,
  options?: { transformationPhase?: TransformationPhase }
): Promise<UserState> {
  const normalizedState = toUserState(state);
  const prisma = getPrismaClient();

  try {
    await prisma.userState.upsert({
      where: { userId },
      update: {
        state: normalizedState,
        transformationPhase: options?.transformationPhase,
        updatedAt: new Date(),
      },
      create: {
        userId,
        state: normalizedState,
        transformationPhase: options?.transformationPhase ?? "bloqueo",
        primaryEmotion: DEFAULT_EMOTIONAL_PROFILE.primaryEmotion,
        dominantPattern: DEFAULT_EMOTIONAL_PROFILE.dominantPattern,
        focusArea: DEFAULT_EMOTIONAL_PROFILE.focusArea,
        energyLevel: DEFAULT_EMOTIONAL_PROFILE.energyLevel,
        riskLevel: DEFAULT_EMOTIONAL_PROFILE.riskLevel,
        progressTrend: DEFAULT_EMOTIONAL_PROFILE.progressTrend,
      },
    });
    logInfo("STATE", "user_state_updated", { userId, state: normalizedState });
    return normalizedState;
  } catch (error: unknown) {
    logError("STATE", error, { userId, state: normalizedState });
    throw error;
  }
}

export async function updateUserTransformationPhase(
  userId: string,
  transformationPhase: TransformationPhase
): Promise<void> {
  const prisma = getPrismaClient();

  try {
    await prisma.userState.upsert({
      where: { userId },
      update: {
        transformationPhase,
        updatedAt: new Date(),
      },
      create: {
        userId,
        state: "neutral",
        transformationPhase,
        primaryEmotion: DEFAULT_EMOTIONAL_PROFILE.primaryEmotion,
        dominantPattern: DEFAULT_EMOTIONAL_PROFILE.dominantPattern,
        focusArea: DEFAULT_EMOTIONAL_PROFILE.focusArea,
        energyLevel: DEFAULT_EMOTIONAL_PROFILE.energyLevel,
        riskLevel: DEFAULT_EMOTIONAL_PROFILE.riskLevel,
        progressTrend: DEFAULT_EMOTIONAL_PROFILE.progressTrend,
      },
    });

    logInfo("STATE", "user_transformation_phase_updated", {
      userId,
      transformationPhase,
    });
  } catch (error: unknown) {
    logError("STATE", error, { userId, transformationPhase });
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
        transformationPhase: "bloqueo",
        primaryEmotion: DEFAULT_EMOTIONAL_PROFILE.primaryEmotion,
        dominantPattern: DEFAULT_EMOTIONAL_PROFILE.dominantPattern,
        focusArea: DEFAULT_EMOTIONAL_PROFILE.focusArea,
        energyLevel: DEFAULT_EMOTIONAL_PROFILE.energyLevel,
        riskLevel: DEFAULT_EMOTIONAL_PROFILE.riskLevel,
        progressTrend: DEFAULT_EMOTIONAL_PROFILE.progressTrend,
        crisisActive: true,
        crisisActivatedAt: now,
        crisisActiveUntil,
      },
    });

    // Clinical safety: pause any active intensive programmes (Modo Impulso /
    // UserChallenge) so the user doesn't receive "do this today" pressure
    // while in crisis. Must be manually resumed from the clinical panel
    // once the crisis is cleared.
    const pausedChallenges = await prisma.userChallenge.updateMany({
      where: { userId, status: "active" },
      data: { status: "paused" },
    });

    logInfo("STATE", "user_crisis_activated", {
      userId,
      crisisActiveUntil: crisisActiveUntil.toISOString(),
      hours,
      pausedChallenges: pausedChallenges.count,
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
