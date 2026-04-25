import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/admin/community/health
// Aggregated health metrics for all circles + per-circle health rows.
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = getPrismaClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      circles,
      activeMembers,
      pulsesLast30,
      reflectionsPending,
      reflectionsPublished30,
      lettersLast30,
      cyclesEndingSoon,
    ] = await Promise.all([
      prisma.circle.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          matchPattern: true,
          matchEmotion: true,
          maxMembers: true,
          startsAt: true,
          cycleEndsAt: true,
          members: {
            where: { leftAt: null },
            select: {
              userId: true,
              user: { select: { userState: { select: { dominantPattern: true, primaryEmotion: true } } } },
            },
          },
          pulses: {
            where: { weekStart: { gte: thirtyDaysAgo } },
            select: {
              id: true,
              status: true,
              weekStart: true,
              weekEnd: true,
              openedAt: true,
              responses: { select: { submittedAt: true } },
            },
          },
        },
      }),
      prisma.circleMember.count({ where: { leftAt: null } }),
      prisma.circlePulse.findMany({
        where: { weekStart: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          status: true,
          openedAt: true,
          weekEnd: true,
          circleId: true,
          responses: { select: { submittedAt: true } },
        },
      }),
      prisma.mentorReflection.count({ where: { publishedAt: null, approvedAt: null } }),
      prisma.mentorReflection.count({ where: { publishedAt: { gte: thirtyDaysAgo } } }),
      prisma.circleClosingLetter.count({ where: { generatedAt: { gte: thirtyDaysAgo } } }),
      prisma.circle.count({
        where: { isActive: true, cycleEndsAt: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    // ── Aggregate participation across all 30d pulses ────────────────────
    let totalPossibleResponses = 0;
    let totalActualResponses = 0;
    const responseDelaysHours: number[] = [];
    for (const c of circles) {
      const memberCount = c.members.length;
      for (const p of c.pulses) {
        totalPossibleResponses += memberCount;
        totalActualResponses += p.responses.length;
        for (const r of p.responses) {
          const delayMs = r.submittedAt.getTime() - p.openedAt.getTime();
          if (delayMs >= 0) responseDelaysHours.push(delayMs / (60 * 60 * 1000));
        }
      }
    }
    const participationPct = totalPossibleResponses > 0
      ? Math.round((totalActualResponses / totalPossibleResponses) * 100)
      : null;

    responseDelaysHours.sort((a, b) => a - b);
    const medianResponseHours = responseDelaysHours.length === 0
      ? null
      : responseDelaysHours[Math.floor(responseDelaysHours.length / 2)];

    // ── Drift across active members ──────────────────────────────────────
    let driftedTotal = 0;
    let withState = 0;
    for (const c of circles) {
      for (const m of c.members) {
        const s = m.user.userState;
        if (!s) continue;
        withState += 1;
        if (s.dominantPattern !== c.matchPattern || s.primaryEmotion !== c.matchEmotion) {
          driftedTotal += 1;
        }
      }
    }
    const driftPct = withState > 0 ? Math.round((driftedTotal / withState) * 100) : null;

    // ── Per-circle health rows (sorted by lowest participation first) ────
    const perCircle = circles
      .map((c) => {
        const memberCount = c.members.length;
        const possible = c.pulses.length * memberCount;
        const actual = c.pulses.reduce((a, p) => a + p.responses.length, 0);
        const pct = possible > 0 ? Math.round((actual / possible) * 100) : null;
        const drifted = c.members.filter(
          (m) => m.user.userState && (m.user.userState.dominantPattern !== c.matchPattern || m.user.userState.primaryEmotion !== c.matchEmotion),
        ).length;
        const daysToCycle = c.cycleEndsAt
          ? Math.ceil((c.cycleEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          : null;
        return {
          id: c.id,
          name: c.name,
          matchPattern: c.matchPattern,
          matchEmotion: c.matchEmotion,
          memberCount,
          maxMembers: c.maxMembers,
          driftedCount: drifted,
          pulses30d: c.pulses.length,
          participationPct: pct,
          daysToCycle,
        };
      })
      .sort((a, b) => {
        // Surface unhealthy circles first: nulls last, ascending pct.
        if (a.participationPct === null && b.participationPct === null) return 0;
        if (a.participationPct === null) return 1;
        if (b.participationPct === null) return -1;
        return a.participationPct - b.participationPct;
      });

    // ── Pulses currently open right now ──────────────────────────────────
    const openPulses = pulsesLast30.filter((p) => p.status === "open").length;

    return NextResponse.json({
      generatedAt: now.toISOString(),
      totals: {
        activeCircles: circles.length,
        activeMembers,
        openPulses,
        pulsesLast30d: pulsesLast30.length,
        cyclesEndingNext7d: cyclesEndingSoon,
        lettersGeneratedLast30d: lettersLast30,
      },
      participation: {
        pct: participationPct,
        medianResponseHours: medianResponseHours === null ? null : Math.round(medianResponseHours * 10) / 10,
        totalResponses: totalActualResponses,
        possibleResponses: totalPossibleResponses,
      },
      drift: {
        pct: driftPct,
        driftedMembers: driftedTotal,
        membersWithState: withState,
      },
      reflections: {
        pendingApproval: reflectionsPending,
        publishedLast30d: reflectionsPublished30,
      },
      perCircle,
    });
  } catch (error) {
    logError("ADMIN_HEALTH", error, { route: "/api/admin/community/health" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
