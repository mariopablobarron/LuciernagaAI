import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { requireAdminPermission } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";

// PHQ-9 and GAD-7 question templates
const ASSESSMENT_TEMPLATES = {
  phq9: {
    title: "PHQ-9 — Cuestionario de Salud del Paciente",
    questions: [
      { id: "1", text: "Poco interés o placer en hacer cosas", scale: 3 },
      { id: "2", text: "Sentirse desanimado, deprimido o sin esperanza", scale: 3 },
      { id: "3", text: "Dificultad para dormir, mantenerse dormido o dormir demasiado", scale: 3 },
      { id: "4", text: "Sentirse cansado o con poca energía", scale: 3 },
      { id: "5", text: "Poco apetito o comer en exceso", scale: 3 },
      {
        id: "6",
        text: "Sentirse mal consigo mismo — o sentir que es un fracaso o que le ha fallado a sí mismo o a su familia",
        scale: 3,
      },
      {
        id: "7",
        text: "Dificultad para concentrarse en cosas, como leer el periódico o ver la televisión",
        scale: 3,
      },
      {
        id: "8",
        text: "Moverse o hablar tan lentamente que la gente puede notarlo; o lo contrario, sentirse tan inquieto que se mueve más de lo normal",
        scale: 3,
      },
      {
        id: "9",
        text: "Pensamientos de que sería mejor estar muerto o de hacerse daño de alguna manera",
        scale: 3,
      },
    ],
  },
  gad7: {
    title: "GAD-7 — Escala de Trastorno de Ansiedad Generalizada",
    questions: [
      { id: "1", text: "Sentirse nervioso/a, ansioso/a o con los nervios de punta", scale: 3 },
      {
        id: "2",
        text: "No poder dejar de preocuparse o no poder controlar la preocupación",
        scale: 3,
      },
      { id: "3", text: "Preocuparse demasiado por diferentes cosas", scale: 3 },
      { id: "4", text: "Dificultad para relajarse", scale: 3 },
      { id: "5", text: "Estar tan inquieto/a que es difícil quedarse quieto/a", scale: 3 },
      { id: "6", text: "Molestarse o irritarse fácilmente", scale: 3 },
      { id: "7", text: "Sentir miedo de que algo terrible pueda pasar", scale: 3 },
    ],
  },
} as const;

type AssessmentType = keyof typeof ASSESSMENT_TEMPLATES;

// GET /api/admin/assessments/[userId] — list assessments for a user
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = requireAdminPermission(req, "assessments");
    if (auth instanceof NextResponse) return auth;

    const { userId } = await params;
    const prisma = getPrismaClient();

    const assessments = await prisma.assessment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { response: true },
    });

    return NextResponse.json({ assessments });
  } catch (err) {
    logError("ADMIN", err instanceof Error ? err : new Error(String(err)), {
      route: "/api/admin/assessments/[userId]",
      method: "GET",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/assessments/[userId] — assign PHQ-9 or GAD-7 to a user
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = requireAdminPermission(req, "assessments");
    if (auth instanceof NextResponse) return auth;

    const { userId } = await params;
    const body = (await req.json().catch(() => null)) as { type?: string } | null;

    const type = body?.type as AssessmentType | undefined;
    if (!type || !(type in ASSESSMENT_TEMPLATES)) {
      return NextResponse.json({ error: "type debe ser 'phq9' o 'gad7'" }, { status: 400 });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const template = ASSESSMENT_TEMPLATES[type];
    const assessment = await prisma.assessment.create({
      data: {
        userId,
        type,
        title: template.title,
        questions: template.questions,
        status: "pending",
      },
      select: { id: true, type: true, title: true, status: true, createdAt: true },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (err) {
    logError("ADMIN", err instanceof Error ? err : new Error(String(err)), {
      route: "/api/admin/assessments/[userId]",
      method: "POST",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
