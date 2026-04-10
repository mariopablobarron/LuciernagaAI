import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";

// GET /api/user/notifications — list notifications (paginated)
export async function GET(req: NextRequest) {
  let identity;
  try {
    identity = await resolveIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const prisma = getPrismaClient();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: identity.userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        body: true,
        url: true,
        icon: true,
        channel: true,
        read: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId: identity.userId, read: false },
    }),
  ]);

  const hasMore = notifications.length > limit;
  if (hasMore) notifications.pop();

  return NextResponse.json({
    notifications,
    unreadCount,
    nextCursor: hasMore ? notifications[notifications.length - 1]?.id : null,
  });
}

// PATCH /api/user/notifications — mark notifications as read
export async function PATCH(req: NextRequest) {
  let identity;
  try {
    identity = await resolveIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }

  const body = (await req.json()) as { ids?: string[]; all?: boolean };
  const prisma = getPrismaClient();
  const now = new Date();

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: identity.userId, read: false },
      data: { read: true, readAt: now },
    });
  } else if (body.ids?.length) {
    await prisma.notification.updateMany({
      where: { id: { in: body.ids }, userId: identity.userId, read: false },
      data: { read: true, readAt: now },
    });
  }

  return NextResponse.json({ ok: true });
}
