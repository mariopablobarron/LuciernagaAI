import { getPrismaClient } from "@/db/prisma";
import { logInfo } from "@/lib/logger";

// ─── Reward amounts ──────────────────────────────────────────────────────────

export const LATIDO_REWARDS = {
  first_message_today: 3,
  checkin: 5,
  community_reply: 5,
  action_complete: 10,
  victory_shared: 10,
  streak_3d: 25,
  streak_7d: 50,
  streak_14d: 100,
  streak_21d: 150,
  goal_complete: 75,
} as const;

export type LatidoReason = keyof typeof LATIDO_REWARDS | "spend_unlock" | "spend_gift" | "spend_theme" | "spend_session" | "admin_grant";

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Award latidos to a user. Returns new balance.
 * Idempotent for streak rewards (checks if already awarded today).
 */
export async function awardLatidos(
  userId: string,
  reason: LatidoReason,
  amount?: number,
  meta?: string,
): Promise<number> {
  const prisma = getPrismaClient();
  const reward = amount ?? LATIDO_REWARDS[reason as keyof typeof LATIDO_REWARDS] ?? 0;
  if (reward <= 0) return getBalance(userId);

  // Prevent duplicate streak rewards on the same day
  if (reason.startsWith("streak_")) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await prisma.latidoTransaction.findFirst({
      where: { userId, reason, createdAt: { gte: today } },
    });
    if (existing) return getBalance(userId);
  }

  // Prevent multiple first_message_today rewards
  if (reason === "first_message_today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await prisma.latidoTransaction.findFirst({
      where: { userId, reason: "first_message_today", createdAt: { gte: today } },
    });
    if (existing) return getBalance(userId);
  }

  const [, user] = await prisma.$transaction([
    prisma.latidoTransaction.create({
      data: { userId, amount: reward, reason, meta },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { latidos: { increment: reward } },
      select: { latidos: true },
    }),
  ]);

  logInfo("LATIDOS", "awarded", { userId, reason, amount: reward, balance: user.latidos });
  return user.latidos;
}

/**
 * Spend latidos. Returns new balance or throws if insufficient.
 */
export async function spendLatidos(
  userId: string,
  amount: number,
  reason: LatidoReason,
  meta?: string,
): Promise<number> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { latidos: true } });
  if (!user || user.latidos < amount) {
    throw new Error("INSUFFICIENT_LATIDOS");
  }

  const [, updated] = await prisma.$transaction([
    prisma.latidoTransaction.create({
      data: { userId, amount: -amount, reason, meta },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { latidos: { decrement: amount } },
      select: { latidos: true },
    }),
  ]);

  logInfo("LATIDOS", "spent", { userId, reason, amount, balance: updated.latidos });
  return updated.latidos;
}

/**
 * Get current balance.
 */
export async function getBalance(userId: string): Promise<number> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { latidos: true } });
  return user?.latidos ?? 0;
}

/**
 * Get recent transactions for a user.
 */
export async function getTransactions(userId: string, limit = 20) {
  const prisma = getPrismaClient();
  return prisma.latidoTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
