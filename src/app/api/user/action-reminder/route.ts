import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity } from "@/lib/auth";

// POST /api/user/action-reminder
// Body: { actionText: string; remindAt: string (ISO); conversationId?: string }
export async function POST(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const body = (await req.json().catch(() => null)) as {
    actionText?: string;
    remindAt?: string;
    conversationId?: string;
  } | null;

  if (!body?.actionText?.trim() || !body?.remindAt)
    return NextResponse.json({ error: "actionText y remindAt son requeridos" }, { status: 400 });

  const remindAt = new Date(body.remindAt);
  if (isNaN(remindAt.getTime()) || remindAt <= new Date())
    return NextResponse.json({ error: "remindAt debe ser una fecha futura válida" }, { status: 400 });

  const prisma = getPrismaClient();

  // Check user has telegramId — reminders only work via Telegram
  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { telegramId: true },
  });

  const reminder = await prisma.actionReminder.create({
    data: {
      userId: identity.userId,
      actionText: body.actionText.trim().slice(0, 400),
      remindAt,
      conversationId: body.conversationId ?? null,
    },
    select: { id: true, actionText: true, remindAt: true },
  });

  return NextResponse.json({
    reminder,
    telegramLinked: !!user?.telegramId,
  }, { status: 201 });
}

// GET /api/user/action-reminder — list upcoming reminders
export async function GET(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const prisma = getPrismaClient();

  const reminders = await prisma.actionReminder.findMany({
    where: { userId: identity.userId, sent: false },
    orderBy: { remindAt: "asc" },
    take: 20,
    select: { id: true, actionText: true, remindAt: true, conversationId: true },
  });

  return NextResponse.json({ reminders });
}

// DELETE /api/user/action-reminder?id=xxx
export async function DELETE(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const prisma = getPrismaClient();
  const reminder = await prisma.actionReminder.findFirst({
    where: { id, userId: identity.userId, sent: false },
  });
  if (!reminder) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.actionReminder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
