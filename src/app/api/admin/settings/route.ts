import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "settings");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const prisma = getPrismaClient();

    // Check database connectivity
    let dbStatus: "ok" | "down" = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "down";
    }

    // Check env var presence (not values)
    const emailConfigured = !!process.env.RESEND_API_KEY?.trim();
    const telegramConfigured = !!process.env.TELEGRAM_BOT_TOKEN?.trim();
    const sentryConfigured = !!(
      process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
    );

    const adminUsername = process.env.ADMIN_USERNAME?.trim() || "admin";

    // Quick stats
    const [
      totalUsers,
      activeUsers,
      proUsers,
      organizationCount,
      totalMessages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastSeen: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.subscription.count({
        where: { plan: "pro", status: "active" },
      }),
      prisma.organization.count(),
      prisma.message.count(),
    ]);

    return NextResponse.json({
      adminUsername,
      system: {
        database: dbStatus,
        email: emailConfigured,
        telegram: telegramConfigured,
        sentry: sentryConfigured,
      },
      stats: {
        totalUsers,
        activeUsers,
        proUsers,
        organizationCount,
        totalMessages,
      },
    });
  } catch (error: unknown) {
    logError("ADMIN_SETTINGS", error, { action: "get_settings" });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to load settings." },
      { status: 500 },
    );
  }
}, { limit: 30 });
