import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/admin/community/circles?status=active|closed|all
// Returns circles with key health signals: member count, pulses opened, response
// rate over last 4 pulses, drifted member count, days to cycle end.
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const status = req.nextUrl.searchParams.get("status") ?? "active";
    const where = status === "all" ? {} : { isActive: status === "active" };

    const prisma = getPrismaClient();
    const circles = await prisma.circle.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        matchPattern: true,
        matchEmotion: true,
        maxMembers: true,
        isActive: true,
        startsAt: true,
        cycleEndsAt: true,
        createdAt: true,
        members: {
          where: { leftAt: null },
          select: {
            userId: true,
            user: {
              select: {
                userState: { select: { dominantPattern: true, primaryEmotion: true } },
              },
            },
          },
        },
        pulses: {
          orderBy: { weekStart: "desc" },
          take: 4,
          select: {
            id: true,
            status: true,
            weekStart: true,
            _count: { select: { responses: true } },
          },
        },
      },
    });

    return NextResponse.json({
      circles: circles.map((c) => {
        const memberCount = c.members.length;
        const drifted = c.members.filter(
          (m) =>
            m.user.userState &&
            (m.user.userState.dominantPattern !== c.matchPattern ||
              m.user.userState.primaryEmotion !== c.matchEmotion),
        ).length;
        const recentPulses = c.pulses;
        const totalPossibleResponses = recentPulses.length * memberCount;
        const totalActualResponses = recentPulses.reduce((a, p) => a + p._count.responses, 0);
        const participationPct = totalPossibleResponses === 0
          ? null
          : Math.round((totalActualResponses / totalPossibleResponses) * 100);

        return {
          id: c.id,
          name: c.name,
          matchPattern: c.matchPattern,
          matchEmotion: c.matchEmotion,
          maxMembers: c.maxMembers,
          isActive: c.isActive,
          startsAt: c.startsAt.toISOString(),
          cycleEndsAt: c.cycleEndsAt?.toISOString() ?? null,
          createdAt: c.createdAt.toISOString(),
          memberCount,
          driftedCount: drifted,
          recentPulseCount: recentPulses.length,
          participationPct,
          lastPulseAt: recentPulses[0]?.weekStart.toISOString() ?? null,
          openPulses: recentPulses.filter((p) => p.status === "open").length,
        };
      }),
    });
  } catch (error) {
    logError("ADMIN_CIRCLES", error, { route: "/api/admin/community/circles" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
