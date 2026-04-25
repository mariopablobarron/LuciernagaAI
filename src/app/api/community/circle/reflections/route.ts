import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/community/circle/reflections
// Returns the user's published mentor reflections (most recent first). Reflections
// in source="auto" awaiting admin approval are NOT visible.
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const reflections = await prisma.mentorReflection.findMany({
      where: { userId: identity.userId, publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 12,
      select: {
        id: true,
        content: true,
        publishedAt: true,
        readAt: true,
        pulse: { select: { prompt: true, weekStart: true } },
      },
    });

    return NextResponse.json({
      reflections: reflections.map((r) => ({
        id: r.id,
        content: r.content,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        readAt: r.readAt?.toISOString() ?? null,
        prompt: r.pulse.prompt,
        weekStart: r.pulse.weekStart.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/circle/reflections" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

// POST /api/community/circle/reflections  { reflectionId: string, action: "mark-read" }
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json().catch(() => null)) as { reflectionId?: string; action?: string } | null;
    if (!body?.reflectionId || body.action !== "mark-read") {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }
    const prisma = getPrismaClient();
    const updated = await prisma.mentorReflection.updateMany({
      where: { id: body.reflectionId, userId: identity.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ updated: updated.count });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/circle/reflections", method: "POST" });
    return NextResponse.json({ error: "MARK_FAILED" }, { status: 500 });
  }
}
