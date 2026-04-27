import { type NextRequest, NextResponse } from "next/server";
import { processScheduledEmails } from "@/services/onboarding-emails";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await processScheduledEmails();
    logInfo("CRON", "scheduled_emails_processed", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logError("CRON", error, { action: "scheduled_emails_failed" });
    sendAutomatedAlert({
      type: "critical",
      title: "Cron fallo: scheduled-emails",
      message: error instanceof Error ? error.message : "Error desconocido",
    }).catch(() => { /* fire-and-forget */ });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
