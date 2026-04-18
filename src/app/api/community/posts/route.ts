import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { areFieldsSafe } from "@/lib/content-safety";

export const dynamic = "force-dynamic";

// ─── GET /api/community/posts ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get("spaceId");
    const circleId = searchParams.get("circleId");
    const type = searchParams.get("type");
    const phase = searchParams.get("phase");
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    const prisma = getPrismaClient();

    const where: Record<string, unknown> = { hidden: false };
    if (spaceId) where.spaceId = spaceId;
    if (circleId) where.circleId = circleId;
    if (type) where.type = type;
    if (phase) where.phase = phase;

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          type: true,
          feeling: true,
          blocker: true,
          step: true,
          content: true,
          phase: true,
          anonymous: true,
          createdAt: true,
          likes: true,
          user: { select: { id: true, name: true } },
          _count: { select: { heartbeats: true } },
        },
      }),
      prisma.communityPost.count({ where }),
    ]);

    const formatted = posts.map((p) => ({
      id: p.id,
      type: p.type,
      feeling: p.feeling,
      blocker: p.blocker,
      step: p.step,
      content: p.content,
      phase: p.phase,
      anonymous: p.anonymous,
      author: p.anonymous ? null : { name: p.user.name },
      isOwn: p.user.id === identity.userId,
      heartbeats: p._count.heartbeats + p.likes,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ posts: formatted, total });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/posts", method: "GET" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

// ─── POST /api/community/posts ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as {
      type?: string;
      feeling?: string;
      blocker?: string;
      step?: string;
      content?: string;
      phase?: string;
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

    // Content safety check
    if (!areFieldsSafe(body.feeling, body.blocker, body.step, body.content)) {
      logInfo("COMMUNITY", "post_blocked_by_filter", { userId: identity.userId, type });
      return NextResponse.json(
        { error: "CONTENT_BLOCKED", message: "Tu mensaje contiene contenido que no podemos publicar. Si estas en crisis, llama al 024." },
        { status: 422 },
      );
    }

    // Rate limit: max 10 posts per day per user
    const prisma = getPrismaClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.communityPost.count({
      where: { userId: identity.userId, createdAt: { gte: todayStart } },
    });
    if (todayCount >= 10) {
      return NextResponse.json({ error: "RATE_LIMIT", message: "Maximo 10 posts por dia." }, { status: 429 });
    }

    const post = await prisma.communityPost.create({
      data: {
        userId: identity.userId,
        type,
        feeling: body.feeling?.trim().slice(0, 500) || null,
        blocker: body.blocker?.trim().slice(0, 500) || null,
        step: body.step?.trim().slice(0, 500) || null,
        content: body.content?.trim().slice(0, 1000) || null,
        phase: body.phase?.trim() || null,
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

// ─── DELETE /api/community/posts?id=xxx — delete own post ───────────────────

export async function DELETE(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const postId = req.nextUrl.searchParams.get("id");
    if (!postId) return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });

    const prisma = getPrismaClient();
    const post = await prisma.communityPost.findFirst({
      where: { id: postId, userId: identity.userId },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // Delete heartbeats first, then the post
    await prisma.heartbeat.deleteMany({ where: { postId } });
    await prisma.communityPost.delete({ where: { id: postId } });

    logInfo("COMMUNITY", "post_deleted_by_user", { userId: identity.userId, postId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/posts", method: "DELETE" });
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
}
