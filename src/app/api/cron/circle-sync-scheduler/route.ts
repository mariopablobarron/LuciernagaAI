import { NextResponse } from "next/server";
import { runCircleSyncScheduler } from "@/services/circleSyncSessions";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    logInfo("CRON", "circle_sync_scheduler_triggered", {});
    const stats = await runCircleSyncScheduler();
    return NextResponse.json({ ok: true, stats });
  } catch (error: unknown) {
    logError("CRON", error, { route: "/api/cron/circle-sync-scheduler" });
    return NextResponse.json({ error: "JOB_FAILED" }, { status: 500 });
  }
}

export const GET = POST;
