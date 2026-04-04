import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

// GET /api/reto — returns live stats for the 30-day challenge page
export async function GET() {
  try {
    const prisma = getPrismaClient();
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [activeStreaks, completedGoals, waitlistCount] = await Promise.all([
      prisma.streak.count({ where: { status: "active", updatedAt: { gte: since30d } } }),
      prisma.goal.count({ where: { status: "completed", updatedAt: { gte: since30d } } }),
      prisma.waitlistEntry.count({ where: { status: "approved" } }),
    ]);

    return NextResponse.json({ activeStreaks, completedGoals, waitlistCount });
  } catch (error) {
    logError("RETO", error, { action: "get_stats" });
    return NextResponse.json({ activeStreaks: 0, completedGoals: 0, waitlistCount: 0 });
  }
}
