import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveAdminAuth } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";

// GET /api/admin/clinical-notes/[userId] — list notes for a user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const auth = resolveAdminAuth(req);
    if (!auth.authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId } = await params;
    const prisma = getPrismaClient();

    const notes = await prisma.clinicalNote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, tags: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ notes });
  } catch (err) {
    logError("ADMIN", err instanceof Error ? err : new Error(String(err)), { route: "/api/admin/clinical-notes/[userId]", method: "GET" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/clinical-notes/[userId] — create a new note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const auth = resolveAdminAuth(req);
    if (!auth.authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId } = await params;
    const body = (await req.json().catch(() => null)) as { content?: string; tags?: string[] } | null;

    if (!body?.content?.trim()) {
      return NextResponse.json({ error: "content es requerido" }, { status: 400 });
    }

    const prisma = getPrismaClient();

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const note = await prisma.clinicalNote.create({
      data: {
        userId,
        content: body.content.trim(),
        tags: body.tags ?? [],
      },
      select: { id: true, content: true, tags: true, createdAt: true },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    logError("ADMIN", err instanceof Error ? err : new Error(String(err)), { route: "/api/admin/clinical-notes/[userId]", method: "POST" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/clinical-notes/[userId]?noteId=xxx — delete a note
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const auth = resolveAdminAuth(req);
    if (!auth.authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId } = await params;
    const noteId = req.nextUrl.searchParams.get("noteId");
    if (!noteId) return NextResponse.json({ error: "noteId es requerido" }, { status: 400 });

    const prisma = getPrismaClient();
    const note = await prisma.clinicalNote.findFirst({ where: { id: noteId, userId } });
    if (!note) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });

    await prisma.clinicalNote.delete({ where: { id: noteId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("ADMIN", err instanceof Error ? err : new Error(String(err)), { route: "/api/admin/clinical-notes/[userId]", method: "DELETE" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
