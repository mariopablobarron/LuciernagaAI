import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { requireAdminPermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "analytics");
  if (auth instanceof NextResponse) return auth;

  const prisma = getPrismaClient();

  const [rawFeedbacks, stats] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        message: true,
        page: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
      },
    }),
    prisma.feedback.groupBy({
      by: ["type"],
      _count: true,
    }),
  ]);

  // Extract rating from message if column not yet migrated (e.g. "Rating: 4/5")
  const feedbacks = rawFeedbacks.map((f) => {
    const raw = f as typeof f & { rating?: number | null };
    let rating = raw.rating ?? null;
    if (!rating && f.message) {
      const match = f.message.match(/^Rating:\s*(\d)\/5$/);
      if (match) rating = Number(match[1]);
    }
    return { ...f, rating };
  });

  // Compute average rating from feedbacks that have one
  const rated = feedbacks.filter((f) => typeof f.rating === "number" && f.rating > 0);
  const avgRating = rated.length > 0
    ? rated.reduce((sum, f) => sum + (f.rating ?? 0), 0) / rated.length
    : null;

  // Rating distribution
  const ratingDist = [1, 2, 3, 4, 5].map((n) => ({
    rating: n,
    count: rated.filter((f) => f.rating === n).length,
  }));

  return NextResponse.json({
    feedbacks,
    summary: {
      total: feedbacks.length,
      avgRating,
      ratingDistribution: ratingDist,
      byType: stats.map((s) => ({ type: s.type, count: s._count })),
    },
  });
}
