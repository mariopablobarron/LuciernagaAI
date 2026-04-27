import { type NextRequest, NextResponse } from "next/server";
import { runPollGoalAvatarVideos } from "@/services/goalAvatarVideos";
import { runPollBroadcastAvatarVideos } from "@/services/broadcastAvatarVideos";
import { logError, logInfo } from "@/lib/logger";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    logInfo("CRON", "poll_avatar_videos_triggered", {});
    const [goalStats, broadcastStats] = await Promise.all([
      runPollGoalAvatarVideos(),
      runPollBroadcastAvatarVideos(),
    ]);
    return NextResponse.json({
      ok: true,
      goal: goalStats,
      broadcast: broadcastStats,
    });
  } catch (error: unknown) {
    logError("CRON", error, { route: "/api/cron/poll-avatar-videos" });
    return NextResponse.json({ error: "JOB_FAILED" }, { status: 500 });
  }
}

export const GET = POST;
