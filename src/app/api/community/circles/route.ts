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
            challenges: {
              orderBy: { weekStart: "desc" },
              take: 1,
            },
            _count: { select: { members: { where: { leftAt: null } } } },
          },
        },
      },
    });

    if (!membership) {
      // List available circles to join
      const available = await prisma.circle.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          phase: true,
          description: true,
          maxMembers: true,
          _count: { select: { members: { where: { leftAt: null } } } },
        },
      });

      const open = available.filter((c) => c._count.members < c.maxMembers);
      return NextResponse.json({
        myCircle: null,
        available: open.map((c) => ({
          id: c.id,
          name: c.name,
          phase: c.phase,
          description: c.description,
          members: c._count.members,
          maxMembers: c.maxMembers,
        })),
      });
    }

    const circle = membership.circle;
    return NextResponse.json({
      myCircle: {
        id: circle.id,
        name: circle.name,
        phase: circle.phase,
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
        currentChallenge: circle.challenges[0] ?? null,
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
    const { circleId, action } = (await req.json()) as { circleId?: string; action?: string };

    const prisma = getPrismaClient();

    if (action === "leave") {
      await prisma.circleMember.updateMany({
        where: { userId: identity.userId, leftAt: null },
        data: { leftAt: new Date() },
      });
      return NextResponse.json({ success: true, action: "left" });
    }

    if (!circleId) {
      return NextResponse.json({ error: "CIRCLE_ID_REQUIRED" }, { status: 400 });
    }

    // Check if already in a circle
    const existing = await prisma.circleMember.findFirst({
      where: { userId: identity.userId, leftAt: null },
    });
    if (existing) {
      return NextResponse.json({ error: "ALREADY_IN_CIRCLE" }, { status: 409 });
    }

    // Check if circle has space
    const circle = await prisma.circle.findUnique({
      where: { id: circleId },
      include: { _count: { select: { members: { where: { leftAt: null } } } } },
    });
    if (!circle || !circle.isActive) {
      return NextResponse.json({ error: "CIRCLE_NOT_FOUND" }, { status: 404 });
    }
    if (circle._count.members >= circle.maxMembers) {
      return NextResponse.json({ error: "CIRCLE_FULL" }, { status: 409 });
    }

    await prisma.circleMember.create({
      data: { circleId, userId: identity.userId },
    });

    return NextResponse.json({ success: true, action: "joined" });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/circles", method: "POST" });
    return NextResponse.json({ error: "JOIN_FAILED" }, { status: 500 });
  }
}
