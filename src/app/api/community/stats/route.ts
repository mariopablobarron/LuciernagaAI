import { type NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/community/stats
// Lightweight counters used as social proof in the community header.
// Cached for 60s at the caller if needed — no cache here to keep numbers live.
export async function GET(req: NextRequest) {
  try {
    await resolveIdentity(req);
    const prisma = getPrismaClient();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [members, victoriesWeek, questionsWeek, activeCircles] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.communityPost.count({
        where: { type: "victory", hidden: false, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.anonQuestion.count({
        where: { hidden: false, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.circle.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      members,
      victoriesWeek,
      questionsWeek,
      activeCircles,
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/stats" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
