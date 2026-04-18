import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { isContentSafe, looksLikeCrisis } from "@/lib/content-safety";
import { awardLatidos } from "@/services/latidos";

export const dynamic = "force-dynamic";

// Max answers per question — hard cap to avoid pile-on.
const MAX_ANSWERS_PER_QUESTION = 5;
// Daily rate limits per user.
const MAX_QUESTIONS_PER_DAY = 10;
const MAX_ANSWERS_PER_DAY = 20;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const { searchParams } = new URL(req.url);
    // "community" (targetId=null) | "personal" (targetId=me) | "mine" (authorId=me) | "all"
    const filter = searchParams.get("filter") ?? "community";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const prisma = getPrismaClient();

    const where: Record<string, unknown> = { hidden: false };
    if (filter === "community") where.targetId = null;
    else if (filter === "personal") where.targetId = identity.userId;
    else if (filter === "mine") where.authorId = identity.userId;
    // "all" → no extra filter

    const questions = await prisma.anonQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        content: true,
        targetId: true,
        crisisDetected: true,
        createdAt: true,
        _count: { select: { answers: { where: { hidden: false } } } },
        answers: {
          where: { hidden: false },
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            content: true,
            anonymous: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
            _count: { select: { votes: true } },
            votes: {
              where: { userId: identity.userId },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    // Rank answers: highest helpful-count first, then oldest first.
    return NextResponse.json({
      questions: questions.map((q) => {
        const ranked = [...q.answers]
          .map((a) => ({
            id: a.id,
            content: a.content,
            author: a.anonymous ? null : a.user.name,
            isOwn: a.user.id === identity.userId,
            helpfulCount: a._count.votes,
            helpfulByMe: a.votes.length > 0,
            createdAt: a.createdAt.toISOString(),
          }))
          .sort(
            (a, b) =>
              b.helpfulCount - a.helpfulCount ||
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        return {
          id: q.id,
          content: q.content,
          isForMe: q.targetId === identity.userId,
          answerCount: q._count.answers,
          answersFull: q._count.answers >= MAX_ANSWERS_PER_QUESTION,
          crisisDetected: q.crisisDetected,
          createdAt: q.createdAt.toISOString(),
          answers: ranked.slice(0, 3),
          topAnswerId: ranked[0]?.helpfulCount ? ranked[0].id : null,
        };
      }),
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/questions", method: "GET" });
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as {
      content?: string;
      targetId?: string;
      answerId?: string; // if answering a question
      answerContent?: string;
      anonymous?: boolean;
    };

    const prisma = getPrismaClient();
    const todayStart = startOfToday();

    // ─── Answer flow ────────────────────────────────────────────────────────
    if (body.answerId && body.answerContent?.trim()) {
      const answerText = body.answerContent.trim().slice(0, 1000);

      if (!isContentSafe(answerText)) {
        logInfo("COMMUNITY", "answer_blocked_by_filter", {
          userId: identity.userId,
          questionId: body.answerId,
        });
        return NextResponse.json(
          {
            error: "CONTENT_BLOCKED",
            message:
              "Tu mensaje contiene contenido que no podemos publicar. Si estás en crisis, llama al 024.",
          },
          { status: 422 },
        );
      }

      const question = await prisma.anonQuestion.findUnique({
        where: { id: body.answerId },
        select: { id: true, hidden: true, crisisDetected: true },
      });
      if (!question || question.hidden) {
        return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
      }
      // Crisis handoff: answers disabled on questions flagged as crisis.
      if (question.crisisDetected) {
        return NextResponse.json(
          {
            error: "ANSWERS_DISABLED",
            message: "Esta pregunta está derivada a atención profesional y no acepta respuestas.",
          },
          { status: 423 },
        );
      }

      // Hard cap on answers per question.
      const currentAnswers = await prisma.anonAnswer.count({
        where: { questionId: body.answerId, hidden: false },
      });
      if (currentAnswers >= MAX_ANSWERS_PER_QUESTION) {
        return NextResponse.json(
          {
            error: "ANSWERS_FULL",
            message: `Esta pregunta ya tiene ${MAX_ANSWERS_PER_QUESTION} respuestas.`,
          },
          { status: 409 },
        );
      }

      // Daily rate limit per user.
      const answersToday = await prisma.anonAnswer.count({
        where: { userId: identity.userId, createdAt: { gte: todayStart } },
      });
      if (answersToday >= MAX_ANSWERS_PER_DAY) {
        return NextResponse.json(
          { error: "RATE_LIMIT", message: `Máximo ${MAX_ANSWERS_PER_DAY} respuestas por día.` },
          { status: 429 },
        );
      }

      const answer = await prisma.anonAnswer.create({
        data: {
          questionId: body.answerId,
          userId: identity.userId,
          content: answerText,
          anonymous: body.anonymous ?? false,
        },
      });

      // Reward the responder — gamification incentive.
      void awardLatidos(identity.userId, "community_reply", undefined, `answer=${answer.id}`).catch(
        () => {},
      );

      return NextResponse.json({ success: true, id: answer.id, type: "answer" });
    }

    // ─── Question flow ──────────────────────────────────────────────────────
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "CONTENT_REQUIRED" }, { status: 400 });
    }

    const questionText = body.content.trim();
    if (questionText.length > 500) {
      return NextResponse.json({ error: "TOO_LONG" }, { status: 400 });
    }

    if (!isContentSafe(questionText)) {
      logInfo("COMMUNITY", "question_blocked_by_filter", { userId: identity.userId });
      return NextResponse.json(
        {
          error: "CONTENT_BLOCKED",
          message:
            "Tu mensaje contiene contenido que no podemos publicar. Si estás en crisis, llama al 024.",
        },
        { status: 422 },
      );
    }

    // Daily rate limit.
    const questionsToday = await prisma.anonQuestion.count({
      where: { authorId: identity.userId, createdAt: { gte: todayStart } },
    });
    if (questionsToday >= MAX_QUESTIONS_PER_DAY) {
      return NextResponse.json(
        { error: "RATE_LIMIT", message: `Máximo ${MAX_QUESTIONS_PER_DAY} preguntas por día.` },
        { status: 429 },
      );
    }

    // Detect crisis — stored on the row and routed to admin; does not block.
    const crisisDetected = looksLikeCrisis(questionText);

    const question = await prisma.anonQuestion.create({
      data: {
        content: questionText,
        authorId: identity.userId,
        targetId: body.targetId || null,
        crisisDetected,
      },
    });

    if (crisisDetected) {
      logInfo("COMMUNITY", "question_crisis_detected", {
        questionId: question.id,
        userId: identity.userId,
      });
      // Admin notify is intentionally fire-and-forget to avoid blocking publish.
      import("@/services/telegram")
        .then(({ notifyAdmin }) => {
          notifyAdmin(
            `🚨 *Pregunta con señales de crisis*\n\n\`${question.id}\`\n_${questionText.slice(0, 200)}_\n\nRespuestas comunitarias desactivadas.`,
          );
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      id: question.id,
      type: "question",
      crisisDetected,
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/questions", method: "POST" });
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }
}
