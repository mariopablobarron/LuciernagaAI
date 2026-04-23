import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { invalidateUserCache } from "@/services/user";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const VALID_PLANS = new Set(["free", "pro"]);
const MIN_REASON_LEN = 10;
const MAX_USERS = 200;

// POST /api/admin/users/bulk-change-plan
// body: { userIds: string[], plan: "free"|"pro", reason: string (min 10 chars) }
export const POST = withRateLimit(
  async function POST(req: NextRequest) {
    try {
      const adminAuth = requireAdminPermission(req, "users:change-plan");
      if (adminAuth instanceof NextResponse) return adminAuth;

      const body = (await req.json()) as {
        userIds?: unknown;
        plan?: unknown;
        reason?: unknown;
      };

      const userIds = Array.isArray(body.userIds)
        ? body.userIds.filter((x): x is string => typeof x === "string").slice(0, MAX_USERS)
        : [];
      const plan = typeof body.plan === "string" ? body.plan : "";
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";

      if (userIds.length === 0) {
        return NextResponse.json({ error: "NO_USERS" }, { status: 400 });
      }
      if (!VALID_PLANS.has(plan)) {
        return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
      }
      if (reason.length < MIN_REASON_LEN) {
        return NextResponse.json(
          { error: "REASON_REQUIRED", message: `Motivo mínimo ${MIN_REASON_LEN} caracteres.` },
          { status: 400 },
        );
      }

      const prisma = getPrismaClient();
      const typedPlan = plan as SubscriptionPlan;
      const status: SubscriptionStatus = plan === "free" ? "canceled" : "active";

      let updated = 0;
      for (const userId of userIds) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) continue;

        const existing = await prisma.subscription.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });

        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              plan: typedPlan,
              status,
              cancelledAt: plan === "free" ? new Date() : null,
              cancelAtPeriodEnd: false,
            },
          });
        } else {
          await prisma.subscription.create({
            data: { userId, plan: typedPlan, status },
          });
        }

        invalidateUserCache(userId);
        updated++;
      }

      audit({
        actorId: adminAuth.adminName ?? "admin",
        actorType: "admin",
        action: "update",
        resource: "User",
        metadata: { bulk: "change-plan", count: updated, plan, reason },
      });

      logInfo("ADMIN", "bulk_change_plan", { updated, plan, reason });

      return NextResponse.json({ success: true, updated, plan });
    } catch (error) {
      logError("ADMIN", error, { route: "POST /api/admin/users/bulk-change-plan" });
      return NextResponse.json({ error: "BULK_PLAN_FAILED" }, { status: 500 });
    }
  },
  { limit: 5 },
);
