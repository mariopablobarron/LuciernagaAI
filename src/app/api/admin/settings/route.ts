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
    const cronConfigured = !!process.env.CRON_SECRET?.trim();
    const n8nConfigured = !!process.env.N8N_EVENTS_WEBHOOK_URL?.trim();
    const pushConfigured = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
    const googleOAuthConfigured = !!(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY?.trim();

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
        cron: cronConfigured,
        n8n: n8nConfigured,
        push: pushConfigured,
        googleOAuth: googleOAuthConfigured,
        stripe: stripeConfigured,
      },
      warnings: [
        ...(!cronConfigured ? ["CRON_SECRET no configurado — los cron jobs (reminders, weekly summary, nudges) no funcionan"] : []),
        ...(!n8nConfigured ? ["N8N_EVENTS_WEBHOOK_URL no configurado — las automatizaciones externas no se disparan"] : []),
        ...(!telegramConfigured ? ["TELEGRAM_BOT_TOKEN no configurado — el bot de Telegram esta desactivado"] : []),
        ...(!pushConfigured ? ["VAPID keys no configuradas — las push notifications no funcionan"] : []),
        ...(!stripeConfigured ? ["STRIPE_SECRET_KEY no configurado — los pagos estan desactivados"] : []),
        ...(!googleOAuthConfigured ? ["Google OAuth no configurado — el login con Google esta desactivado"] : []),
      ],
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
