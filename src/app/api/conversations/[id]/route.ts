import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity } from "@/lib/auth";

// PATCH /api/conversations/[id]  — rename or set rating / journalMode
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await resolveIdentity(req);
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    rating?: number;
    journalMode?: boolean;
  } | null;

  if (!body) return NextResponse.json({ error: "Body requerido" }, { status: 400 });

  const prisma = getPrismaClient();

  const conv = await prisma.conversation.findFirst({
    where: { id, userId: identity.userId },
    select: { id: true },
  });
  if (!conv) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim())
    data.title = body.title.trim().slice(0, 80);
  if (body.rating === 1 || body.rating === -1) data.rating = body.rating;
  if (typeof body.journalMode === "boolean") data.journalMode = body.journalMode;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const updated = await prisma.conversation.update({
    where: { id },
    data,
    select: { id: true, title: true, rating: true, journalMode: true },
  });

  return NextResponse.json({ conversation: updated });
}

// DELETE /api/conversations/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await resolveIdentity(req);
  const { id } = await params;
  const prisma = getPrismaClient();

  const conv = await prisma.conversation.findFirst({
    where: { id, userId: identity.userId },
    select: { id: true },
  });
  if (!conv) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
