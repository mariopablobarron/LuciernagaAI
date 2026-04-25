import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    // Get user's active circle membership
    const membership = await prisma.circleMember.findFirst({
      where: { userId: identity.userId, leftAt: null },
      include: {
        circle: {
          include: {
            members: {
              where: { leftAt: null },
              include: { user: { select: { id: true, name: true } } },
            },
            _count: { select: { members: { where: { leftAt: null } } } },
          },
        },
      },
    });

    if (!membership) {
      // No self-serve listing in v2 — circles are formed by pattern-based matchmaking,
      // not browsed. Return empty available list; matchmaking service places users.
      return NextResponse.json({ myCircle: null, available: [] });
    }

    const circle = membership.circle;
    return NextResponse.json({
      myCircle: {
        id: circle.id,
        name: circle.name,
        matchPattern: circle.matchPattern,
        matchEmotion: circle.matchEmotion,
        description: circle.description,
        myRole: membership.role,
        members: circle.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          role: m.role,
          isMe: m.userId === identity.userId,
        })),
        memberCount: circle._count.members,
        maxMembers: circle.maxMembers,
        cycleEndsAt: circle.cycleEndsAt?.toISOString() ?? null,
      },
      available: [],
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/circles" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const { action } = (await req.json()) as { action?: string };

    const prisma = getPrismaClient();

    if (action === "leave") {
      await prisma.circleMember.updateMany({
        where: { userId: identity.userId, leftAt: null },
        data: { leftAt: new Date() },
      });
      return NextResponse.json({ success: true, action: "left" });
    }

    return NextResponse.json(
      { error: "JOIN_NOT_ALLOWED", message: "Circle membership is assigned by matchmaking, not requested." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/circles", method: "POST" });
    return NextResponse.json({ error: "LEAVE_FAILED" }, { status: 500 });
  }
}
