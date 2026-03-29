import type { UserState } from "@/types/chat";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

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
