import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";
import {
  analyzeEmotionalProfile,
  updateEmotionalProfile,
} from "@/services/emotional-model";
import { detectUserState, updateUserState } from "@/services/state";
import { awardLatidos } from "@/services/latidos";
import { rewardInviterOnActivation } from "@/services/invites";
import {
  upsertDailyImpulseLog,
  updateActiveChallengesFromCheckin,
} from "@/services/impulse-challenges";
import { updateStreak } from "@/services/streak";
import { buildAdminAlert, notifyAdmin, sendTelegramNotification } from "@/services/telegram";
import { checkRateLimit } from "@/lib/rate-limit";

const STREAK_MILESTONES = new Set([7, 14, 30]);

function buildStreakCongrats(days: number): string {
  if (days >= 30) {
    return `🏆 *¡30 días seguidos!*\n\nEso no es suerte, es disciplina real.\nEstás construyendo algo que dura.`;
  }
  if (days >= 14) {
    return `🌟 *¡14 días de racha!*\n\nDos semanas sin parar. La mayoría ni lo intenta.\nSigue así.`;
  }
  return `🔥 *¡7 días seguidos!*\n\nUna semana completa. El hábito ya está tomando forma.\n¿Qué ha cambiado en ti esta semana?`;
}

function extractMood(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("bien") || lower.includes("mejor") || lower.includes("progreso")) {
    return "positive";
  }
  if (lower.includes("mal") || lower.includes("peor") || lower.includes("fracaso")) {
    return "negative";
  }
  return "neutral";
}

function extractEmotionalState(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("ansios") || lower.includes("nervios") || lower.includes("preocup")) return "ansioso";
  if (lower.includes("bloqueado") || lower.includes("paraliz") || lower.includes("no puedo empezar")) return "bloqueado";
  if (lower.includes("desmotivado") || lower.includes("sin ganas") || lower.includes("cansado")) return "desmotivado";
  if (lower.includes("perdido") || lower.includes("sin dirección") || lower.includes("no sé qué")) return "perdido";
  if (lower.includes("bien") || lower.includes("claro") || lower.includes("listo")) return "activo";
  return "neutral";
}

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrismaClient();
    const body = (await req.json()) as {
      response?: string;
      emotionalState?: string;
      mood?: string;
      challengeStatus?: string;
      momentum?: number;
    };

    const responseText = body.response?.trim() ?? "";
    if (!responseText) {
      return NextResponse.json({ error: "response required" }, { status: 400 });
    }

    const identity = await resolveIdentity(req);
    const userId = identity.userId;

    // Rate limit: 5 checkins/min per user
    const rl = checkRateLimit(`checkin:${userId}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "TOO_MANY_REQUESTS", message: "Demasiados check-ins. Intenta en unos segundos." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    logInfo("STATE", "daily_checkin_create_started", { userId });

    // 1. Legacy DailyCheckin record (backward compat)
    const checkin = await prisma.dailyCheckin.create({
      data: {
        userId,
        response: responseText,
        mood: body.mood ?? extractMood(responseText),
      },
    });

    // 2. Detect and persist user state
    const state = detectUserState(responseText);
    await updateUserState(userId, state);

    // 3. Emotional profile
    let emotionalProfile = analyzeEmotionalProfile(responseText, []);
    try {
      await updateEmotionalProfile(userId, emotionalProfile);
    } catch (err: unknown) {
      emotionalProfile = analyzeEmotionalProfile(responseText, []);
      logError("EMOTION", err, { route: "/api/checkin", userId });
    }

    // 4. Impulso: upsert DailyLog
    const emotionalState = body.emotionalState ?? extractEmotionalState(responseText);
    const dailyLog = await upsertDailyImpulseLog({
      userId,
      note: responseText,
      emotionalState,
      mood: body.mood ?? extractMood(responseText),
      challengeStatus: body.challengeStatus ?? null,
      momentum: body.momentum ?? null,
      incrementCheckin: true,
    });

    // 5. Impulso: update streak + milestone notifications
    const streak = await updateStreak(userId);

    if (STREAK_MILESTONES.has(streak.currentDays)) {
      notifyAdmin(
        buildAdminAlert({ tipo: "streak_milestone", userId, streakDays: streak.currentDays })
      );
      // Send congrats to user via Telegram if linked
      const prisma2 = getPrismaClient();
      const userRecord = await prisma2.user
        .findUnique({ where: { id: userId }, select: { telegramId: true } })
        .catch(() => null);
      if (userRecord?.telegramId) {
        sendTelegramNotification(userRecord.telegramId, buildStreakCongrats(streak.currentDays));
      }
    }

    // 6. Impulso: advance active challenges
    const updatedChallenges = await updateActiveChallengesFromCheckin({
      userId,
      note: responseText,
      challengeStatus: body.challengeStatus ?? null,
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const checkinsToday = await prisma.dailyCheckin.count({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    logInfo("STATE", "daily_checkin_create_completed", {
      checkinId: checkin.id,
      userId,
      streakDays: streak.currentDays,
    });

    // Award latidos for check-in + streak milestones
    void awardLatidos(userId, "checkin").catch(() => {});

    // First check-in ever → reward the inviter (if user came via a referral).
    // Uses total count (not checkinsToday) so it fires exactly once per user.
    const totalCheckins = await prisma.dailyCheckin.count({ where: { userId } });
    if (totalCheckins === 1) {
      void rewardInviterOnActivation(userId).catch(() => {});
    }

    if (streak.currentDays === 3) void awardLatidos(userId, "streak_3d").catch(() => {});
    if (streak.currentDays === 7) void awardLatidos(userId, "streak_7d").catch(() => {});
    if (streak.currentDays === 14) void awardLatidos(userId, "streak_14d").catch(() => {});
    if (streak.currentDays === 21) void awardLatidos(userId, "streak_21d").catch(() => {});

    const res = NextResponse.json({
      ok: true,
      checkin,
      state,
      emotionalProfile,
      checkinsToday,
      dailyLog,
      streak,
      activeChallenges: updatedChallenges,
      challenges: updatedChallenges,
      userId,
    });
    if (identity.shouldSetCookie) attachSessionCookie(res, identity.sessionToken);
    return res;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) {
      const unauthorized = NextResponse.json(
        { error: "INVALID_SESSION_TOKEN", message: "Sesión inválida o expirada." },
        { status: 401 }
      );
      clearSessionCookie(unauthorized);
      return unauthorized;
    }
    logError("STATE", error, { action: "save_checkin_failed" });
    return NextResponse.json({ error: "Error saving checkin" }, { status: 500 });
  }
}
