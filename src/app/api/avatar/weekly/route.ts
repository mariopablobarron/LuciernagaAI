import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import {
  attachSessionCookie,
  clearSessionCookie,
  InvalidSessionTokenError,
  resolveIdentity,
} from "@/lib/auth";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type VideoSource = "goal" | "broadcast";

type ServedVideo = {
  id: string;
  source: VideoSource;
  phase: string | null; // START | MIDPOINT | END for goal; null for broadcast
  videoUrl: string;
  script: string;
};

function unauthorized() {
  const res = NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
  clearSessionCookie(res);
  return res;
}

/**
 * Returns the next unseen READY avatar video for the current user across both
 * sources (goal-arc videos and admin broadcasts). Picks the oldest to respect
 * the natural arrival order.
 */
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const [goalVideo, broadcastDelivery] = await Promise.all([
      prisma.goalAvatarVideo.findFirst({
        where: {
          userId: identity.userId,
          status: "READY",
          seenAt: null,
          videoUrl: { not: null },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          phase: true,
          videoUrl: true,
          script: true,
          createdAt: true,
        },
      }),
      prisma.broadcastAvatarDelivery.findFirst({
        where: {
          userId: identity.userId,
          status: "READY",
          seenAt: null,
          videoUrl: { not: null },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          videoUrl: true,
          script: true,
          createdAt: true,
        },
      }),
    ]);

    let serve: ServedVideo | null = null;
    if (goalVideo && broadcastDelivery) {
      if (goalVideo.createdAt <= broadcastDelivery.createdAt) {
        serve = {
          id: goalVideo.id,
          source: "goal",
          phase: goalVideo.phase,
          videoUrl: goalVideo.videoUrl!,
          script: goalVideo.script,
        };
      } else {
        serve = {
          id: broadcastDelivery.id,
          source: "broadcast",
          phase: null,
          videoUrl: broadcastDelivery.videoUrl!,
          script: broadcastDelivery.script,
        };
      }
    } else if (goalVideo) {
      serve = {
        id: goalVideo.id,
        source: "goal",
        phase: goalVideo.phase,
        videoUrl: goalVideo.videoUrl!,
        script: goalVideo.script,
      };
    } else if (broadcastDelivery) {
      serve = {
        id: broadcastDelivery.id,
        source: "broadcast",
        phase: null,
        videoUrl: broadcastDelivery.videoUrl!,
        script: broadcastDelivery.script,
      };
    }

    const response = NextResponse.json({ success: true, video: serve });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) return unauthorized();
    logError("AVATAR_WEEKLY", error, { route: "/api/avatar/weekly", method: "GET" });
    return NextResponse.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}

/**
 * Marks the given video as seen. Body: { id: string, source: "goal" | "broadcast" }.
 */
export async function PATCH(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      source?: VideoSource;
    };
    if (!body.id || !body.source) {
      return NextResponse.json(
        { success: false, error: "id and source required" },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    let updated = 0;
    if (body.source === "goal") {
      const result = await prisma.goalAvatarVideo.updateMany({
        where: { id: body.id, userId: identity.userId, seenAt: null },
        data: { seenAt: new Date() },
      });
      updated = result.count;
    } else if (body.source === "broadcast") {
      const result = await prisma.broadcastAvatarDelivery.updateMany({
        where: { id: body.id, userId: identity.userId, seenAt: null },
        data: { seenAt: new Date() },
      });
      updated = result.count;
    } else {
      return NextResponse.json(
        { success: false, error: "invalid source" },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ success: true, updated });
    if (identity.shouldSetCookie) {
      attachSessionCookie(response, identity.sessionToken);
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSessionTokenError) return unauthorized();
    logError("AVATAR_WEEKLY", error, { route: "/api/avatar/weekly", method: "PATCH" });
    return NextResponse.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}
