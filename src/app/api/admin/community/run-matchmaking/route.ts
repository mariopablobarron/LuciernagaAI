import { type NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import {
  findMatchableUsers,
  groupByPattern,
  runMatchmaking,
  runCycleEndCheck,
  detectDriftedMembers,
  CIRCLE_SIZE,
} from "@/services/circleMatchmaking";

export const dynamic = "force-dynamic";

/**
 * GET — preview: returns who would be matched, in what groups, without writing.
 */
export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const candidates = await findMatchableUsers();
    const groups = groupByPattern(candidates);
    const drifted = await detectDriftedMembers();

    return NextResponse.json({
      circleSize: CIRCLE_SIZE,
      candidatesEvaluated: candidates.length,
      groupsFound: groups.length,
      groups: groups.map((g) => ({
        matchPattern: g.matchPattern,
        matchEmotion: g.matchEmotion,
        members: g.members.map((m) => m.userId),
      })),
      driftedMembers: drifted,
    });
  } catch (error) {
    logError("CIRCLE_MATCHMAKING", error, { route: "/api/admin/community/run-matchmaking", method: "GET" });
    return NextResponse.json({ error: "PREVIEW_FAILED" }, { status: 500 });
  }
}

/**
 * POST — apply: closes ended cycles, forms new circles. Returns counters.
 */
export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, "operations");
  if (auth instanceof NextResponse) return auth;

  try {
    const cycleResult = await runCycleEndCheck();
    const matchResult = await runMatchmaking();
    return NextResponse.json({
      ok: true,
      closed: cycleResult.closed,
      formed: matchResult.formed,
      membersPlaced: matchResult.membersPlaced,
      candidatesEvaluated: matchResult.candidatesEvaluated,
      groupsFound: matchResult.groupsFound,
    });
  } catch (error) {
    logError("CIRCLE_MATCHMAKING", error, { route: "/api/admin/community/run-matchmaking", method: "POST" });
    return NextResponse.json({ error: "RUN_FAILED" }, { status: 500 });
  }
}
