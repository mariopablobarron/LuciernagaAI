import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/community/questions/suggested
 *
 * Returns one open question the user could help with. Used by the
 * reciprocity loop: after a user votes "me ayudó" on an answer, we invite
 * them to pay it forward by answering someone else's question.
 *
 * Priority rules (fail-closed: returns { question: null } if no candidate):
 *   1. not authored by the current user
 *   2. not already answered by the current user
 *   3. not hidden, not crisis, not full
 *   4. at least one answer slot free (answerCount < MAX)
 *   5. prefer questions with 0 answers (loneliness priority)
 *   6. most recent first within the same 0-answers group
 */
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const MAX_ANSWERS_PER_QUESTION = 5;

    // Scan a small window of recent questions and filter client-side; the DB
    // shape makes a pure SQL query awkward.
    const recent = await prisma.anonQuestion.findMany({
      where: {
        hidden: false,
        crisisDetected: false,
        authorId: { not: identity.userId },
        // Either asked to everyone or targeted to someone else (not us).
        OR: [{ targetId: null }, { NOT: { targetId: identity.userId } }],
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        answers: {
          where: { hidden: false },
          select: { userId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const candidates = recent.filter((q) => {
      const answerCount = q.answers.length;
      if (answerCount >= MAX_ANSWERS_PER_QUESTION) return false;
      const alreadyAnswered = q.answers.some((a) => a.userId === identity.userId);
      return !alreadyAnswered;
    });

    if (candidates.length === 0) {
      return NextResponse.json({ question: null });
    }

    // Prefer 0-answers (loneliness first).
    candidates.sort((a, b) => {
      if (a.answers.length !== b.answers.length) return a.answers.length - b.answers.length;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const chosen = candidates[0];
    return NextResponse.json({
      question: {
        id: chosen.id,
        content: chosen.content,
        answerCount: chosen.answers.length,
        createdAt: chosen.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/questions/suggested" });
    return NextResponse.json({ question: null });
  }
}
