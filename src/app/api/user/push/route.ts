import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";

// POST /api/user/push — subscribe to push notifications
export async function POST(req: NextRequest) {
  let identity;
  try {
    identity = await resolveIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }

  const body = (await req.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: "Missing subscription data" },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  const userAgent = req.headers.get("user-agent") ?? undefined;

  await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: { userId: identity.userId, endpoint },
    },
    create: {
      userId: identity.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/user/push — unsubscribe from push notifications
export async function DELETE(req: NextRequest) {
  let identity;
  try {
    identity = await resolveIdentity(req);
  } catch (e) {
    if (e instanceof InvalidSessionTokenError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }

  const body = (await req.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  await prisma.pushSubscription.deleteMany({
    where: { userId: identity.userId, endpoint: body.endpoint },
  });

  return NextResponse.json({ ok: true });
}
