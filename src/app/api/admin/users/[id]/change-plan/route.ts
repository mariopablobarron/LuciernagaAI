import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import { invalidateUserCache } from "@/services/user";

export const dynamic = "force-dynamic";

const VALID_PLANS = new Set(["free", "pro"]);

type Params = { params: Promise<{ id: string }> };

export const POST = withRateLimit(
  async function POST(req: NextRequest, ctx: unknown) {
    try {
      const adminAuth = requireAdminPermission(req, "users:change-plan");
      if (adminAuth instanceof NextResponse) return adminAuth;

      const { id } = await (ctx as Params).params;
      if (!id) {
        return NextResponse.json(
          { error: "INVALID_USER_ID", message: "User id is required." },
          { status: 400 },
        );
      }

      const body = (await req.json()) as { plan?: string; reason?: string };
      const { plan, reason } = body;

      if (!plan || !VALID_PLANS.has(plan)) {
        return NextResponse.json(
          { error: "INVALID_PLAN", message: "Plan must be 'free' or 'pro'." },
          { status: 400 },
        );
      }

      const prisma = getPrismaClient();

      // Verify user exists
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
      if (!user) {
        return NextResponse.json(
          { error: "USER_NOT_FOUND", message: "No existe ese usuario." },
          { status: 404 },
        );
      }

      // Determine subscription status based on plan
      const status = plan === "free" ? "canceled" : "active";

      // Find existing subscription for this user
      const existingSub = await prisma.subscription.findFirst({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (existingSub) {
        // Update existing subscription
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            plan,
            status,
            cancelledAt: plan === "free" ? new Date() : null,
            cancelAtPeriodEnd: false,
          },
        });
      } else {
        // Create new subscription
        await prisma.subscription.create({
          data: {
            userId: id,
            plan,
            status,
          },
        });
      }

      logInfo("ADMIN", "plan_changed_by_admin", { userId: id, plan, reason: reason ?? null });

      // Invalidate cached user data so the plan change takes effect immediately
      invalidateUserCache(id);

      return NextResponse.json({ success: true, userId: id, plan, status });
    } catch (error: unknown) {
      logError("ADMIN", error, { route: "POST /api/admin/users/[id]/change-plan" });
      return NextResponse.json(
        { error: "PLAN_CHANGE_FAILED", message: "No se pudo cambiar el plan del usuario." },
        { status: 500 },
      );
    }
  },
  { limit: 10 },
);
