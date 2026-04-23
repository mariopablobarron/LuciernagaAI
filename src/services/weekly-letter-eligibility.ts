import { getPrismaClient } from "@/db/prisma";
import { isTeamEmail, isTestEmail } from "@/lib/team-emails";

export type WeeklyLetterCandidate = {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  emailDisabled: boolean;
  name: string | null;
};

/**
 * List users eligible for a weekly letter this week.
 *
 * A user is eligible when:
 *  - account is active (`deletedAt IS NULL AND isActive = true`)
 *  - has not opted out of the letter (`weeklyLetterDisabled = false`)
 *  - has no letter yet for the target week (DB @@unique will also enforce this)
 *
 * We do NOT filter by crisis here — the caller (cron) re-checks per user
 * because the crisis flag lives on UserState and can change at runtime.
 *
 * Note: this query is intentionally broad. The expensive per-user work
 * (digest + LLM) is gated later by `buildWeeklyDigest` which returns an
 * empty digest when the user doesn't have enough activity.
 */
export async function listEligibleUsers(params: {
  weekStart: Date;
}): Promise<WeeklyLetterCandidate[]> {
  const prisma = getPrismaClient();

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      preferences: {
        is: { weeklyLetterDisabled: false },
      },
      weeklyLetters: {
        none: { weekStart: params.weekStart },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      preferences: {
        select: { weeklyLetterEmailDisabled: true },
      },
    },
  });

  return users
    .filter((u) => !isTeamEmail(u.email) && !isTestEmail(u.email, u.name))
    .map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email ?? null,
      emailVerified: Boolean(u.emailVerified),
      emailDisabled: Boolean(u.preferences?.weeklyLetterEmailDisabled),
    }));
}

/**
 * Returns true if we should send an email notification for this candidate:
 *  - has a real email (not the anonymous placeholder)
 *  - emailVerified = true
 *  - emailDisabled = false
 */
export function shouldSendNotification(candidate: WeeklyLetterCandidate): boolean {
  if (!candidate.emailVerified) return false;
  if (candidate.emailDisabled) return false;
  if (!candidate.email) return false;
  if (candidate.email.endsWith("@session.luciernaga.local")) return false;
  return true;
}
