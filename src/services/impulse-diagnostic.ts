import { getPrismaClient } from "@/db/prisma";
import { ensureImpulseCatalog } from "@/services/impulse-catalog";
import type {
  DiagnosticAnswerMap,
  DiagnosticCategory,
  DiagnosticQuestion,
  DiagnosticScores,
  ImpulseProfileCode,
  ImpulseProfileSnapshot,
} from "@/types/impulse";

const SCALE_LABELS: [string, string, string, string, string] = [
  "Nada",
  "Poco",
  "Algo",
  "Bastante",
  "Mucho",
];

export const IMPULSE_DIAGNOSTIC_TEST: DiagnosticQuestion[] = [
  {
    id: "claridad_1",
    category: "claridad",
    prompt: "Sé cuál es la prioridad más importante de esta semana.",
    polarity: "positive",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "claridad_2",
    category: "claridad",
    prompt: "Paso demasiado tiempo sin saber por dónde empezar.",
    polarity: "negative",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "autoestima_1",
    category: "autoestima",
    prompt: "Confío en que puedo cumplir lo que me propongo si me organizo.",
    polarity: "positive",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "autoestima_2",
    category: "autoestima",
    prompt: "Cuando algo se complica, pienso rápido que no voy a poder.",
    polarity: "negative",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "energia_1",
    category: "energia",
    prompt: "Últimamente tengo energía suficiente para iniciar tareas sin empujarme demasiado.",
    polarity: "positive",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "energia_2",
    category: "energia",
    prompt: "Me siento agotado antes incluso de empezar lo importante.",
    polarity: "negative",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "disciplina_1",
    category: "disciplina",
    prompt: "Cuando decido una acción concreta, suelo hacerla el mismo día.",
    polarity: "positive",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "disciplina_2",
    category: "disciplina",
    prompt: "Pospongo tareas importantes aunque sé que me están frenando.",
    polarity: "negative",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "social_1",
    category: "social",
    prompt: "Puedo pedir ayuda o apoyo sin sentir que estoy fallando.",
    polarity: "positive",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "social_2",
    category: "social",
    prompt: "Evito conversaciones importantes por miedo a incomodar o decepcionar.",
    polarity: "negative",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "disciplina_3",
    category: "disciplina",
    prompt: "Mantengo hábitos básicos cuando las cosas se desordenan.",
    polarity: "positive",
    scaleLabels: SCALE_LABELS,
  },
  {
    id: "claridad_3",
    category: "claridad",
    prompt: "Siento que tengo demasiadas opciones y eso me paraliza.",
    polarity: "negative",
    scaleLabels: SCALE_LABELS,
  },
];

const CATEGORIES: DiagnosticCategory[] = [
  "claridad",
  "autoestima",
  "energia",
  "disciplina",
  "social",
];

function normalizeAnswer(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(1, Math.min(5, Math.round(numeric)));
}

function answerToPositiveScale(answer: number, polarity: "positive" | "negative"): number {
  return polarity === "negative" ? 6 - answer : answer;
}

function averageToScore(value: number, count: number): number {
  if (count === 0) {
    return 0;
  }

  const average = value / count;
  return Math.round(((average - 1) / 4) * 100);
}

export function scoreDiagnosticResponses(answers: DiagnosticAnswerMap): DiagnosticScores {
  const totals: Record<DiagnosticCategory, number> = {
    claridad: 0,
    autoestima: 0,
    energia: 0,
    disciplina: 0,
    social: 0,
  };
  const counts: Record<DiagnosticCategory, number> = {
    claridad: 0,
    autoestima: 0,
    energia: 0,
    disciplina: 0,
    social: 0,
  };

  for (const question of IMPULSE_DIAGNOSTIC_TEST) {
    const answer = normalizeAnswer(answers[question.id]);
    const positiveValue = answerToPositiveScale(answer, question.polarity);
    totals[question.category] += positiveValue;
    counts[question.category] += 1;
  }

  const scoredCategories = Object.fromEntries(
    CATEGORIES.map((category) => [category, averageToScore(totals[category], counts[category])])
  ) as Record<DiagnosticCategory, number>;

  const total = Math.round(
    CATEGORIES.reduce((sum, category) => sum + scoredCategories[category], 0) / CATEGORIES.length
  );

  return {
    ...scoredCategories,
    total,
  };
}

export function assignImpulseProfile(scores: DiagnosticScores): ImpulseProfileCode {
  if (
    scores.claridad >= 72 &&
    scores.disciplina >= 65 &&
    scores.energia >= 60 &&
    scores.total >= 68
  ) {
    return "POTENCIAL_ALTO";
  }

  if (
    scores.energia <= 35 &&
    scores.disciplina <= 45 &&
    scores.total <= 48
  ) {
    return "DESMOTIVADO";
  }

  if (
    scores.autoestima <= 42 &&
    scores.social <= 45 &&
    scores.claridad <= 58
  ) {
    return "ANSIOSO";
  }

  if (scores.claridad <= 38 && scores.disciplina >= 40) {
    return "PERDIDO";
  }

  return "BLOQUEADO";
}

export function validateDiagnosticAnswers(answers: DiagnosticAnswerMap): void {
  for (const question of IMPULSE_DIAGNOSTIC_TEST) {
    const value = answers[question.id];
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
      throw new Error(`Respuesta inválida para ${question.id}`);
    }
  }
}

function buildProfileSnapshot(record: {
  createdAt: Date;
  profile: {
    code: string;
    title: string;
    type: string;
    description: string;
    operationalFocus: string;
  };
  clarityScore: number;
  autoestimaScore: number;
  energiaScore: number;
  disciplinaScore: number;
  socialScore: number;
  totalScore: number;
}): ImpulseProfileSnapshot {
  return {
    code: record.profile.code as ImpulseProfileCode,
    title: record.profile.title,
    type: record.profile.type,
    description: record.profile.description,
    operationalFocus: record.profile.operationalFocus,
    scores: {
      claridad: record.clarityScore,
      autoestima: record.autoestimaScore,
      energia: record.energiaScore,
      disciplina: record.disciplinaScore,
      social: record.socialScore,
      total: record.totalScore,
    },
    assignedAt: record.createdAt.toISOString(),
  };
}

export async function getUserImpulseProfile(
  userId: string
): Promise<ImpulseProfileSnapshot | null> {
  const prisma = getPrismaClient();
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId },
    include: {
      profile: true,
    },
  });

  if (!userProfile) {
    return null;
  }

  return buildProfileSnapshot(userProfile);
}

export async function saveDiagnosticResult(params: {
  userId: string;
  answers: DiagnosticAnswerMap;
}): Promise<ImpulseProfileSnapshot> {
  const prisma = getPrismaClient();
  validateDiagnosticAnswers(params.answers);
  await ensureImpulseCatalog();

  const scores = scoreDiagnosticResponses(params.answers);
  const profileCode = assignImpulseProfile(scores);
  const profileRecord = await prisma.profile.findUnique({
    where: {
      code: profileCode,
    },
    select: {
      id: true,
    },
  });

  if (!profileRecord) {
    throw new Error(`Profile ${profileCode} not found in catalog`);
  }

  const userProfile = await prisma.userProfile.upsert({
    where: {
      userId: params.userId,
    },
    update: {
      profileId: profileRecord.id,
      clarityScore: scores.claridad,
      autoestimaScore: scores.autoestima,
      energiaScore: scores.energia,
      disciplinaScore: scores.disciplina,
      socialScore: scores.social,
      totalScore: scores.total,
      rawAnswers: params.answers,
    },
    create: {
      userId: params.userId,
      profileId: profileRecord.id,
      clarityScore: scores.claridad,
      autoestimaScore: scores.autoestima,
      energiaScore: scores.energia,
      disciplinaScore: scores.disciplina,
      socialScore: scores.social,
      totalScore: scores.total,
      rawAnswers: params.answers,
    },
    include: {
      profile: true,
    },
  });

  return buildProfileSnapshot(userProfile);
}
