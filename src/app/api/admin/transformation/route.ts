import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  try {
    const adminAuth = requireAdminPermission(req, "users:read");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const prisma = getPrismaClient();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [phaseGroups, stateGroups, totalUsers] = await Promise.all([
      prisma.userState.groupBy({
        by: ["transformationPhase"],
        _count: { _all: true },
      }),
      prisma.userState.groupBy({
        by: ["systemState"],
        _count: { _all: true },
      }),
      prisma.user.count(),
    ]);

    // Users stuck: in bloqueo phase with updatedAt > 7 days ago
    const stuckUsers = await prisma.userState.findMany({
      where: {
        transformationPhase: "bloqueo",
        updatedAt: { lt: sevenDaysAgo },
      },
      select: {
        userId: true,
        state: true,
        transformationPhase: true,
        updatedAt: true,
        user: { select: { email: true, name: true } },
      },
      take: 20,
      orderBy: { updatedAt: "asc" },
    });

    const phases = phaseGroups
      .map((g) => ({
        phase: g.transformationPhase ?? "sin_fase",
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const systemStates = stateGroups
      .map((g) => ({
        state: g.systemState ?? "unknown",
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    // Users without a UserState record
    const usersWithState = phases.reduce((sum, p) => sum + p.count, 0);
    const usersWithoutState = Math.max(0, totalUsers - usersWithState);

    return NextResponse.json({
      totalUsers,
      usersWithState,
      usersWithoutState,
      phases,
      systemStates,
      stuckUsers: stuckUsers.map((u) => ({
        userId: u.userId,
        email: u.user.email,
        name: u.user.name,
        phase: u.transformationPhase ?? "sin_fase",
        state: u.state,
        lastUpdate: u.updatedAt.toISOString(),
        daysSinceUpdate: Math.round((now.getTime() - u.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
      })),
    });
  } catch (err) {
    logError("ADMIN", err instanceof Error ? err : new Error(String(err)), { route: "/api/admin/transformation" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { limit: 30 });
