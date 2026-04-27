import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { pricePointsToMrr } from "@/lib/billing";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "analytics");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const prisma = getPrismaClient();
    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * DAY_MS);
    const since30d = new Date(now.getTime() - 30 * DAY_MS);

    const [
      active,
      trialing,
      pastDue,
      newSubs7d,
      newSubs30d,
      churned7d,
      churned30d,
      byPlan,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: "active" },
        select: {
          plan: true,
          stripePriceId: true,
          cancelAtPeriodEnd: true,
          createdAt: true,
        },
      }),
      prisma.subscription.count({ where: { status: "trialing" } }),
      prisma.subscription.count({ where: { status: "past_due" } }),
      prisma.subscription.count({
        where: { status: "active", createdAt: { gte: since7d } },
      }),
      prisma.subscription.count({
        where: { status: "active", createdAt: { gte: since30d } },
      }),
      prisma.subscription.count({
        where: { status: "canceled", cancelledAt: { gte: since7d } },
      }),
      prisma.subscription.count({
        where: { status: "canceled", cancelledAt: { gte: since30d } },
      }),
      prisma.subscription.groupBy({
        by: ["plan"],
        where: { status: "active" },
        _count: { _all: true },
      }),
    ]);

    const mrrUsd = active.reduce((sum, s) => sum + pricePointsToMrr(s.stripePriceId), 0);
    const arrUsd = mrrUsd * 12;
    const cancellingAtPeriodEnd = active.filter((s) => s.cancelAtPeriodEnd).length;
    const activeCount = active.length;

    // Active at start of 30d window ≈ current active − new in window + churned in window.
    const activeAtStartOf30d = activeCount - newSubs30d + churned30d;
    const monthlyChurnPct =
      activeAtStartOf30d > 0 ? (churned30d / activeAtStartOf30d) * 100 : null;

    // ARPU = MRR / active subs
    const arpuUsd = activeCount > 0 ? mrrUsd / activeCount : 0;

    // LTV proxy = ARPU / monthly churn rate. Returns null when churn rate is
    // unavailable or zero (avoid Infinity surfacing in dashboards).
    const ltvUsd =
      monthlyChurnPct && monthlyChurnPct > 0 ? arpuUsd / (monthlyChurnPct / 100) : null;

    const planBreakdown: Record<string, number> = {};
    for (const p of byPlan) planBreakdown[p.plan] = p._count._all;

    return NextResponse.json({
      asOf: now.toISOString(),
      currency: "USD",
      mrr: {
        usd: round2(mrrUsd),
        activeSubs: activeCount,
        byPlan: planBreakdown,
      },
      arr: { usd: round2(arrUsd) },
      arpu: { usd: round2(arpuUsd) },
      ltvProxy:
        ltvUsd !== null
          ? {
              usd: round2(ltvUsd),
              method: "ARPU / monthly churn rate",
            }
          : {
              usd: null,
              method: "ARPU / monthly churn rate",
              reason: "insufficient_churn_signal",
            },
      subs: {
        active: activeCount,
        trialing,
        pastDue,
        cancellingAtPeriodEnd,
      },
      growth: {
        newSubs7d,
        newSubs30d,
        churnedSubs7d: churned7d,
        churnedSubs30d: churned30d,
      },
      churn: {
        monthlyRatePct: monthlyChurnPct !== null ? round2(monthlyChurnPct) : null,
        annualizedRatePct:
          monthlyChurnPct !== null
            ? round2((1 - Math.pow(1 - monthlyChurnPct / 100, 12)) * 100)
            : null,
        sampleSize: activeAtStartOf30d,
      },
      notes: [
        "MRR derived from stripePriceId mapping in src/lib/billing.ts (not from Stripe invoices).",
        "Churn = canceled in last 30d / active at start of 30d window (approximation).",
        "LTV is ARPU/churn — coarse, useful for trend monitoring not accounting.",
      ],
    });
  } catch (err) {
    logError("ADMIN_MONETIZATION", err, { stage: "build_response" });
    return NextResponse.json(
      { error: "monetization_query_failed" },
      { status: 500 },
    );
  }
});
