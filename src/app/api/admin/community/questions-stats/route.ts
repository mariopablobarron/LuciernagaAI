import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

type WindowStats = {
  questions: number;
  questionsAnswered: number;
  answerRate: number; // 0..1
  answers: number;
  avgAnswersPerQuestion: number;
  crisisQuestions: number;
  hiddenQuestions: number;
  helpfulVotes: number;
  answersWithVotes: number;
  helpfulnessRate: number; // helpful votes / answers (capped 1)
  distinctAnswerers: number;
  distinctAskers: number;
};

async function computeWindow(
  prisma: ReturnType<typeof getPrismaClient>,
  since: Date,
): Promise<WindowStats> {
  const [
    questions,
    answers,
    crisisQuestions,
    hiddenQuestions,
    helpfulVotes,
    distinctAnswerers,
    distinctAskers,
  ] = await Promise.all([
    prisma.anonQuestion.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, _count: { select: { answers: true } } },
    }),
    prisma.anonAnswer.count({ where: { createdAt: { gte: since }, hidden: false } }),
    prisma.anonQuestion.count({ where: { createdAt: { gte: since }, crisisDetected: true } }),
    prisma.anonQuestion.count({ where: { createdAt: { gte: since }, hidden: true } }),
    prisma.anonAnswerVote.count({ where: { createdAt: { gte: since } } }),
    prisma.anonAnswer.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.anonQuestion.findMany({
      where: { createdAt: { gte: since }, authorId: { not: null } },
      select: { authorId: true },
      distinct: ["authorId"],
    }),
  ]);

  const totalQuestions = questions.length;
  const questionsAnswered = questions.filter((q) => q._count.answers > 0).length;
  const totalAnswersFromQuestions = questions.reduce(
    (acc, q) => acc + q._count.answers,
    0,
  );

  const answersWithVotes = await prisma.anonAnswer.count({
    where: {
      createdAt: { gte: since },
      votes: { some: {} },
    },
  });

  return {
    questions: totalQuestions,
    questionsAnswered,
    answerRate: totalQuestions === 0 ? 0 : questionsAnswered / totalQuestions,
    answers,
    avgAnswersPerQuestion:
      totalQuestions === 0 ? 0 : totalAnswersFromQuestions / totalQuestions,
    crisisQuestions,
    hiddenQuestions,
    helpfulVotes,
    answersWithVotes,
    helpfulnessRate: answers === 0 ? 0 : Math.min(1, helpfulVotes / answers),
    distinctAnswerers: distinctAnswerers.length,
    distinctAskers: distinctAskers.length,
  };
}

export const GET = withRateLimit(async function GET(req: NextRequest) {
  const adminAuth = requireAdminPermission(req, "analytics");
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    const prisma = getPrismaClient();
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [last7d, last30d, totalQuestions, totalAnswers] = await Promise.all([
      computeWindow(prisma, d7),
      computeWindow(prisma, d30),
      prisma.anonQuestion.count(),
      prisma.anonAnswer.count(),
    ]);

    // Distribución de respuestas por pregunta (30d) — para ver si la mayoría
    // se queda en 0 o 1. Devolvemos un histograma sencillo.
    const byAnswerCount30d = await prisma.anonQuestion.findMany({
      where: { createdAt: { gte: d30 } },
      select: { _count: { select: { answers: true } } },
    });
    const histogram: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const q of byAnswerCount30d) {
      const key = Math.min(5, q._count.answers).toString();
      histogram[key] = (histogram[key] ?? 0) + 1;
    }

    // Top solidarios (últimos 30d): quiénes más han ayudado.
    const topAnswerers = await prisma.anonAnswer.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: d30 }, hidden: false },
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    });

    return NextResponse.json({
      totals: { questions: totalQuestions, answers: totalAnswers },
      last7d,
      last30d,
      histogram30d: histogram,
      topAnswerers30d: topAnswerers.map((r) => ({
        userId: r.userId,
        answers: r._count.userId,
      })),
    });
  } catch (error: unknown) {
    logError("ADMIN", error, { route: "GET /api/admin/community/questions-stats" });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
});
