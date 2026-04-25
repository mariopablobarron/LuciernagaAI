import { NextResponse, type NextRequest } from "next/server";
import { logError } from "@/lib/logger";
import { runCronWatchdog } from "@/lib/admin-tg/cron-watchdog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCronWatchdog();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logError("CRON_WATCHDOG", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
