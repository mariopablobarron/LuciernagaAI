import { type NextRequest, NextResponse } from "next/server";
import { checkInactiveUsers } from "@/services/family";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { requireCronSecret } from "@/lib/cron-auth";

// GET /api/cron/inactivity-check?secret=CRON_SECRET
// Run once daily. Notifies trusted contacts about inactive users.
export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await checkInactiveUsers();
    logInfo("CRON", "inactivity_check_done", result as unknown as Record<string, unknown>);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logError("CRON", error, { action: "inactivity_check_failed" });
    sendAutomatedAlert({ type: "critical", title: "Cron falló: inactivity-check", message: error instanceof Error ? error.message : "Error desconocido" }).catch(() => {});
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
