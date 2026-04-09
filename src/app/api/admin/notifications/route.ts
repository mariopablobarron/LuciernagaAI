import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { withRateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import { getNotificationConfig, type NotificationConfig } from "@/lib/notification-config";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const CONFIG_PATH = path.join(process.cwd(), "notification-config.json");

async function saveNotificationConfig(config: NotificationConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "notifications");
  if (auth instanceof NextResponse) return auth;

  const config = await getNotificationConfig();
  return NextResponse.json(config);
}, { limit: 30 });

export const PUT = withRateLimit(async function PUT(req: NextRequest) {
  const auth = requireAdminPermission(req, "notifications");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as Partial<NotificationConfig>;
    const current = await getNotificationConfig();
    const updated = { ...current, ...body };
    await saveNotificationConfig(updated);
    logInfo("ADMIN", "notification_config_updated", { changes: Object.keys(body) });
    return NextResponse.json(updated);
  } catch (error) {
    logError("ADMIN", error, { action: "update_notification_config" });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}, { limit: 15 });
