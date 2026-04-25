import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "analytics");
  if (auth instanceof NextResponse) return auth;

  const prisma = getPrismaClient();

  try {
    const [
      total,
      published,
      unpublished,
      notified,
      readCount,
      openedCount,
      bounds,
      perWeek,
      topUsers,
    ] = await Promise.all([
      prisma.weeklyLetter.count(),
      prisma.weeklyLetter.count({ where: { published: true } }),
      prisma.weeklyLetter.count({ where: { published: false } }),
      prisma.weeklyLetter.count({ where: { emailNotifiedAt: { not: null } } }),
      prisma.weeklyLetter.count({ where: { readAt: { not: null } } }),
      prisma.weeklyLetter.count({ where: { openedAt: { not: null } } }),
      prisma.weeklyLetter.aggregate({
        _min: { weekStart: true, createdAt: true },
        _max: { weekStart: true, createdAt: true },
      }),
      prisma.weeklyLetter.groupBy({
        by: ["weekStart"],
        _count: { _all: true },
        orderBy: { weekStart: "desc" },
        take: 12,
      }),
      prisma.weeklyLetter.groupBy({
        by: ["userId"],
        _count: { _all: true },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      total,
      published,
      unpublished,
      notified,
      notNotified: total - notified,
      readCount,
      openedCount,
      firstWeekStart: bounds._min.weekStart,
      lastWeekStart: bounds._max.weekStart,
      firstCreatedAt: bounds._min.createdAt,
      lastCreatedAt: bounds._max.createdAt,
      perWeek: perWeek.map((r) => ({
        weekStart: r.weekStart,
        count: r._count._all,
      })),
      topUsers: topUsers.map((r) => ({
        userId: r.userId,
        count: r._count._all,
      })),
    });
  } catch (error) {
    logError("ADMIN_STATS", error, { endpoint: "weekly-letters/stats" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
