import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get("spaceId");
    const circleId = searchParams.get("circleId");
    const type = searchParams.get("type");
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const prisma = getPrismaClient();

    const where: Record<string, unknown> = { hidden: false };
    if (spaceId) where.spaceId = spaceId;
    if (circleId) where.circleId = circleId;
    if (type) where.type = type;

    const posts = await prisma.communityPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        feeling: true,
        blocker: true,
        step: true,
        content: true,
        anonymous: true,
        createdAt: true,
        likes: true,
        user: { select: { id: true, name: true } },
        _count: { select: { heartbeats: true } },
      },
    });

    const formatted = posts.map((p) => ({
      id: p.id,
      type: p.type,
      feeling: p.feeling,
      blocker: p.blocker,
      step: p.step,
      content: p.content,
      anonymous: p.anonymous,
      author: p.anonymous ? null : { name: p.user.name },
      isOwn: p.user.id === identity.userId,
      heartbeats: p._count.heartbeats + p.likes,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ posts: formatted });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/posts", method: "GET" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as {
      type?: string;
      feeling?: string;
      blocker?: string;
      step?: string;
      content?: string;
      spaceId?: string;
      circleId?: string;
      anonymous?: boolean;
    };

    const type = body.type ?? "reflection";
    if (!["reflection", "victory", "commitment", "question"].includes(type)) {
      return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
    }

    if (!body.feeling?.trim() && !body.content?.trim()) {
      return NextResponse.json({ error: "CONTENT_REQUIRED" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const post = await prisma.communityPost.create({
      data: {
        userId: identity.userId,
        type,
        feeling: body.feeling?.trim().slice(0, 500) || null,
        blocker: body.blocker?.trim().slice(0, 500) || null,
        step: body.step?.trim().slice(0, 500) || null,
        content: body.content?.trim().slice(0, 1000) || null,
        spaceId: body.spaceId || null,
        circleId: body.circleId || null,
        anonymous: body.anonymous ?? true,
      },
    });

    return NextResponse.json({ success: true, id: post.id });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/posts", method: "POST" });
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }
}
