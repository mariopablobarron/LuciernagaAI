import { NextResponse } from "next/server";
import { withCronDedup, isoWeekKey } from "@/lib/cron-log";
import { logInfo, logError } from "@/lib/logger";
import { runMatchmaking, runCycleEndCheck } from "@/services/circleMatchmaking";
import { requireCronSecret } from "@/lib/cron-auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Weekly cron: closes circles whose 6-week cycle has ended (generating closing
 * letters for each member), then runs matchmaking to form new circles from
 * users currently sharing the same dominant pattern + primary emotion.
 *
 * Dedup: ISO week key — at most one successful (or failed) run per Mon-Sun
 * window across all callers. If two cron-job.org schedules overlap, the
 * second one short-circuits with `skipped: dedup_lock`.
 */
const dedupedHandler = withCronDedup("circle-matchmaking", () => isoWeekKey(), async () => {
  const now = new Date();
  let closed = 0;
  let formed = 0;
  let membersPlaced = 0;
  let candidates = 0;
  let groups = 0;

  try {
    const cycleResult = await runCycleEndCheck(now);
    closed = cycleResult.closed;
  } catch (error) {
    logError("CIRCLE_MATCHMAKING", error, { step: "cycle_end_check" });
  }

  try {
    const result = await runMatchmaking(now);
    formed = result.formed;
    membersPlaced = result.membersPlaced;
    candidates = result.candidatesEvaluated;
    groups = result.groupsFound;
  } catch (error) {
    logError("CIRCLE_MATCHMAKING", error, { step: "matchmaking" });
  }

  logInfo("CIRCLE_MATCHMAKING", "cron_complete", { closed, formed, membersPlaced });

  return NextResponse.json({
    ok: true,
    closed,
    formed,
    membersPlaced,
    candidates,
    groups,
    runAt: now.toISOString(),
  });
});

export async function GET(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;
  return dedupedHandler(req);
}
