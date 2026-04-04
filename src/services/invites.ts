import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";

export async function earnInvite(userId: string, reason: string): Promise<string | null> {
  try {
    const prisma = getPrismaClient();

    const [invite] = await Promise.all([
      prisma.invitation.create({ data: { userId } }),
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
  if (!invite || invite.usedAt) return null;
  return invite;
}

export async function useInviteCode(code: string, email: string): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    const invite = await prisma.invitation.findUnique({ where: { code } });
    if (!invite || invite.usedAt) return false;

    await prisma.invitation.update({
      where: { code },
      data: { usedByEmail: email, usedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}
