import { type NextRequest, NextResponse } from "next/server";
import {
  resolveIdentity,
  InvalidSessionTokenError,
  attachSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

// PUT /api/diary/[id] — update an existing diary entry
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const identity = await resolveIdentity(req);
    const { id } = await params;
    const body = await req.json();

    const prisma = getPrismaClient();

    // Verify ownership
    const existing = await prisma.diaryEntry.findFirst({
      where: { id, userId: identity.userId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.content === "string") data.content = body.content.trim();
    if (body.blocks !== undefined) data.blocks = Array.isArray(body.blocks) ? body.blocks : null;
    if (typeof body.mood === "string" || body.mood === null) data.mood = body.mood;
    if (Array.isArray(body.tags)) data.tags = body.tags.filter((t: unknown) => typeof t === "string");

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const entry = await prisma.diaryEntry.update({
      where: { id },
      data,
    });

    const response = NextResponse.json({ entry });
    if (identity.shouldSetCookie) attachSessionCookie(response, identity.sessionToken);
    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("DIARY", error, { action: "update" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/diary/[id] — delete a diary entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const identity = await resolveIdentity(req);
    const { id } = await params;

    const prisma = getPrismaClient();

    const existing = await prisma.diaryEntry.findFirst({
      where: { id, userId: identity.userId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await prisma.diaryEntry.delete({ where: { id } });

    const response = NextResponse.json({ ok: true });
    if (identity.shouldSetCookie) attachSessionCookie(response, identity.sessionToken);
    return response;
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    logError("DIARY", error, { action: "delete" });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
