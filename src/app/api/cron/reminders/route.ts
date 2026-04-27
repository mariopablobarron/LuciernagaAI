import { NextRequest, NextResponse } from "next/server";
import { runReminderJob } from "@/services/reminders";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    logInfo("CRON", "reminders_job_triggered", {});
    const stats = await runReminderJob();
    return NextResponse.json({ ok: true, stats });
  } catch (error: unknown) {
    logError("CRON", error, { route: "/api/cron/reminders" });
    sendAutomatedAlert({ type: "critical", title: "Cron falló: reminders", message: error instanceof Error ? error.message : "Error desconocido" }).catch(() => {});
    return NextResponse.json({ error: "JOB_FAILED" }, { status: 500 });
  }
}

// Allow Coolify/cron tools to hit via GET too
export async function GET(req: NextRequest) {
  return POST(req);
}
