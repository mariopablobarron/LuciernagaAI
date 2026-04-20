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

export async function markFirstMessageIfNull(userId: string): Promise<void> {
  try {
    const prisma = getPrismaClient();
    await prisma.user.updateMany({
      where: { id: userId, firstMessageSentAt: null },
      data: { firstMessageSentAt: new Date() },
    });
  } catch (err: unknown) {
    logError("ACTIVATION", err, { area: "markFirstMessage", userId });
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
