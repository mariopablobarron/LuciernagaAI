import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity } from "@/lib/auth";

type Answer = { questionId: string; score: number };

function getSeverity(type: string, score: number): string {
  if (type === "phq9") {
    if (score <= 4) return "minimal";
    if (score <= 9) return "mild";
    if (score <= 14) return "moderate";
    if (score <= 19) return "moderately_severe";
    return "severe";
  }
  // GAD-7
  if (score <= 4) return "minimal";
  if (score <= 9) return "mild";
  if (score <= 14) return "moderate";
  return "severe";
}

const SEVERITY_LABELS: Record<string, string> = {
  minimal: "Mínimo",
  mild: "Leve",
  moderate: "Moderado",
  moderately_severe: "Moderadamente severo",
  severe: "Severo",
};

// POST /api/user/assessment/respond
// Body: { assessmentId: string; answers: Array<{ questionId: string; score: number }> }
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    assessmentId?: string;
    answers?: Answer[];
  } | null;

  if (!body?.assessmentId || !Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: "assessmentId y answers son requeridos" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const identity = await resolveIdentity(req);
  const user = { id: identity.userId };

  const assessment = await prisma.assessment.findUnique({
    where: { id: body.assessmentId },
    select: { id: true, userId: true, type: true, status: true, questions: true },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }
  if (assessment.userId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (assessment.status === "completed") {
    return NextResponse.json({ error: "Esta evaluación ya fue completada" }, { status: 409 });
  }

  const totalScore = body.answers.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const severity = getSeverity(assessment.type, totalScore);

  await prisma.$transaction([
    prisma.assessmentResponse.create({
      data: {
        assessmentId: assessment.id,
        userId: user.id,
        answers: body.answers,
        totalScore,
        severity,
      },
    }),
    prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: "completed" },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    totalScore,
    severity,
    severityLabel: SEVERITY_LABELS[severity] ?? severity,
  });
}
