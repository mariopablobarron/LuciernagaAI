import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError, logInfo } from "@/lib/logger";
import {
  runMidpointScan,
  runPollGoalAvatarVideos,
  triggerGoalAvatarVideo,
  type TriggerReason,
} from "@/services/goalAvatarVideos";
import type { AvatarPhase } from "@/services/avatarScriptGenerator";

export const dynamic = "force-dynamic";

const PERMISSION = "marketing:avatar_videos";

/**
 * Manual admin triggers:
 *  - action: "midpoint-scan" — run the midpoint detection scan
 *  - action: "poll"          — run the HeyGen status poller
 *  - action: "manual"        — force a video for a specific { userId, goalId, phase }
 */
export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, PERMISSION);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      userId?: string;
      goalId?: string;
      phase?: AvatarPhase;
    };
    const action = body.action ?? "midpoint-scan";

    logInfo("ADMIN_AVATAR_VIDEOS", "manual_trigger", {
      action,
      by: auth.adminName,
    });

    if (action === "poll") {
      const stats = await runPollGoalAvatarVideos();
      return NextResponse.json({ ok: true, action, stats });
    }
    if (action === "midpoint-scan") {
      const stats = await runMidpointScan();
      return NextResponse.json({ ok: true, action, stats });
    }
    if (action === "manual") {
      if (!body.userId || !body.goalId || !body.phase) {
        return NextResponse.json(
          { error: "userId, goalId and phase are required for manual action" },
          { status: 400 },
        );
      }
      if (!["START", "MIDPOINT", "END"].includes(body.phase)) {
        return NextResponse.json({ error: "invalid phase" }, { status: 400 });
      }
      const trigger: TriggerReason =
        body.phase === "START"
          ? "goal_created"
          : body.phase === "END"
            ? "goal_completed"
            : "state_bloqueo";
      const result = await triggerGoalAvatarVideo({
        userId: body.userId,
        goalId: body.goalId,
        phase: body.phase,
        trigger,
      });
      return NextResponse.json({ ok: true, action, result });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (error: unknown) {
    logError("ADMIN_AVATAR_VIDEOS", error, { route: "trigger_POST" });
    return NextResponse.json(
      {
        error: "TRIGGER_FAILED",
        message: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
