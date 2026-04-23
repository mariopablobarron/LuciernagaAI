import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/db/prisma";

export type AdminUsersFilter = {
  q?: string;
  plan?: "free" | "pro";
  createdFrom?: string | Date;
  createdTo?: string | Date;
  lastSeenFrom?: string | Date;
  lastSeenTo?: string | Date;
  includeDeleted?: boolean;
};

const BULK_FILTER_CAP = 500;

function parseDate(value: string | Date | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Resolves a list of user IDs that match the given admin filter. Caps the
 * result at BULK_FILTER_CAP to keep bulk operations bounded. Used by bulk-*
 * endpoints so the caller can operate on the full filter instead of only
 * the currently selected IDs.
 */
export async function resolveUserIdsFromFilter(
  filter: AdminUsersFilter,
): Promise<{ userIds: string[]; truncated: boolean; total: number }> {
  const prisma = getPrismaClient();

  const where: Prisma.UserWhereInput = {};
  if (!filter.includeDeleted) where.deletedAt = null;

  const q = typeof filter.q === "string" ? filter.q.trim() : "";
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }

  const createdFrom = parseDate(filter.createdFrom);
  const createdTo = parseDate(filter.createdTo);
  if (createdFrom || createdTo) {
    where.createdAt = {};
    if (createdFrom) where.createdAt.gte = createdFrom;
    if (createdTo) where.createdAt.lte = createdTo;
  }

  const lastSeenFrom = parseDate(filter.lastSeenFrom);
  const lastSeenTo = parseDate(filter.lastSeenTo);
  if (lastSeenFrom || lastSeenTo) {
    where.lastSeen = {};
    if (lastSeenFrom) where.lastSeen.gte = lastSeenFrom;
    if (lastSeenTo) where.lastSeen.lte = lastSeenTo;
  }

  if (filter.plan === "pro") {
    where.subscriptions = { some: { plan: "pro", status: "active" as const } };
  }

  const total = await prisma.user.count({ where });
  const rows = await prisma.user.findMany({
    where,
    orderBy: [{ lastSeen: "desc" }],
    take: BULK_FILTER_CAP,
    select: { id: true },
  });

  return {
    userIds: rows.map((r) => r.id),
    truncated: total > BULK_FILTER_CAP,
    total,
  };
}

export { BULK_FILTER_CAP };
