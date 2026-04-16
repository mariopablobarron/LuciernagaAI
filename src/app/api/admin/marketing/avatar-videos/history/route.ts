import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PERMISSION = "marketing:avatar_videos";

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const rows = await prisma.goalAvatarVideo.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        userId: true,
        goalId: true,
        phase: true,
        trigger: true,
        script: true,
        status: true,
        videoUrl: true,
        errorMessage: true,
        seenAt: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
        goal: { select: { title: true } },
      },
    });

    const [countsByStatus, countsByPhase, optedOutCount, lastDayCount] =
      await Promise.all([
        prisma.goalAvatarVideo.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        prisma.goalAvatarVideo.groupBy({
          by: ["phase"],
          _count: { _all: true },
        }),
        prisma.userPreferences.count({
          where: { avatarVideosEnabled: false },
        }),
        prisma.goalAvatarVideo.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

    return NextResponse.json({
      entries: rows,
      counts: Object.fromEntries(
        countsByStatus.map((r) => [r.status, r._count._all]),
      ),
      countsByPhase: Object.fromEntries(
        countsByPhase.map((r) => [r.phase, r._count._all]),
      ),
      optedOutCount,
      lastDayCount,
    });
  } catch (error: unknown) {
    logError("ADMIN_AVATAR_VIDEOS", error, { route: "history_GET" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
