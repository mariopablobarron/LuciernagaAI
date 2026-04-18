import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveIdentity } from "@/lib/auth";
import { logError, logInfo } from "@/lib/logger";
import { sendAutomatedAlert } from "@/lib/alerts";

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

  // Clinical safety: when the score crosses into severe territory, create a
  // system intervention with resources and alert the clinical team. This is
  // a hard rule agreed with the responsible clinical psychologist — it must
  // not be disabled without her written approval.
  const needsIntervention =
    severity === "severe" || severity === "moderately_severe";

  if (needsIntervention) {
    try {
      const isPhq = assessment.type === "phq9";
      const content = isPhq
        ? `Hemos recibido tu evaluación (PHQ-9: ${totalScore} — ${SEVERITY_LABELS[severity] ?? severity}). Lo que estás sintiendo merece atención profesional. Si es urgente, el teléfono 024 (Línea de Atención a la Conducta Suicida) está disponible 24/7 gratis. Si no es urgente, te recomendamos que busques un profesional de psicología. No estás sola/o.`
        : `Tu evaluación GAD-7 ha dado ${totalScore} (${SEVERITY_LABELS[severity] ?? severity}). Ese nivel de ansiedad sostenida merece acompañamiento profesional. Si lo necesitas ya, puedes llamar al 024 (24/7, gratuito). No es obligatorio — queda como recurso por si te hace falta.`;

      await prisma.intervention.create({
        data: {
          userId: user.id,
          adminId: "system",
          type: "resource",
          content,
          metadata: {
            trigger: "assessment_severe",
            assessmentId: assessment.id,
            assessmentType: assessment.type,
            totalScore,
            severity,
          },
        },
      });

      logInfo("ASSESSMENT", "auto_intervention_created", {
        userId: user.id,
        assessmentType: assessment.type,
        severity,
        totalScore,
      });

      // Notify the clinical team so a human reviews the case within the day.
      sendAutomatedAlert({
        type: "warning",
        title: `Assessment severo — ${assessment.type.toUpperCase()}`,
        message: `Usuario ${user.id.slice(0, 8)}... · score ${totalScore} (${severity}). Intervención automática creada. Revisar en /admin-clinical.`,
      }).catch(() => {});
    } catch (error: unknown) {
      logError("ASSESSMENT", error, {
        area: "auto_intervention",
        userId: user.id,
        severity,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    totalScore,
    severity,
    severityLabel: SEVERITY_LABELS[severity] ?? severity,
    interventionCreated: needsIntervention,
  });
}
