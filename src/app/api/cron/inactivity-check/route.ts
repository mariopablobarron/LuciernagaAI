import { type NextRequest, NextResponse } from "next/server";
import { checkInactiveUsers } from "@/services/family";
import { logError, logInfo } from "@/lib/logger";

// GET /api/cron/inactivity-check?secret=CRON_SECRET
// Run once daily. Notifies trusted contacts about inactive users.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkInactiveUsers();
    logInfo("CRON", "inactivity_check_done", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logError("CRON", error, { action: "inactivity_check_failed" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
