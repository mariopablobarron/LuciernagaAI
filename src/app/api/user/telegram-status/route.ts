import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";

export const dynamic = "force-dynamic";

// GET /api/user/telegram-status
// Returns whether the current user has a Telegram account linked,
// plus the bot username so the client can build the t.me deep link.
export async function GET(req: NextRequest) {
  const identity = await resolveIdentity(req, { allowAnonymousBootstrap: true });
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { telegramId: true },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim() ?? "";

  return NextResponse.json({
    linked: Boolean(user?.telegramId),
    telegramId: user?.telegramId ?? null,
    botUsername,
  });
}
