import { NextRequest, NextResponse } from "next/server";
import { runMidpointScan } from "@/services/goalAvatarVideos";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return req.nextUrl.searchParams.get("secret") === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    logInfo("CRON", "goal_avatar_midpoint_triggered", {});
    const stats = await runMidpointScan();
    return NextResponse.json({ ok: true, stats });
  } catch (error: unknown) {
    logError("CRON", error, { route: "/api/cron/goal-avatar-midpoint" });
    sendAutomatedAlert({
      type: "critical",
      title: "Cron falló: goal-avatar-midpoint",
      message: error instanceof Error ? error.message : "Error desconocido",
    }).catch(() => {});
    return NextResponse.json({ error: "JOB_FAILED" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
