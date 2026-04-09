import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  try {
    const adminAuth = requireAdminPermission(req, "users:emotional-history");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const prisma = getPrismaClient();

    const [
      emotionGroups,
      patternGroups,
      focusGroups,
      energyGroups,
      riskGroups,
      trendGroups,
      totalStates,
    ] = await Promise.all([
      prisma.userState.groupBy({ by: ["primaryEmotion"], _count: { _all: true } }),
      prisma.userState.groupBy({ by: ["dominantPattern"], _count: { _all: true } }),
      prisma.userState.groupBy({ by: ["focusArea"], _count: { _all: true } }),
      prisma.userState.groupBy({ by: ["energyLevel"], _count: { _all: true } }),
      prisma.userState.groupBy({ by: ["riskLevel"], _count: { _all: true } }),
      prisma.userState.groupBy({ by: ["progressTrend"], _count: { _all: true } }),
      prisma.userState.count(),
    ]);

    function toDistribution<T extends Record<string, unknown> & { _count: { _all: number } | null }>(
      groups: T[],
      field: keyof T,
    ) {
      return groups
        .map((g) => ({ label: String(g[field] ?? "unknown"), count: g._count?._all ?? 0 }))
        .sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({
      totalUsers: totalStates,
      emotions: toDistribution(emotionGroups, "primaryEmotion"),
      patterns: toDistribution(patternGroups, "dominantPattern"),
      focusAreas: toDistribution(focusGroups, "focusArea"),
      energyLevels: toDistribution(energyGroups, "energyLevel"),
      riskLevels: toDistribution(riskGroups, "riskLevel"),
      progressTrends: toDistribution(trendGroups, "progressTrend"),
    });
  } catch (err) {
    logError("ADMIN", err instanceof Error ? err : new Error(String(err)), { route: "/api/admin/emotional-model" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { limit: 30 });
