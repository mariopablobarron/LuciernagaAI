import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/community/circle/pulse/current
// Returns this week's Pulse for the user's active circle, plus their response (if any)
// and peer responses (anonymous, only visible once the user has responded).
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const membership = await prisma.circleMember.findFirst({
      where: { userId: identity.userId, leftAt: null },
      select: { circleId: true, circle: { select: { id: true, name: true, matchPattern: true, matchEmotion: true, cycleEndsAt: true, maxMembers: true } } },
    });
    if (!membership) {
      return NextResponse.json({ circle: null, pulse: null });
    }

    const pulse = await prisma.circlePulse.findFirst({
      where: { circleId: membership.circleId, status: "open" },
      orderBy: { weekStart: "desc" },
      select: {
        id: true,
        prompt: true,
        weekStart: true,
        weekEnd: true,
        openedAt: true,
        responses: {
          select: { id: true, userId: true, content: true, submittedAt: true },
        },
      },
    });

    const myResponse = pulse?.responses.find((r) => r.userId === identity.userId) ?? null;
    const hasResponded = Boolean(myResponse);
    const peerResponses = pulse
      ? pulse.responses
          .filter((r) => r.userId !== identity.userId)
          .map((r) => ({
            id: r.id,
            content: hasResponded ? r.content : null,
            submittedAt: r.submittedAt.toISOString(),
          }))
      : [];

    return NextResponse.json({
      circle: {
        id: membership.circle.id,
        name: membership.circle.name,
        matchPattern: membership.circle.matchPattern,
        matchEmotion: membership.circle.matchEmotion,
        cycleEndsAt: membership.circle.cycleEndsAt?.toISOString() ?? null,
        maxMembers: membership.circle.maxMembers,
      },
      pulse: pulse
        ? {
            id: pulse.id,
            prompt: pulse.prompt,
            weekStart: pulse.weekStart.toISOString(),
            weekEnd: pulse.weekEnd.toISOString(),
            openedAt: pulse.openedAt.toISOString(),
            myResponse: myResponse
              ? { id: myResponse.id, content: myResponse.content, submittedAt: myResponse.submittedAt.toISOString() }
              : null,
            responseCount: pulse.responses.length,
            peerResponses,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/circle/pulse/current" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}
