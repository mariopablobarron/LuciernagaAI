import { NextResponse, type NextRequest } from "next/server";
import { resolveIdentity, attachSessionCookie, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

/**
 * GET  /api/weekly-letter/[id]  — read a specific letter (must be owner).
 * PATCH /api/weekly-letter/[id] — mark opened/read. Body: { action: "open" | "read" }.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const identity = await resolveIdentity(req);
    const { id } = await params;
    const prisma = getPrismaClient();

    const letter = await prisma.weeklyLetter.findFirst({
      where: { id, userId: identity.userId, published: true },
      select: {
        id: true,
        subject: true,
        body: true,
        state: true,
        weekStart: true,
        weekEnd: true,
        readAt: true,
        createdAt: true,
      },
    });

    if (!letter) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const response = NextResponse.json({ letter });
    attachSessionCookie(response, identity.sessionToken);
    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("WEEKLY_LETTER", error, { route: "GET /api/weekly-letter/[id]" });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const identity = await resolveIdentity(req);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    const action = body.action === "read" || body.action === "open" ? body.action : null;
    if (!action) {
      return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const existing = await prisma.weeklyLetter.findFirst({
      where: { id, userId: identity.userId, published: true },
      select: { id: true, openedAt: true, readAt: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const now = new Date();
    const data: { openedAt?: Date; readAt?: Date } = {};
    if (action === "open" && !existing.openedAt) data.openedAt = now;
    if (action === "read") {
      if (!existing.openedAt) data.openedAt = now;
      if (!existing.readAt) data.readAt = now;
    }

    if (Object.keys(data).length > 0) {
      await prisma.weeklyLetter.update({ where: { id }, data });
    }

    const response = NextResponse.json({ ok: true });
    attachSessionCookie(response, identity.sessionToken);
    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logError("WEEKLY_LETTER", error, { route: "PATCH /api/weekly-letter/[id]" });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
