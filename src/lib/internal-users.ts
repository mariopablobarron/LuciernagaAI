/**
 * Precomputed set of user IDs that belong to the team/test accounts, used
 * to exclude them from admin analytics by default.
 *
 * A user is "internal" when their email matches one of the rules in
 * `team-emails.ts` (TEAM_EMAILS, TEAM_DOMAINS, TEST_EMAIL_DOMAINS, or
 * TEST_NAME_OR_EMAIL_PATTERNS). We materialise the IDs once and cache
 * in-memory for a few minutes so analytics queries don't repeatedly scan
 * the users table just to derive the exclusion list.
 */

import { getPrismaClient } from "@/db/prisma";
import { isTeamEmail, isTestEmail } from "@/lib/team-emails";

const CACHE_TTL_MS = 5 * 60 * 1000;

type Cache = { ids: string[]; computedAt: number } | null;
let cache: Cache = null;

export async function getInternalUserIds(): Promise<string[]> {
  const now = Date.now();
  if (cache && now - cache.computedAt < CACHE_TTL_MS) {
    return cache.ids;
  }

  const prisma = getPrismaClient();
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  const ids = users
    .filter((u) => isTeamEmail(u.email) || isTestEmail(u.email, u.name))
    .map((u) => u.id);

  cache = { ids, computedAt: now };
  return ids;
}

/** Invalidate cache — useful when an admin marks/unmarks a user manually. */
export function invalidateInternalUserIdsCache(): void {
  cache = null;
}

/**
 * Decide whether an admin request should exclude internal users.
 * Default: exclude (metrics reflect real users). Override with `?includeTeam=1`.
 */
export function shouldExcludeInternal(req: { url: string }): boolean {
  try {
    const url = new URL(req.url);
    return url.searchParams.get("includeTeam") !== "1";
  } catch {
    return true;
  }
}

/**
 * Build a Prisma `where.userId` clause that excludes internal users when
 * requested. Returns `undefined` when there are no internal users or when
 * the admin asked to include them.
 */
export async function buildInternalUserExclusion(options: {
  excludeInternal: boolean;
}): Promise<{ notIn: string[] } | undefined> {
  if (!options.excludeInternal) return undefined;
  const ids = await getInternalUserIds();
  if (ids.length === 0) return undefined;
  return { notIn: ids };
}
