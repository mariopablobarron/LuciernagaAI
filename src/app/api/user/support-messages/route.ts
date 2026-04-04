import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity } from "@/lib/auth";

// GET /api/user/support-messages — list delivered messages for this user
export async function GET(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const prisma = getPrismaClient();

  const messages = await prisma.supportMessage.findMany({
    where: {
      userId: identity.userId,
      deliveredAt: { not: null },
    },
    orderBy: { deliveredAt: "desc" },
    take: 20,
    select: {
      id: true,
      fromName: true,
      content: true,
      deliveredAt: true,
      readAt: true,
      createdAt: true,
    },
  });

  const unreadCount = messages.filter((m) => !m.readAt).length;
  return NextResponse.json({ messages, unreadCount });
}

// PATCH /api/user/support-messages — mark one or all as read
export async function PATCH(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const body = (await req.json().catch(() => null)) as {
    id?: string;   // mark specific message read
    all?: boolean; // mark all read
  } | null;

  if (!body?.id && !body?.all) {
    return NextResponse.json({ error: "Proporciona id o all:true" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const now = new Date();

  if (body.all) {
    await prisma.supportMessage.updateMany({
      where: { userId: identity.userId, readAt: null, deliveredAt: { not: null } },
      data: { readAt: now },
    });
    return NextResponse.json({ ok: true });
  }

  const msg = await prisma.supportMessage.findFirst({
    where: { id: body.id, userId: identity.userId },
  });
  if (!msg) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.supportMessage.update({
    where: { id: body.id },
    data: { readAt: now },
  });
  return NextResponse.json({ ok: true });
}
