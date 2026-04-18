import { type NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ALLOWED_EMOJIS = new Set(["💓", "🫂", "🔥", "🌱", "✨"]);

// POST /api/community/daily-round/reaction
// Body: { responseId: string, emoji: string | null }
// Toggle: emoji null elimina la reacción del usuario; emoji repetido también
// la elimina; emoji distinto la sustituye. Solo para respuestas no propias.
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as { responseId?: string; emoji?: string | null };
    const responseId = body.responseId;
    const emoji = body.emoji ?? null;

    if (!responseId) return NextResponse.json({ error: "RESPONSE_ID_REQUIRED" }, { status: 400 });
    if (emoji !== null && !ALLOWED_EMOJIS.has(emoji)) {
      return NextResponse.json({ error: "INVALID_EMOJI" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const target = await prisma.dailyRoundResponse.findUnique({
      where: { id: responseId },
      select: { id: true, userId: true, hidden: true },
    });
    if (!target || target.hidden) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (target.userId === identity.userId) {
      return NextResponse.json({ error: "CANNOT_REACT_OWN" }, { status: 403 });
    }

    const existing = await prisma.dailyRoundReaction.findUnique({
      where: { responseId_userId: { responseId, userId: identity.userId } },
      select: { id: true, emoji: true },
    });

    if (emoji === null || (existing && existing.emoji === emoji)) {
      if (existing) {
        await prisma.dailyRoundReaction.delete({ where: { id: existing.id } });
      }
      return NextResponse.json({ ok: true, emoji: null });
    }

    if (existing) {
      await prisma.dailyRoundReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
    } else {
      await prisma.dailyRoundReaction.create({
        data: { responseId, userId: identity.userId, emoji },
      });
    }
    return NextResponse.json({ ok: true, emoji });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/daily-round/reaction", method: "POST" });
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
