import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity } from "@/lib/auth";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const identity = await resolveIdentity(req).catch(() => null);
    if (!identity?.userId) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

    const prisma = getPrismaClient();
    const message = await prisma.adminMessage.findFirst({
      where: { id, userId: identity.userId },
      select: {
        id: true,
        subject: true,
        body: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
      },
    });

    if (!message) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({
      message: {
        ...message,
        sentAt: message.sentAt.toISOString(),
        deliveredAt: message.deliveredAt?.toISOString() ?? null,
        readAt: message.readAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    logError("me.admin_messages", "get_failed", { message: (error as Error)?.message });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

// Marca el mensaje como leído. Idempotente.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const identity = await resolveIdentity(req).catch(() => null);
    if (!identity?.userId) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

    const prisma = getPrismaClient();
    const result = await prisma.adminMessage.updateMany({
      where: { id, userId: identity.userId, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (error) {
    logError("me.admin_messages", "mark_read_failed", { message: (error as Error)?.message });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
