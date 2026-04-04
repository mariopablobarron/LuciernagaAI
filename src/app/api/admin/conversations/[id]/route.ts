import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const adminAuth = resolveAdminAuth(req);
  if (!adminAuth.authenticated) {
    const res = NextResponse.json(
      { error: "UNAUTHORIZED_ADMIN" },
      { status: 401 }
    );
    if (adminAuth.source === "invalid") clearAdminSessionCookie(res);
    return res;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      rating: true,
      journalMode: true,
      userId: true,
      user: {
        select: { id: true, email: true, name: true },
      },
      messageRecords: {
        select: { id: true, role: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      rating: conversation.rating,
      journalMode: conversation.journalMode,
      userId: conversation.userId,
      user: conversation.user,
      messages: conversation.messageRecords.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    },
  });
}
