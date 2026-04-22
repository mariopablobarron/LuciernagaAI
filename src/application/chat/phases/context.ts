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
import { buildGoalCoachContext, getFirstPendingAction } from "@/services/goals";
import { getUserImpulseProfile } from "@/services/impulse-diagnostic";
import { listRecentImpulseLogs } from "@/services/impulse-challenges";
import { buildJourneyPromptBlock } from "@/services/journey-coach-bridge";
import { buildProjectPromptBlock } from "@/services/project-coach-bridge";
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

  const [impulseProfile, impulseLogs, journeyPromptBlock, projectPromptBlock, welcomeOnboarding] = await Promise.all([
    getUserImpulseProfile(userId).catch(() => null),
    listRecentImpulseLogs(userId, 5).catch(() => []),
    buildJourneyPromptBlock(userId).catch(() => null),
    buildProjectPromptBlock(userId).catch(() => null),
    loadWelcomeOnboarding(userId).catch(() => null),
  ]);

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
  const ctx = user.onboardingContext as unknown as OnboardingPayload | null;
  if (!ctx || !ctx.feeling || !ctx.intent) return null;
  return ctx;
}
