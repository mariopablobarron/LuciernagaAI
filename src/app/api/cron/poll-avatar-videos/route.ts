import { type NextRequest, NextResponse } from "next/server";
import { runPollGoalAvatarVideos } from "@/services/goalAvatarVideos";
import { runPollBroadcastAvatarVideos } from "@/services/broadcastAvatarVideos";
import { logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

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
