import type { Prisma } from "@prisma/client";

/**
 * Soft-delete semantics:
 * - `isActive=false` → account DEACTIVATED: login blocked, still visible in listings with a badge.
 * - `deletedAt != null` → account DELETED (soft): hidden from default listings, pending hard-delete via retention cron.
 *
 * Use these helpers in every Prisma query that lists users to keep semantics consistent.
 */

/** User is "usable": can authenticate, is billable, should receive communications. */
export function activeUserWhere(): Prisma.UserWhereInput {
  return { isActive: true, deletedAt: null };
}

/** User is not soft-deleted, regardless of active/inactive state. Use for admin listings that want to show deactivated accounts. */
export function notDeletedUserWhere(): Prisma.UserWhereInput {
  return { deletedAt: null };
}

/** User is soft-deleted (pending hard-delete). */
export function softDeletedUserWhere(): Prisma.UserWhereInput {
  return { deletedAt: { not: null } };
}
