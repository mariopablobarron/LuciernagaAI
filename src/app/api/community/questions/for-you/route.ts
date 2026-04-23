import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";
import { detectUserState } from "@/services/state";
import type { UserState } from "@/domain/types";

export const dynamic = "force-dynamic";

// ── Eligibility and cooldown (in-memory; resets on redeploy) ──────────────
// Fires the "alguien te necesita" banner to users who have shown they can
// help — not to every user. Three signals count:
//   - streak.currentDays >= 3
//   - >=2 answers in the last 30 days
//   - >=1 helpful vote received (someone said their answer helped)

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const lastShownByUser = new Map<string, number>();

const MIN_STREAK_DAYS = 3;
const MIN_ANSWERS_30D = 2;
const WINDOW_DAYS = 30;

function isInCooldown(userId: string, now: number): boolean {
  const last = lastShownByUser.get(userId);
  if (last === undefined) return false;
  if (now - last >= COOLDOWN_MS) {
    lastShownByUser.delete(userId);
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const now = Date.now();

    if (isInCooldown(identity.userId, now)) {
      return NextResponse.json({ eligible: false, reason: "cooldown" });
    }

    const prisma = getPrismaClient();
    const since = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // ── Eligibility check ────────────────────────────────────────────────
    const [streak, answerCount, helpfulVotes] = await Promise.all([
      prisma.streak.findUnique({
        where: { userId: identity.userId },
        select: { currentDays: true },
      }),
      prisma.anonAnswer.count({
        where: { userId: identity.userId, createdAt: { gte: since } },
      }),
      prisma.anonAnswerVote.count({
        where: {
          answer: { userId: identity.userId },
        },
      }),
    ]);

    const currentDays = streak?.currentDays ?? 0;
    const isHelper =
      currentDays >= MIN_STREAK_DAYS ||
      answerCount >= MIN_ANSWERS_30D ||
      helpfulVotes >= 1;

    if (!isHelper) {
      return NextResponse.json({ eligible: false, reason: "not_helper_profile" });
    }

    // ── Find a candidate question that resonates ─────────────────────────
    // Match by dominant emotional state of the user's own recent messages
    // vs inferred state of the candidate question. "You wrote something
    // similar X months ago" — signal without exposing the user's history.

    const userRecentMessages = await prisma.message.findMany({
      where: {
        userId: identity.userId,
        role: "user",
        createdAt: { gte: new Date(now - 180 * 24 * 60 * 60 * 1000) }, // last 6 months
      },
      select: { content: true },
      orderBy: { createdAt: "desc" },
      take: 120,
    });

    if (userRecentMessages.length < 3) {
      return NextResponse.json({ eligible: false, reason: "insufficient_user_history" });
    }

    const stateCounts: Record<UserState, number> = {
      neutral: 0, duda: 0, bloqueo: 0, ansiedad: 0, claridad: 0,
    };
    for (const m of userRecentMessages) stateCounts[detectUserState(m.content)] += 1;

    // Pick the top state excluding neutral/claridad (only "pain" states
    // create resonance for the "you've been there" framing).
    const painStates: UserState[] = ["bloqueo", "ansiedad", "duda"];
    let userTopState: UserState | null = null;
    let userTopCount = 0;
    for (const s of painStates) {
      if (stateCounts[s] > userTopCount) {
        userTopState = s;
        userTopCount = stateCounts[s];
      }
    }
    if (!userTopState || userTopCount < 2) {
      return NextResponse.json({ eligible: false, reason: "no_resonant_state" });
    }

    // ── Candidate questions ─────────────────────────────────────────────
    const openQuestions = await prisma.anonQuestion.findMany({
      where: {
        hidden: false,
        crisisDetected: false,
        authorId: { not: identity.userId },
        OR: [{ targetId: null }, { NOT: { targetId: identity.userId } }],
        answers: { none: { userId: identity.userId } },
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        _count: { select: { answers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    // Filter: question must classify into the user's top pain state.
    const resonant = openQuestions.filter(
      (q) => detectUserState(q.content) === userTopState,
    );
    if (resonant.length === 0) {
      return NextResponse.json({
        eligible: true,
        question: null,
        openCount: openQuestions.length,
        matchedOn: userTopState,
      });
    }

    // Prefer 0-answer first, then most recent.
    resonant.sort((a, b) => {
      if (a._count.answers !== b._count.answers) return a._count.answers - b._count.answers;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    const chosen = resonant[0];

    lastShownByUser.set(identity.userId, now);

    return NextResponse.json({
      eligible: true,
      question: {
        id: chosen.id,
        content: chosen.content,
        answerCount: chosen._count.answers,
        createdAt: chosen.createdAt.toISOString(),
      },
      openCount: openQuestions.length,
      matchedOn: userTopState,
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/questions/for-you" });
    return NextResponse.json({ eligible: false, reason: "error" });
  }
}
