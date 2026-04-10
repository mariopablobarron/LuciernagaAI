import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") ?? "all"; // "all" | "mine" | "forme"
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const prisma = getPrismaClient();

    const where: Record<string, unknown> = { hidden: false };
    if (filter === "mine") where.authorId = identity.userId;
    if (filter === "forme") where.targetId = identity.userId;

    const questions = await prisma.anonQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        content: true,
        targetId: true,
        createdAt: true,
        _count: { select: { answers: true } },
        answers: {
          where: { hidden: false },
          orderBy: { likes: "desc" },
          take: 3,
          select: {
            id: true,
            content: true,
            anonymous: true,
            likes: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        content: q.content,
        isForMe: q.targetId === identity.userId,
        answerCount: q._count.answers,
        createdAt: q.createdAt.toISOString(),
        answers: q.answers.map((a) => ({
          id: a.id,
          content: a.content,
          author: a.anonymous ? null : a.user.name,
          isOwn: a.user.id === identity.userId,
          likes: a.likes,
          createdAt: a.createdAt.toISOString(),
        })),
      })),
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

    // Answer a question
    if (body.answerId && body.answerContent?.trim()) {
      const question = await prisma.anonQuestion.findUnique({ where: { id: body.answerId } });
      if (!question || question.hidden) {
        return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
      }

      const answer = await prisma.anonAnswer.create({
        data: {
          questionId: body.answerId,
          userId: identity.userId,
          content: body.answerContent.trim().slice(0, 1000),
          anonymous: body.anonymous ?? false,
        },
      });
      return NextResponse.json({ success: true, id: answer.id, type: "answer" });
    }

    // Ask a question
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "CONTENT_REQUIRED" }, { status: 400 });
    }

    if (body.content.trim().length > 500) {
      return NextResponse.json({ error: "TOO_LONG" }, { status: 400 });
    }

    const question = await prisma.anonQuestion.create({
      data: {
        content: body.content.trim(),
        authorId: identity.userId,
        targetId: body.targetId || null,
      },
    });

    return NextResponse.json({ success: true, id: question.id, type: "question" });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("COMMUNITY", error, { route: "/api/community/questions", method: "POST" });
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }
}
