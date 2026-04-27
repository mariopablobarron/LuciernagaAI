import { NextResponse } from "next/server";
import { withCronLog } from "@/lib/cron-log";
import { logInfo, logError } from "@/lib/logger";
import { runOpenAllPulses, runCloseExpiredPulses } from "@/services/circlePulses";
import { requireCronSecret } from "@/lib/cron-auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Daily cron: opens this week's Pulse for any active circle that doesn't have one
 * yet, and closes pulses whose 7-day window has expired (auto-generating mentor
 * reflections for each respondent).
 */
export const GET = withCronLog("circle-pulses", async (req) => {
  const unauthorized = requireCronSecret(req as NextRequest);
  if (unauthorized) return unauthorized;

  const now = new Date();
  let opened = 0;
  let skipped = 0;
  let closed = 0;
  let reflections = 0;

  try {
    const closeResult = await runCloseExpiredPulses(now);
    closed = closeResult.closed;
    reflections = closeResult.reflectionsCreated;
  } catch (error) {
    logError("CIRCLE_PULSES", error, { step: "close_expired" });
  }

  try {
    const openResult = await runOpenAllPulses(now);
    opened = openResult.opened;
    skipped = openResult.skipped;
  } catch (error) {
    logError("CIRCLE_PULSES", error, { step: "open_all" });
  }

  logInfo("CIRCLE_PULSES", "cron_complete", { opened, skipped, closed, reflections });

  return NextResponse.json({
    ok: true,
    opened,
    skipped,
    closed,
    reflections,
    runAt: now.toISOString(),
  });
});
