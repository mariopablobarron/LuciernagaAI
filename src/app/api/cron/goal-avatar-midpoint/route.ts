import { type NextRequest, NextResponse } from "next/server";
import { runMidpointScan } from "@/services/goalAvatarVideos";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

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

export const GET = POST;
