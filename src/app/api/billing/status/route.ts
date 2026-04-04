import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getUserAccessState } from "@/services/user";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const [accessState, subscription] = await Promise.all([
      getUserAccessState(identity.userId),
      prisma.subscription.findFirst({
        where: { userId: identity.userId },
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          plan: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          stripeSubscriptionId: true,
        },
      }),
    ]);

    return NextResponse.json({
      plan: accessState.plan,
      planLabel: accessState.planLabel,
      hasPlan: accessState.hasPlan,
      messagesUsedToday: accessState.messagesUsedToday,
      messagesRemainingToday: accessState.messagesRemainingToday,
      messageLimitPerDay: accessState.messageLimitPerDay,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    logError("BILLING", error, { route: "/api/billing/status" });
    return NextResponse.json({ error: "STATUS_FAILED" }, { status: 500 });
  }
}
