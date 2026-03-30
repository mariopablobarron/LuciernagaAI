import type { UserState } from "@/types/chat";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { DEFAULT_EMOTIONAL_PROFILE } from "@/types/emotional-profile";

const DEFAULT_CRISIS_ACTIVE_HOURS = 6;

const STATE_KEYWORDS: Record<UserState, string[]> = {
  neutral: ["bien", "normal", "ok", "estable", "sereno", "tranquilo"],
  duda: [
    "no se",
    "no sé",
    "duda",
    "dudas",
    "confund",
    "desorientado",
    "sin rumbo",
    "no tengo claro",
    "por donde empiezo",
  ],
  bloqueo: [
    "bloqueo",
    "bloqueado",
    "paralisis",
    "parálisis",
    "estancado",
    "atrapado",
    "no puedo avanzar",
    "no arranco",
    "evitando",
  ],
  ansiedad: [
    "ansiedad",
    "ansioso",
    "panico",
    "pánico",
    "miedo",
    "nervioso",
    "estres",
    "estrés",
    "desbordado",
    "agobio",
  ],
  claridad: [
    "claro",
    "claridad",
    "ya se",
    "ya sé",
    "entiendo",
    "decidido",
    "decidida",
    "tengo claro",
    "plan definido",
    "avance",
    "progreso",
  ],
};

function normalizeText(message: string): string {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(message: string, keywords: string[]): number {
  return keywords.reduce((total, keyword) => {
    return total + (message.includes(normalizeText(keyword)) ? 1 : 0);
  }, 0);
}

export function detectUserState(message: string): UserState {
  const normalized = normalizeText(message);

  const scores: Record<UserState, number> = {
    neutral: countMatches(normalized, STATE_KEYWORDS.neutral),
    duda: countMatches(normalized, STATE_KEYWORDS.duda),
    bloqueo: countMatches(normalized, STATE_KEYWORDS.bloqueo),
    ansiedad: countMatches(normalized, STATE_KEYWORDS.ansiedad),
    claridad: countMatches(normalized, STATE_KEYWORDS.claridad),
  };

  const orderedStates: UserState[] = ["bloqueo", "ansiedad", "duda", "claridad", "neutral"];
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
  if (messages.length === 0) {
    return "neutral";
  }

  const counts: Record<UserState, number> = {
    neutral: 0,
    duda: 0,
    bloqueo: 0,
    ansiedad: 0,
    claridad: 0,
  };

  for (const message of messages) {
    const state = detectUserState(message);
    counts[state] += 1;
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

export async function updateUserState(userId: string, state: string): Promise<UserState> {
  const normalizedState = toUserState(state);
  const prisma = getPrismaClient();

  try {
    await prisma.userState.upsert({
      where: { userId },
      update: { state: normalizedState, updatedAt: new Date() },
      create: {
        userId,
        state: normalizedState,
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
