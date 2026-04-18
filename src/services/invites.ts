import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { awardLatidos } from "@/services/latidos";
import { awardBadge } from "@/services/badges";
import { createNotification } from "@/lib/web-push";

// Guardrail: hard cap on how many outstanding invites a single user can earn.
// Prevents runaway rewards from repeated milestones / manual grants.
const MAX_INVITES_PER_USER = 5;

export type InviteReason =
  | "streak_7d"
  | "streak_30d"
  | "goal_complete"
  | "active_30d"
  | "manual";

export async function earnInvite(
  userId: string,
  reason: InviteReason,
): Promise<string | null> {
  try {
    const prisma = getPrismaClient();

    const existingCount = await prisma.invitation.count({ where: { userId } });
    if (existingCount >= MAX_INVITES_PER_USER) {
      logInfo("INVITES", "invite_capped", { userId, reason, existingCount });
      return null;
    }

    const [invite] = await Promise.all([
      prisma.invitation.create({ data: { userId, reason } }),
      prisma.user.update({
        where: { id: userId },
        data: { invitesEarned: { increment: 1 } },
      }),
    ]);

    logInfo("INVITES", "invite_earned", { userId, reason, code: invite.code });
    return invite.code;
  } catch (err) {
    logError("INVITES", err, { action: "earn_invite", userId });
    return null;
  }
}

export async function getUserInvites(userId: string) {
  const prisma = getPrismaClient();
  return prisma.invitation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function validateInviteCode(code: string) {
  const prisma = getPrismaClient();
  const invite = await prisma.invitation.findUnique({
    where: { code },
    include: { user: { select: { name: true } } },
  });
  if (!invite || invite.usedByUserId) return null;
  return invite;
}

/**
 * Soft reservation used by waitlist — records email without binding usedByUserId.
 * Signup is the real consumption step that links to a User row.
 */
export async function consumeInviteCode(code: string, email: string): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    const invite = await prisma.invitation.findUnique({ where: { code } });
    if (!invite || invite.usedByUserId) return false;

    await prisma.invitation.update({
      where: { code },
      data: { usedByEmail: email, usedAt: invite.usedAt ?? new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

export type InviteConsumptionResult =
  | { ok: true; inviterUserId: string; code: string }
  | { ok: false; reason: "not_found" | "already_used" | "self_invite" | "error" };

/**
 * Final consumption on signup — binds the invite to the new User.
 * Tolerates a prior waitlist soft-reservation (usedByEmail set but no usedByUserId).
 */
export async function bindInviteToUser(params: {
  code: string;
  userId: string;
  email: string;
}): Promise<InviteConsumptionResult> {
  try {
    const prisma = getPrismaClient();
    const invite = await prisma.invitation.findUnique({
      where: { code: params.code },
    });

    if (!invite) return { ok: false, reason: "not_found" };
    if (invite.userId === params.userId) return { ok: false, reason: "self_invite" };
    if (invite.usedByUserId && invite.usedByUserId !== params.userId) {
      return { ok: false, reason: "already_used" };
    }

    await prisma.invitation.update({
      where: { code: params.code },
      data: {
        usedByUserId: params.userId,
        usedByEmail: params.email,
        usedAt: invite.usedAt ?? new Date(),
      },
    });

    logInfo("INVITES", "invite_bound", {
      code: params.code,
      inviterUserId: invite.userId,
      referredUserId: params.userId,
      reason: invite.reason,
    });

    return { ok: true, inviterUserId: invite.userId, code: params.code };
  } catch (err) {
    logError("INVITES", err, { action: "bind_invite", code: params.code, userId: params.userId });
    return { ok: false, reason: "error" };
  }
}

/**
 * Reward the inviter when the referred user hits their first activation
 * moment (e.g. first check-in). Idempotent per (inviter, referred) pair —
 * safe to call multiple times; only the first call actually rewards.
 */
export async function rewardInviterOnActivation(referredUserId: string): Promise<void> {
  try {
    const prisma = getPrismaClient();
    const invite = await prisma.invitation.findFirst({
      where: { usedByUserId: referredUserId },
      select: { userId: true, code: true },
    });
    if (!invite) return;

    // Idempotency: meta carries the referred user id, making the reward unique.
    const already = await prisma.latidoTransaction.findFirst({
      where: {
        userId: invite.userId,
        reason: "referral_active",
        meta: referredUserId,
      },
      select: { id: true },
    });
    if (already) return;

    await awardLatidos(invite.userId, "referral_active", undefined, referredUserId);
    await awardBadge(invite.userId, "invite_used");
    await createNotification(invite.userId, {
      title: "Tu invitación dio fruto",
      body: "Alguien a quien invitaste acaba de dar su primer latido.",
      url: "/app/invitar",
      icon: "💛",
      channel: "system",
    });

    logInfo("INVITES", "inviter_rewarded_on_activation", {
      inviterUserId: invite.userId,
      referredUserId,
      code: invite.code,
    });
  } catch (err) {
    logError("INVITES", err, { action: "reward_inviter_on_activation", referredUserId });
  }
}
