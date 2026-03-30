import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import {
  DEFAULT_EMOTIONAL_PROFILE,
  DOMINANT_PATTERNS,
  EMOTIONAL_RISK_LEVELS,
  ENERGY_LEVELS,
  FOCUS_AREAS,
  PRIMARY_EMOTIONS,
  PROGRESS_TRENDS,
  type DominantPattern,
  type EmotionalProfile,
  type EmotionalRiskLevel,
  type EnergyLevel,
  type FocusArea,
  type PrimaryEmotion,
  type ProgressTrend,
} from "@/types/emotional-profile";

type KeywordGroups<T extends string> = Record<T, string[]>;

const EMOTION_KEYWORDS: KeywordGroups<PrimaryEmotion> = {
  ansiedad: [
    "ansiedad",
    "ansioso",
    "agobio",
    "agobiado",
    "panico",
    "miedo",
    "nervioso",
    "estres",
    "presion",
    "desbordado",
  ],
  apatía: [
    "apatia",
    "sin ganas",
    "apagado",
    "me da igual",
    "vacio",
    "vacío",
    "sin energia",
    "sin energia",
    "cansado de todo",
    "no me importa",
  ],
  confusión: [
    "no se",
    "no sé",
    "confusion",
    "confusión",
    "perdido",
    "desorientado",
    "no entiendo",
    "no tengo claro",
    "mezcla",
    "por donde empiezo",
  ],
  frustración: [
    "frustrado",
    "frustracion",
    "frustración",
    "rabia",
    "harto",
    "sale mal",
    "otra vez",
    "me enfada",
    "me molesta",
    "fracaso",
  ],
  calma: [
    "calma",
    "tranquilo",
    "sereno",
    "estable",
    "en paz",
    "mejor",
    "avance",
    "pude",
    "claro",
    "ordenado",
  ],
};

const PATTERN_KEYWORDS: KeywordGroups<DominantPattern> = {
  evita_decidir: [
    "no se que elegir",
    "no sé que elegir",
    "decidir",
    "elegir",
    "me cuesta elegir",
    "tengo demasiadas opciones",
    "no me decido",
    "cualquier opcion",
    "cualquier opción",
  ],
  perfeccionismo: [
    "perfecto",
    "perfecta",
    "perfectamente",
    "impecable",
    "sin errores",
    "todo o nada",
    "excelente",
    "100%",
    "no es suficiente",
  ],
  comparación: [
    "comparo",
    "comparacion",
    "comparación",
    "los demas",
    "los demás",
    "otros van mejor",
    "voy tarde",
    "linkedin",
    "instagram",
    "todos avanzan",
  ],
  miedo_al_error: [
    "equivocarme",
    "equivocarme",
    "error",
    "fallar",
    "fracasar",
    "salga mal",
    "si me equivoco",
    "si fallo",
  ],
  procrastinación: [
    "luego",
    "mañana",
    "manana",
    "pospongo",
    "procrastino",
    "no arranco",
    "dejo para despues",
    "dejo para después",
    "evito hacerlo",
    "me distraigo",
  ],
};

const FOCUS_KEYWORDS: KeywordGroups<FocusArea> = {
  estudios: [
    "estudio",
    "estudiar",
    "examen",
    "universidad",
    "clase",
    "tesis",
    "nota",
    "carrera",
    "master",
    "máster",
  ],
  trabajo: [
    "trabajo",
    "jefe",
    "equipo",
    "cliente",
    "proyecto",
    "oficina",
    "empleo",
    "negocio",
    "ventas",
    "reunion",
    "reunión",
  ],
  propósito: [
    "proposito",
    "propósito",
    "sentido",
    "direccion",
    "dirección",
    "futuro",
    "vocacion",
    "vocación",
    "que quiero",
    "qué quiero",
    "mi vida",
  ],
  relaciones: [
    "pareja",
    "familia",
    "amigos",
    "madre",
    "padre",
    "novio",
    "novia",
    "relacion",
    "relación",
    "amigo",
    "amiga",
  ],
  autoestima: [
    "autoestima",
    "inseguro",
    "insegura",
    "no valgo",
    "confianza",
    "insuficiente",
    "suficiente",
    "me comparo",
    "valor",
    "merezco",
  ],
};

const LOW_ENERGY_KEYWORDS = [
  "sin energia",
  "sin energía",
  "cansado",
  "agotado",
  "apagado",
  "sin ganas",
  "drenado",
  "vacío",
  "vacio",
  "pesado",
];

const HIGH_ENERGY_KEYWORDS = [
  "urgente",
  "ya",
  "ahora",
  "muy rapido",
  "muy rápido",
  "acelerado",
  "activado",
  "desbordado",
  "muchisimo",
  "muchísimo",
];

const HIGH_RISK_KEYWORDS = [
  "me quiero matar",
  "me quiero morir",
  "quiero desaparecer",
  "hacerme daño",
  "hacerme dano",
  "no vale la pena",
  "no puedo mas",
  "no puedo más",
];

const MEDIUM_RISK_KEYWORDS = [
  "colapso",
  "me hundo",
  "hundido",
  "desbordado",
  "panico",
  "pánico",
  "cada vez peor",
  "todo da igual",
  "no salgo",
  "estoy peor",
];

const IMPROVEMENT_KEYWORDS = [
  "mejor",
  "avance",
  "avancé",
  "avance",
  "pude",
  "ya empece",
  "ya empecé",
  "me siento mejor",
  "mas claro",
  "más claro",
];

const WORSENING_KEYWORDS = [
  "peor",
  "empeora",
  "empeorando",
  "recaida",
  "recaída",
  "otra vez",
  "cada vez peor",
  "no avanzo",
  "sigo mal",
];

const SAME_TREND_KEYWORDS = ["sigo igual", "igual que ayer", "igual que siempre", "lo mismo"];

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(message: string, keywords: string[]): number {
  return keywords.reduce((total, keyword) => {
    return total + (message.includes(normalizeText(keyword)) ? 1 : 0);
  }, 0);
}

function countMessagesWithSignals(messages: string[], keywords: string[]): number {
  return messages.reduce((total, message) => {
    return total + (countMatches(message, keywords) > 0 ? 1 : 0);
  }, 0);
}

function pickWinner<T extends string>(
  scores: Record<T, number>,
  fallback: T,
  orderedCandidates: readonly T[]
): T {
  let winner = fallback;
  let maxScore = -1;

  for (const candidate of orderedCandidates) {
    const score = scores[candidate];
    if (score > maxScore) {
      winner = candidate;
      maxScore = score;
    }
  }

  return maxScore > 0 ? winner : fallback;
}

function scoreGroups<T extends string>(
  currentMessage: string,
  history: string[],
  groups: KeywordGroups<T>,
  boostRepeatedSignals = false
): Record<T, number> {
  return (Object.keys(groups) as T[]).reduce(
    (accumulator, typedKey) => {
      const keywords = groups[typedKey];
      const currentScore = countMatches(currentMessage, keywords) * 3;
      const historyScore = history.reduce((total, entry) => total + countMatches(entry, keywords), 0);
      const repetitionBonus =
        boostRepeatedSignals && countMessagesWithSignals(history, keywords) >= 2
          ? countMessagesWithSignals(history, keywords)
          : 0;

      accumulator[typedKey] = currentScore + historyScore + repetitionBonus;
      return accumulator;
    },
    {} as Record<T, number>
  );
}

function detectEnergyLevel(
  primaryEmotion: PrimaryEmotion,
  currentMessage: string,
  history: string[]
): EnergyLevel {
  const lowScore =
    countMatches(currentMessage, LOW_ENERGY_KEYWORDS) * 3 +
    history.reduce((total, entry) => total + countMatches(entry, LOW_ENERGY_KEYWORDS), 0);
  const highScore =
    countMatches(currentMessage, HIGH_ENERGY_KEYWORDS) * 3 +
    history.reduce((total, entry) => total + countMatches(entry, HIGH_ENERGY_KEYWORDS), 0);

  if (primaryEmotion === "apatía" && lowScore >= 1) {
    return "bajo";
  }

  if (primaryEmotion === "ansiedad" && highScore >= lowScore) {
    return "alto";
  }

  if (lowScore >= highScore + 2) {
    return "bajo";
  }

  if (highScore >= lowScore + 2) {
    return "alto";
  }

  return "medio";
}

function distressScore(message: string): number {
  return (
    countMatches(message, EMOTION_KEYWORDS.ansiedad) +
    countMatches(message, EMOTION_KEYWORDS.frustración) +
    countMatches(message, EMOTION_KEYWORDS.apatía) +
    countMatches(message, HIGH_RISK_KEYWORDS) * 2 +
    countMatches(message, MEDIUM_RISK_KEYWORDS)
  );
}

function detectRiskLevel(
  primaryEmotion: PrimaryEmotion,
  energyLevel: EnergyLevel,
  progressTrend: ProgressTrend,
  currentMessage: string,
  history: string[]
): EmotionalRiskLevel {
  const highRiskScore =
    countMatches(currentMessage, HIGH_RISK_KEYWORDS) * 4 +
    history.reduce((total, entry) => total + countMatches(entry, HIGH_RISK_KEYWORDS), 0);
  const mediumRiskScore =
    countMatches(currentMessage, MEDIUM_RISK_KEYWORDS) * 3 +
    history.reduce((total, entry) => total + countMatches(entry, MEDIUM_RISK_KEYWORDS), 0);

  if (highRiskScore > 0) {
    return "high";
  }

  if (
    mediumRiskScore >= 5 ||
    (primaryEmotion === "apatía" && energyLevel === "bajo" && progressTrend === "empeora")
  ) {
    return "high";
  }

  if (
    mediumRiskScore > 0 ||
    primaryEmotion === "ansiedad" ||
    primaryEmotion === "frustración"
  ) {
    return "medium";
  }

  return "low";
}

function detectProgressTrend(currentMessage: string, history: string[]): ProgressTrend {
  const normalizedHistory = history.slice(-3);
  const historyAverageDistress =
    normalizedHistory.length > 0
      ? normalizedHistory.reduce((total, entry) => total + distressScore(entry), 0) /
        normalizedHistory.length
      : 0;
  const currentDistress = distressScore(currentMessage);
  const improvementSignals = countMatches(currentMessage, IMPROVEMENT_KEYWORDS);
  const worseningSignals = countMatches(currentMessage, WORSENING_KEYWORDS);
  const sameSignals = countMatches(currentMessage, SAME_TREND_KEYWORDS);

  if (improvementSignals > worseningSignals) {
    return "mejora";
  }

  if (worseningSignals > improvementSignals) {
    return "empeora";
  }

  if (sameSignals > 0) {
    return "igual";
  }

  if (currentDistress >= historyAverageDistress + 2 && history.length > 0) {
    return "empeora";
  }

  if (currentDistress + 2 <= historyAverageDistress && history.length > 0) {
    return "mejora";
  }

  return "igual";
}

function normalizeProfileValue<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  if (value && allowed.includes(value as T)) {
    return value as T;
  }
  return fallback;
}

function normalizeProfileRecord(
  profile:
    | Partial<EmotionalProfile>
    | {
        primaryEmotion: string | null;
        dominantPattern: string | null;
        focusArea: string | null;
        energyLevel: string | null;
        riskLevel: string | null;
        progressTrend: string | null;
      }
    | null
    | undefined
): EmotionalProfile {
  return {
    primaryEmotion: normalizeProfileValue(
      profile?.primaryEmotion,
      PRIMARY_EMOTIONS,
      DEFAULT_EMOTIONAL_PROFILE.primaryEmotion
    ),
    dominantPattern: normalizeProfileValue(
      profile?.dominantPattern,
      DOMINANT_PATTERNS,
      DEFAULT_EMOTIONAL_PROFILE.dominantPattern
    ),
    focusArea: normalizeProfileValue(
      profile?.focusArea,
      FOCUS_AREAS,
      DEFAULT_EMOTIONAL_PROFILE.focusArea
    ),
    energyLevel: normalizeProfileValue(
      profile?.energyLevel,
      ENERGY_LEVELS,
      DEFAULT_EMOTIONAL_PROFILE.energyLevel
    ),
    riskLevel: normalizeProfileValue(
      profile?.riskLevel,
      EMOTIONAL_RISK_LEVELS,
      DEFAULT_EMOTIONAL_PROFILE.riskLevel
    ),
    progressTrend: normalizeProfileValue(
      profile?.progressTrend,
      PROGRESS_TRENDS,
      DEFAULT_EMOTIONAL_PROFILE.progressTrend
    ),
  };
}

export function analyzeEmotionalProfile(message: string, history: string[]): EmotionalProfile {
  const normalizedMessage = normalizeText(message);
  const normalizedHistory = history
    .map((entry) => normalizeText(entry))
    .filter((entry) => entry.length > 0);

  const emotionScores = scoreGroups(normalizedMessage, normalizedHistory, EMOTION_KEYWORDS);
  const primaryEmotion = pickWinner(emotionScores, "calma", PRIMARY_EMOTIONS);

  const patternScores = scoreGroups(
    normalizedMessage,
    normalizedHistory,
    PATTERN_KEYWORDS,
    true
  );
  const dominantPattern = pickWinner(
    patternScores,
    DEFAULT_EMOTIONAL_PROFILE.dominantPattern,
    DOMINANT_PATTERNS
  );

  const focusScores = scoreGroups(normalizedMessage, normalizedHistory, FOCUS_KEYWORDS);
  const focusArea = pickWinner(focusScores, DEFAULT_EMOTIONAL_PROFILE.focusArea, FOCUS_AREAS);

  const progressTrend = detectProgressTrend(normalizedMessage, normalizedHistory);
  const energyLevel = detectEnergyLevel(primaryEmotion, normalizedMessage, normalizedHistory);
  const riskLevel = detectRiskLevel(
    primaryEmotion,
    energyLevel,
    progressTrend,
    normalizedMessage,
    normalizedHistory
  );

  return {
    primaryEmotion,
    dominantPattern,
    focusArea,
    energyLevel,
    riskLevel,
    progressTrend,
  };
}

export async function updateEmotionalProfile(
  userId: string,
  profile: EmotionalProfile
): Promise<EmotionalProfile> {
  const prisma = getPrismaClient();
  const normalizedProfile = normalizeProfileRecord(profile);

  try {
    await prisma.userState.upsert({
      where: { userId },
      update: {
        primaryEmotion: normalizedProfile.primaryEmotion,
        dominantPattern: normalizedProfile.dominantPattern,
        focusArea: normalizedProfile.focusArea,
        energyLevel: normalizedProfile.energyLevel,
        riskLevel: normalizedProfile.riskLevel,
        progressTrend: normalizedProfile.progressTrend,
        updatedAt: new Date(),
      },
      create: {
        userId,
        state: "neutral",
        primaryEmotion: normalizedProfile.primaryEmotion,
        dominantPattern: normalizedProfile.dominantPattern,
        focusArea: normalizedProfile.focusArea,
        energyLevel: normalizedProfile.energyLevel,
        riskLevel: normalizedProfile.riskLevel,
        progressTrend: normalizedProfile.progressTrend,
      },
    });

    logInfo("EMOTION", "emotional_profile_updated", {
      userId,
      primaryEmotion: normalizedProfile.primaryEmotion,
      dominantPattern: normalizedProfile.dominantPattern,
      energyLevel: normalizedProfile.energyLevel,
      riskLevel: normalizedProfile.riskLevel,
      progressTrend: normalizedProfile.progressTrend,
    });

    return normalizedProfile;
  } catch (error: unknown) {
    logError("EMOTION", error, { userId, action: "update_emotional_profile_failed" });
    throw error;
  }
}

export async function getEmotionalProfile(userId: string): Promise<EmotionalProfile> {
  const prisma = getPrismaClient();

  try {
    const profile = await prisma.userState.findUnique({
      where: { userId },
      select: {
        primaryEmotion: true,
        dominantPattern: true,
        focusArea: true,
        energyLevel: true,
        riskLevel: true,
        progressTrend: true,
      },
    });

    return normalizeProfileRecord(profile);
  } catch (error: unknown) {
    logError("EMOTION", error, { userId, action: "get_emotional_profile_failed" });
    return DEFAULT_EMOTIONAL_PROFILE;
  }
}
