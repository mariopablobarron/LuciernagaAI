/**
 * Phase 4: CONTEXT
 *
 * Builds the coach context object that feeds the AI prompt.
 * Gathers: web search results, impulse profile, journey prompt,
 * conversation context, goal context, and all mentor/transformation data.
 *
 * No side effects — pure data assembly.
 */

import { logError, logInfo } from "@/lib/logger";
import { buildConversationContext } from "@/services/state";
import { embed } from "@/services/embeddings";
import { retrieveSemanticMemory } from "@/services/semantic-memory";
import { buildGoalCoachContext, getFirstPendingAction } from "@/services/goals";
import { getUserImpulseProfile } from "@/services/impulse-diagnostic";
import { listRecentImpulseLogs } from "@/services/impulse-challenges";
import { buildJourneyPromptBlock } from "@/services/journey-coach-bridge";
import { buildProjectPromptBlock } from "@/services/project-coach-bridge";
import { detectExtendedIntents } from "@/services/extendedIntents";
import { getPrismaClient } from "@/db/prisma";
import type { OnboardingPayload } from "@/lib/onboarding-archetypes";
import {
  buildSearchQuery,
  classifyExternalInfoNeed,
  needsExternalInfo,
  searchWeb,
} from "@/services/search";
import type { UserState } from "@/domain/types";
import type { analyzeEmotionalProfile } from "@/services/emotional-model";
import type { getActiveGoalForUser } from "@/services/goals";
import type { getMentorMode } from "@/services/mentor-protocol";
import type { inferTransformationPhase } from "@/services/transformation";
import type { FlowContext } from "./types";

// ─── Input ────────────────────────────────────────────────────────────────────

export type ContextInput = {
  userId: string;
  message: string;
  conversationId: string;
  state: UserState;
  emotionalProfile: ReturnType<typeof analyzeEmotionalProfile>;
  activeGoal: Awaited<ReturnType<typeof getActiveGoalForUser>> | null;
  flowContext: FlowContext;
  mentorMode: ReturnType<typeof getMentorMode>;
  transformationPhase: ReturnType<typeof inferTransformationPhase>;
  transformationSummary: string;
  onboardingContext: unknown;
  goalAvoidanceCount: number;
  avoidanceDetectedThisTurn: boolean;
  conversionTrigger: boolean;
  /** Resumen acumulado de mensajes antiguos (LangChain SummaryBufferMemory). */
  conversationSummary?: string | null;
  /**
   * Versión autocontenida del mensaje (de phases/reformulate.ts) para usar
   * como query del retrieve semántico cuando el original es ambiguo. Si no
   * se pasa, caemos a `message`.
   */
  queryHint?: string | null;
  /** Anonymous-first: usuarios anónimos no acceden a memoria semántica. */
  isAnonymous?: boolean;
  /** Crisis activa → bypass del retrieve para no resurfar episodios pasados. */
  crisisMode?: boolean;
  session: { userPlan: string; remainingMessages: number | null; hasActiveGoal: boolean };
};

// ─── Result ───────────────────────────────────────────────────────────────────

export type ContextResult = {
  coachContext: Record<string, unknown>;
  searchResults: Awaited<ReturnType<typeof searchWeb>>;
  searchQuery: string | null;
  impulseProfile: Awaited<ReturnType<typeof getUserImpulseProfile>> | null;
  impulseLogs: Awaited<ReturnType<typeof listRecentImpulseLogs>>;
  activeAction: { id: string; description: string } | null;
  defaultAction: string;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function buildContext(input: ContextInput): Promise<ContextResult> {
  const {
    userId, message, state, emotionalProfile, activeGoal, flowContext,
    mentorMode, transformationPhase, transformationSummary, onboardingContext,
    goalAvoidanceCount, avoidanceDetectedThisTurn, conversionTrigger, session,
  } = input;

  // ── Web search ──────────────────────────────────────────────────────────
  let searchResults: Awaited<ReturnType<typeof searchWeb>> = [];
  let searchQuery: string | null = null;

  const externalInfo = classifyExternalInfoNeed(message);
  if (needsExternalInfo(message) && externalInfo.shouldUse) {
    searchQuery = buildSearchQuery(message);
    if (searchQuery) {
      searchResults = await searchWeb(searchQuery, 3).catch((searchError: unknown) => {
        logError("SEARCH", searchError, { route: "/api/chat", userId, query: searchQuery });
        return [];
      });
    }
  }

  // ── Parallel data fetches ───────────────────────────────────────────────
  const conversationContext = buildConversationContext({
    state,
    lastGoal: activeGoal?.title ?? null,
    pendingActions: activeGoal?.actions.filter((a) => !a.completed).map((a) => a.description) ?? [],
  });

  // ── Memoria persistente entre conversaciones (últimos 7 días) ───────────
  // Da continuidad real al mentor: cuántos días lleva fuera, estado dominante,
  // evitaciones repetidas, eventos de crisis. Tolera fallos: si la query peta,
  // weeklyPattern queda en null y la continuidad sigue funcionando con el
  // resumen corto habitual.
  // weeklyPattern y opt-out de memoria semántica en paralelo: ambos son
  // queries baratas y el opt-out gobierna si llamamos a embed/retrieve.
  const [weeklyPattern, semanticOptOut] = await Promise.all([
    loadWeeklyPattern(userId).catch(() => null),
    loadSemanticOptOut(userId).catch(() => false),
  ]);

  // ── Memoria semántica (PR2 + opt-out PR3) ────────────────────────────────
  // Recupera material destilado del pasado (DailyLogs, resúmenes de
  // conversaciones cerradas) por similitud con el mensaje actual. Skip total
  // para anónimos, crisis activa, opt-out del usuario, o si el feature flag
  // está apagado. Tolera fallos: si OpenAI o pgvector petan, pastEchoes
  // queda en null y el chat sigue exactamente como antes.
  const pastEchoes = await loadSemanticEchoes({
    userId,
    query: input.queryHint?.trim() || message,
    isAnonymous: input.isAnonymous ?? false,
    crisisMode: input.crisisMode ?? false,
    optOut: semanticOptOut,
  }).catch((err) => {
    logError("SEMANTIC_MEMORY", err, { stage: "retrieve", userId });
    return null;
  });

  const [impulseProfile, impulseLogs, journeyPromptBlock, projectPromptBlock, welcomeOnboarding, userPrefs, enneagramLatest] = await Promise.all([
    getUserImpulseProfile(userId).catch(() => null),
    listRecentImpulseLogs(userId, 5).catch(() => []),
    buildJourneyPromptBlock(userId).catch(() => null),
    buildProjectPromptBlock(userId).catch(() => null),
    loadWelcomeOnboarding(userId).catch(() => null),
    (async (): Promise<{ genderForm: string | null } | null> => {
      try {
        const client = getPrismaClient();
        if (!client?.userPreferences?.findUnique) return null;
        return await client.userPreferences.findUnique({
          where: { userId },
          select: { genderForm: true },
        });
      } catch {
        return null;
      }
    })(),
    (async (): Promise<{ dominantType: number } | null> => {
      try {
        const client = getPrismaClient();
        if (!client?.enneagramAssessment?.findFirst) return null;
        return await client.enneagramAssessment.findFirst({
          where: { userId },
          orderBy: { completedAt: "desc" },
          select: { dominantType: true },
        });
      } catch {
        return null;
      }
    })(),
  ]);

  // Forma gramatical preferida (feminine | masculine | neutral | null).
  // null/desconocido se trata como "neutral" en el coach prompt.
  const userGender =
    userPrefs?.genderForm === "feminine" ||
    userPrefs?.genderForm === "masculine" ||
    userPrefs?.genderForm === "neutral"
      ? userPrefs.genderForm
      : null;

  // ── Action defaults ─────────────────────────────────────────────────────
  const activeAction = getFirstPendingAction(activeGoal);
  const defaultAction = activeGoal
    ? "Cierra hoy una sola accion visible de tu objetivo activo."
    : "Define una sola accion concreta para hoy y ejecútala.";

  // ── Assemble coach context ──────────────────────────────────────────────
  const coachContext = {
    goal: buildGoalCoachContext(activeGoal, message, {
      avoidanceCount: goalAvoidanceCount,
      avoidanceDetected: avoidanceDetectedThisTurn,
    }),
    continuity: {
      ...conversationContext,
      hesitationDetected: goalAvoidanceCount > 0 || avoidanceDetectedThisTurn,
      trend: emotionalProfile.progressTrend,
      weeklyPattern,
    },
    flow: {
      currentIntent: flowContext.currentIntent,
      currentStep: flowContext.currentStep,
      activeFlow: flowContext.activeFlow,
      instruction: flowContext.instruction,
    },
    mentor: mentorMode,
    transformation: { phase: transformationPhase, summary: transformationSummary },
    legal: {
      limitsNote:
        "Tres Mil Millones de Latidos orienta y empuja accion, pero no sustituye terapia ni soporte de emergencia.",
      critical: false,
    },
    onboarding: onboardingContext,
    welcomeOnboarding,
    journeyPrompt: journeyPromptBlock,
    projectPrompt: projectPromptBlock,
    access: {
      userPlan: session.userPlan,
      remainingMessages: session.remainingMessages,
      hasActiveGoal: session.hasActiveGoal,
      conversionTrigger,
    },
    web: searchQuery
      ? { query: searchQuery, usage: "practical_decision" as const, results: searchResults }
      : null,
    userGender,
    enneagramType:
      enneagramLatest?.dominantType &&
      enneagramLatest.dominantType >= 1 &&
      enneagramLatest.dominantType <= 9
        ? (enneagramLatest.dominantType as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)
        : null,
    extendedIntent: detectExtendedIntents(message),
    conversationSummary: input.conversationSummary ?? null,
    pastEchoes,
  };

  logInfo("AI", "openrouter_call_requested", {
    userId,
    state,
    primaryEmotion: emotionalProfile.primaryEmotion,
    dominantPattern: emotionalProfile.dominantPattern,
    energyLevel: emotionalProfile.energyLevel,
    mentorMode: mentorMode.mode,
    transformationPhase,
  });

  return {
    coachContext,
    searchResults,
    searchQuery,
    impulseProfile,
    impulseLogs,
    activeAction,
    defaultAction,
  };
}

// Lee el contexto de onboarding (/app/inicio) y lo devuelve solo durante los
// primeros 5 turnos del usuario. Pasado ese umbral, el mentor ya tiene contexto
// propio y deja de referenciar las respuestas iniciales.
async function loadWelcomeOnboarding(userId: string): Promise<OnboardingPayload | null> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { messageCount: true, onboardingContext: true },
  });
  if (!user || user.messageCount >= 5) return null;
  const ctx = user.onboardingContext as OnboardingPayload | null;
  if (!ctx || !ctx.feeling || !ctx.intent) return null;
  return ctx;
}

// Memoria persistente entre conversaciones (últimos 7 días). Se inyecta en el
// system prompt para que el mentor "recuerde" patrones del usuario al volver
// tras días, en vez de empezar cada conversación de cero.
async function loadWeeklyPattern(userId: string): Promise<{
  daysSinceLastSession: number | null;
  dominantStateLast7d: string | null;
  avoidanceCountLast7d: number;
  crisisEventsLast7d: number;
  conversationCountLast7d: number;
} | null> {
  const prisma = getPrismaClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [previousMessage, conversations, avoidanceCount, crisisCount, recentMessages] =
    await Promise.all([
      prisma.message.findFirst({
        where: { userId, role: "user" },
        orderBy: { createdAt: "desc" },
        skip: 1,
        select: { createdAt: true },
      }),
      prisma.conversation.count({
        where: { userId, updatedAt: { gte: sevenDaysAgo } },
      }),
      prisma.avoidanceEvent.count({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.crisisEvent.count({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.message.findMany({
        where: { userId, role: "user", createdAt: { gte: sevenDaysAgo } },
        select: { content: true },
        take: 60,
        orderBy: { createdAt: "desc" },
      }),
    ]);

  let daysSinceLastSession: number | null = null;
  if (previousMessage) {
    const ms = Date.now() - previousMessage.createdAt.getTime();
    daysSinceLastSession = Math.floor(ms / (24 * 60 * 60 * 1000));
  }

  let dominantStateLast7d: string | null = null;
  if (recentMessages.length > 0) {
    const { getDominantState } = await import("@/services/state");
    dominantStateLast7d = getDominantState(recentMessages.map((m) => m.content));
  }

  return {
    daysSinceLastSession,
    dominantStateLast7d,
    avoidanceCountLast7d: avoidanceCount,
    crisisEventsLast7d: crisisCount,
    conversationCountLast7d: conversations,
  };
}

// ─── Memoria semántica (lectura) ─────────────────────────────────────────────
// Convierte el mensaje del usuario en embedding y recupera top-K hits
// similares de SemanticMemory. Devuelve null si está desactivada o no hay
// hits relevantes — el caller filtra por null para no inyectar la sección.
//
// Reglas de bypass:
// - SEMANTIC_MEMORY_ENABLED !== "true" → off (escotilla por env)
// - OPENAI_API_KEY ausente → off silencioso (caller cae al chat sin memoria)
// - isAnonymous → off (anonymous-first: la memoria es valor de upgrade)
// - crisisMode → off (no resurfar episodios de crisis pasados por similitud)
async function loadSemanticEchoes(params: {
  userId: string;
  query: string;
  isAnonymous: boolean;
  crisisMode: boolean;
  optOut?: boolean;
}): Promise<Array<{
  source: "daily_log" | "conversation_summary" | "insight";
  gist: string;
  daysAgo: number;
  similarity: number;
}> | null> {
  if (process.env.SEMANTIC_MEMORY_ENABLED?.trim() !== "true") return null;
  if (!process.env.OPENAI_API_KEY?.trim()) return null;
  if (params.isAnonymous) return null;
  if (params.crisisMode) return null;
  if (params.optOut) return null;
  if (!params.query || params.query.trim().length < 4) return null;

  const queryVec = await embed(params.query);
  const hits = await retrieveSemanticMemory({
    userId: params.userId,
    embedding: queryVec,
    topK: 3,
    minSimilarity: 0.78,
    maxAgeDays: 90,
  });

  if (hits.length === 0) return null;

  const now = Date.now();
  return hits.map((h) => ({
    source: h.source,
    gist: h.content,
    daysAgo: Math.max(0, Math.floor((now - h.createdAt.getTime()) / (24 * 60 * 60 * 1000))),
    similarity: h.similarity,
  }));
}

// Lee el opt-out de memoria semántica de UserPreferences. Default false
// si no hay preferencias guardadas o la query falla — el resto de filtros
// (anonymous, crisis, flag) protegen los casos delicados.
async function loadSemanticOptOut(userId: string): Promise<boolean> {
  const client = getPrismaClient();
  if (!client?.userPreferences?.findUnique) return false;
  const prefs = await client.userPreferences.findUnique({
    where: { userId },
    select: { semanticMemoryOptOut: true },
  });
  return prefs?.semanticMemoryOptOut === true;
}
