import { type NextRequest, NextResponse } from "next/server";
import { processScheduledEmails } from "@/services/onboarding-emails";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
