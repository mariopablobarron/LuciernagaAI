import { NextRequest, NextResponse } from "next/server";
import { resolveAdminAuth, clearAdminSessionCookie } from "@/lib/admin-auth";
import { withRateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const CONFIG_PATH = path.join(process.cwd(), "notification-config.json");

export type NotificationConfig = {
  // Email alerts to ALERT_EMAIL
  emailNewUser: boolean;
  emailCrisis: boolean;
  emailRetentionDrop: boolean;
  emailWeeklySummary: boolean;
  emailAvoidanceEscalation: boolean;
  // Telegram alerts to ADMIN_TELEGRAM_ID
  telegramNewUser: boolean;
  telegramCrisis: boolean;
  telegramUserMessages: boolean;
  telegramWeeklySummary: boolean;
  telegramAvoidanceEscalation: boolean;
  // Cron jobs
  cronDailyCheckin: boolean;
  cronWeeklyReview: boolean;
  cronWeeklyInactiveReminder: boolean;
  cronActionReminders: boolean;
  cronInactivityCheck: boolean;
  cronProactiveReview: boolean;
};

const DEFAULTS: NotificationConfig = {
  emailNewUser: true,
  emailCrisis: true,
  emailRetentionDrop: true,
  emailWeeklySummary: true,
  emailAvoidanceEscalation: true,
  telegramNewUser: true,
  telegramCrisis: true,
  telegramUserMessages: true,
  telegramWeeklySummary: true,
  telegramAvoidanceEscalation: true,
  cronDailyCheckin: true,
  cronWeeklyReview: true,
  cronWeeklyInactiveReminder: true,
  cronActionReminders: true,
  cronInactivityCheck: true,
  cronProactiveReview: true,
};

export async function loadNotificationConfig(): Promise<NotificationConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

async function saveNotificationConfig(config: NotificationConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) {
    const res = NextResponse.json({ error: "UNAUTHORIZED_ADMIN" }, { status: 401 });
    if (auth.source === "invalid") clearAdminSessionCookie(res);
    return res;
  }

  const config = await loadNotificationConfig();
  return NextResponse.json(config);
}, { limit: 30 });

export const PUT = withRateLimit(async function PUT(req: NextRequest) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) {
    const res = NextResponse.json({ error: "UNAUTHORIZED_ADMIN" }, { status: 401 });
    if (auth.source === "invalid") clearAdminSessionCookie(res);
    return res;
  }

  try {
    const body = (await req.json()) as Partial<NotificationConfig>;
    const current = await loadNotificationConfig();
    const updated = { ...current, ...body };
    await saveNotificationConfig(updated);
    logInfo("ADMIN", "notification_config_updated", { changes: Object.keys(body) });
    return NextResponse.json(updated);
  } catch (error) {
    logError("ADMIN", error, { action: "update_notification_config" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}, { limit: 15 });
