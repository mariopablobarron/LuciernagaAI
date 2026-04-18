import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/community/answers/[id]/helpful
 * Toggles "me ayudó" vote. Idempotent: second call removes the vote.
 * Users cannot vote on their own answers.
 */
export async function POST(req: NextRequest, ctx: RouteParams) {
  try {
    const identity = await resolveIdentity(req);
    const { id: answerId } = await ctx.params;

    const prisma = getPrismaClient();
    const answer = await prisma.anonAnswer.findUnique({
      where: { id: answerId },
      select: { id: true, userId: true, hidden: true },
    });
    if (!answer || answer.hidden) {
      return NextResponse.json({ error: "ANSWER_NOT_FOUND" }, { status: 404 });
    }
    if (answer.userId === identity.userId) {
      return NextResponse.json({ error: "SELF_VOTE_FORBIDDEN" }, { status: 403 });
    }

    const existing = await prisma.anonAnswerVote.findUnique({
      where: { answerId_userId: { answerId, userId: identity.userId } },
    });

    let voted: boolean;
    if (existing) {
      await prisma.anonAnswerVote.delete({ where: { id: existing.id } });
      voted = false;
    } else {
      await prisma.anonAnswerVote.create({
        data: { answerId, userId: identity.userId },
      });
      voted = true;
    }

    const count = await prisma.anonAnswerVote.count({ where: { answerId } });
    return NextResponse.json({ ok: true, voted, count });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/answers/[id]/helpful" });
    return NextResponse.json({ error: "VOTE_FAILED" }, { status: 500 });
  }
}
