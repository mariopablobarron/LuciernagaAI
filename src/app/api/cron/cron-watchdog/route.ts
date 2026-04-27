import { NextResponse, type NextRequest } from "next/server";
import { logError } from "@/lib/logger";
import { runCronWatchdog } from "@/lib/admin-tg/cron-watchdog";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await runCronWatchdog();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logError("CRON_WATCHDOG", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
