import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

/**
 * Activation audit: persist the timestamps that used to be inferred in
 * /admin/analytics/activacion on every render. Once written, the dashboard and
 * any re-engagement cron can read these fields directly.
 *
 * Definitions:
 *   - firstMessageSentAt: first user-authored message (not assistant replies).
 *   - activatedAt:        aha moment — ≥3 user messages *and* ≥1 action
 *                         completada. We relax the original "in 72h" window
 *                         here for simplicity; the 72h check still lives in
 *                         the analytics endpoint if needed for historical
 *                         cohort reports.
 *   - onboardingCompletedAt: the in-app wizard (/app) reached its final step.
 */

/**
 * Devuelve true si el UPDATE efectivamente ocurrió — indica que es la
 * primera vez que este usuario envía un mensaje. Los callers pueden usar
 * este flag para emitir eventos de "primer mensaje" sin repetirlo.
 */
export async function markFirstMessageIfNull(userId: string): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    const result = await prisma.user.updateMany({
      where: { id: userId, firstMessageSentAt: null },
      data: { firstMessageSentAt: new Date() },
    });
    return result.count > 0;
  } catch (err: unknown) {
    logError("ACTIVATION", err, { area: "markFirstMessage", userId });
    return false;
  }
}

export async function tryMarkActivated(userId: string): Promise<void> {
  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { messageCount: true, activatedAt: true },
    });
    if (!user || user.activatedAt || user.messageCount < 3) return;

    const completed = await prisma.action.findFirst({
      where: { completed: true, goal: { userId } },
      select: { id: true },
    });
    if (!completed) return;

    await prisma.user.updateMany({
      where: { id: userId, activatedAt: null },
      data: { activatedAt: new Date() },
    });
    logInfo("ACTIVATION", "user_activated", { userId });
  } catch (err: unknown) {
    logError("ACTIVATION", err, { area: "tryMarkActivated", userId });
  }
}

export async function markOnboardingCompleted(userId: string): Promise<void> {
  try {
    const prisma = getPrismaClient();
    const result = await prisma.user.updateMany({
      where: { id: userId, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: new Date() },
    });
    if (result.count > 0) {
      logInfo("ACTIVATION", "onboarding_completed", { userId });
    }
  } catch (err: unknown) {
    logError("ACTIVATION", err, { area: "markOnboardingCompleted", userId });
  }
}

export type BackfillActivationStats = {
  firstMessage: number;
  activated: number;
  onboarding: number;
  scanned: number;
};

/**
 * Retroactive backfill of the three activation audit fields. Idempotent.
 * Populates:
 *   - firstMessageSentAt ← MIN(Message.createdAt) where role='user'
 *   - activatedAt        ← now() when messageCount ≥ 3 AND ≥1 action completada
 *   - onboardingCompletedAt ← consentAt (pragmatic proxy)
 */
export async function backfillActivationFields(limit = 500): Promise<BackfillActivationStats> {
  const prisma = getPrismaClient();
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 5000) : 500;
  const stats: BackfillActivationStats = { firstMessage: 0, activated: 0, onboarding: 0, scanned: 0 };

  const missingFirst = await prisma.user.findMany({
    where: { firstMessageSentAt: null, deletedAt: null },
    select: { id: true },
    take: safeLimit,
  });
  for (const u of missingFirst) {
    const earliest = await prisma.message.findFirst({
      where: { userId: u.id, role: "user" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    if (!earliest) continue;
    await prisma.user.updateMany({
      where: { id: u.id, firstMessageSentAt: null },
      data: { firstMessageSentAt: earliest.createdAt },
    });
    stats.firstMessage += 1;
  }

  const missingActivation = await prisma.user.findMany({
    where: { activatedAt: null, deletedAt: null, messageCount: { gte: 3 } },
    select: { id: true },
    take: safeLimit,
  });
  for (const u of missingActivation) {
    const completed = await prisma.action.findFirst({
      where: { completed: true, goal: { userId: u.id } },
      select: { id: true },
    });
    if (!completed) continue;
    await prisma.user.updateMany({
      where: { id: u.id, activatedAt: null },
      data: { activatedAt: new Date() },
    });
    stats.activated += 1;
  }

  const missingOnboarding = await prisma.user.findMany({
    where: { onboardingCompletedAt: null, consentAt: { not: null }, deletedAt: null },
    select: { id: true, consentAt: true },
    take: safeLimit,
  });
  for (const u of missingOnboarding) {
    if (!u.consentAt) continue;
    await prisma.user.updateMany({
      where: { id: u.id, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: u.consentAt },
    });
    stats.onboarding += 1;
  }

  stats.scanned = missingFirst.length + missingActivation.length + missingOnboarding.length;
  logInfo("BACKFILL_ACTIVATION", "done", stats);
  return stats;
}
