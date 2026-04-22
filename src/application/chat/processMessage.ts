import { analyzeMessage } from "./phases/analyze";
import { enrichContext } from "./phases/enrich";
import { buildContext } from "./phases/context";
import { interceptActionLock, interceptCrisis, interceptTransitionalVoid } from "./phases/intercept";
import { logError, logInfo } from "@/lib/logger";
import { generateAIResponse, streamOpenRouterTokens } from "@/services/ai";
import { generateImpulseResponse } from "@/services/impulse-ai";
import { trackSafe } from "@/services/events";
import {
  appendCaptureEmailPrompt,
  appendConversionPrompt,
  finalizeResponse,
  appendSoftPaywallPrompt,
  buildCoachPrompt,
  CAPTURE_EMAIL_PROMPT,
} from "@/services/coach";
import { saveConversationMessage } from "@/services/conversation";
import { buildGoalCoachContext, getActiveGoalForUser } from "@/services/goals";

export interface SessionContext {
  isAnonymous: boolean;
  hasPlan: boolean;
  userPlan: "free" | "pro";
  messageLimitPerDay: number | null;
  messagesUsedToday: number;
  planLabel: string;
  subscriptionStatus: string;
}

export interface ProcessMessageInput {
  userId: string;
  message: string;
  conversationId?: string;
  session: SessionContext;
  jsonMode: boolean;
}

export type ProcessMessageResult =
  | { stream: ReadableStream; meta: Record<string, unknown> }
  | { data: Record<string, unknown> };

// ─── helpers ───────────────────────────────────────────────────────────────

function serializeGoal(goal: Awaited<ReturnType<typeof getActiveGoalForUser>>) {
  if (!goal) return null;
  return {
    id: goal.id,
    title: goal.title,
    status: goal.status,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
    completedCount: goal.completedCount,
    totalCount: goal.totalCount,
    progress: goal.progress,
    actions: goal.actions.map((a) => ({
      id: a.id,
      description: a.description,
      completed: a.completed,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

function serializeFlow(flow: {
  currentIntent: string;
  currentStep: number;
  activeFlow: string | null;
  instruction: string | null;
}) {
  return {
    currentIntent: flow.currentIntent,
    currentStep: flow.currentStep,
    activeFlow: flow.activeFlow,
    instruction: flow.instruction,
  };
}

// ─── main use case ─────────────────────────────────────────────────────────

export async function processMessage(input: ProcessMessageInput): Promise<ProcessMessageResult> {
  const { userId, message, session, jsonMode } = input;

  const remainingMessagesAfterTurn =
    session.messageLimitPerDay === null
      ? null
      : Math.max(0, session.messageLimitPerDay - (session.messagesUsedToday + 1));

  const softPaywallActive =
    !session.hasPlan && remainingMessagesAfterTurn !== null && remainingMessagesAfterTurn <= 2;

  // ── 1. Quick synchronous analysis (Phase 1: Analyze) ────────────────────
  const analysis = await analyzeMessage(userId, message);
  const { state, tvSignals, detectedIntent, riskLevel, flowContext } = analysis;
  const enriched = await enrichContext({
    userId,
    message,
    conversationIdHint: input.conversationId,
    state,
    detectedIntent,
    riskLevel,
    tvSignals,
    flowContext,
    crisisMode: analysis.crisisMode,
    crisisSource: analysis.crisisSource,
    crisisActiveUntil: analysis.crisisActiveUntil,
  });

  let persistenceAvailable = enriched.persistenceAvailable;
  const {
    conversationId,
    conversationHistory,
    emotionalProfile,
    crisisMode,
    crisisSource,
    crisisActiveUntil,
    activeGoal,
    goalAvoidanceCount,
    avoidanceDetectedThisTurn,
    completionMicroFeedback,
    actionLockPayload,
    actionLockAssistantMessage,
    domainState,
    domainDecision,
    transformationPhase,
    transformationSummary,
    mentorMode,
    onboardingContext,
    conversionTrigger,
    captureEmailRecommended,
    communityCTA,
  } = enriched;
  const captureEmailMessage = CAPTURE_EMAIL_PROMPT;

  const conversionType = conversionTrigger ? "progress" : undefined;
  const softPaywallPrompt = softPaywallActive && (conversionTrigger || Boolean(activeGoal));

  // ── 4-5. Intercept: action lock / crisis / transitional void ─────────────
  const interceptInput = {
    userId,
    message,
    state,
    conversationId,
    persistenceAvailable,
    flowContext,
    emotionalProfile,
    crisisMode,
    crisisSource,
    crisisActiveUntil,
    riskLevel,
    actionLockPayload,
    actionLockAssistantMessage,
    captureEmailRecommended,
    captureEmailMessage,
    domainState,
    domainDecision,
    activeGoal,
  };

  const lockResult = await interceptActionLock(interceptInput);
  if (lockResult.intercepted) return { data: lockResult.data };

  const crisisResult = await interceptCrisis(interceptInput);
  if (crisisResult.intercepted) return { data: crisisResult.data };

  const tvResult = await interceptTransitionalVoid(interceptInput);
  if (tvResult.intercepted) return { data: tvResult.data };

  // ── 6. AI key guard ────────────────────────────────────────────────────
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    logError("AI", new Error("Missing OPENROUTER_API_KEY"), { route: "/api/chat" });
    throw new Error("MISSING_OPENROUTER_API_KEY");
  }

  // ── 7-8. Build context (Phase 4: Context) ─────────────────────────────
  const ctx = await buildContext({
    userId,
    message,
    conversationId,
    state,
    emotionalProfile,
    activeGoal,
    flowContext,
    mentorMode,
    transformationPhase,
    transformationSummary,
    onboardingContext,
    goalAvoidanceCount,
    avoidanceDetectedThisTurn,
    conversionTrigger,
    session: {
      userPlan: session.userPlan,
      remainingMessages: remainingMessagesAfterTurn,
      hasActiveGoal: Boolean(activeGoal),
    },
  });

  const { coachContext, searchResults, impulseProfile, impulseLogs, activeAction, defaultAction } = ctx;

  // ── 9. Impulse mode (non-streaming JSON) ──────────────────────────────
  if (impulseProfile) {
    const aiResult = await generateImpulseResponse(message, impulseProfile, impulseLogs);

    if (persistenceAvailable) {
      try {
        await saveConversationMessage({
          conversationId,
          userId,
          role: "assistant",
          content: aiResult.response,
        });
      } catch (dbError: unknown) {
        persistenceAvailable = false;
        logError("DB", dbError, { route: "/api/chat", userId, stage: "impulse_persistence" });
      }
    }

    return {
      data: {
        success: true,
        response: aiResult.response,
        state,
        conversationId,
        goal: serializeGoal(activeGoal),
        action: activeAction?.description ?? defaultAction,
        emotionalProfile,
        searchUsed: false,
        fallback: aiResult.fallback,
        flow: serializeFlow(flowContext),
        persistenceAvailable,
        mentorMode: mentorMode.mode,
        transformationPhase,
        conversionTrigger,
        conversionType,
        captureEmail: captureEmailRecommended,
        captureEmailMessage: captureEmailRecommended ? captureEmailMessage : null,
        actions: communityCTA ? [communityCTA] : [],
      },
    };
  }

  // ── 10. JSON path ──────────────────────────────────────────────────────
  if (jsonMode) {
    const aiResult = await generateAIResponse(message, state, emotionalProfile, coachContext, conversationHistory, { userId, source: "chat" });
    let assistantResponse = completionMicroFeedback
      ? `${completionMicroFeedback}\n\n${aiResult.response}`
      : aiResult.response;
    assistantResponse = finalizeResponse(assistantResponse, {
      state,
      mentor: mentorMode,
      goal: buildGoalCoachContext(activeGoal, message, {
        avoidanceCount: goalAvoidanceCount,
        avoidanceDetected: avoidanceDetectedThisTurn,
      }),
      onboarding: onboardingContext,
    });
    assistantResponse = appendConversionPrompt(assistantResponse, conversionTrigger);
    assistantResponse = appendSoftPaywallPrompt(assistantResponse, softPaywallPrompt);
    assistantResponse = appendCaptureEmailPrompt(assistantResponse, captureEmailRecommended);

    if (persistenceAvailable) {
      try {
        await saveConversationMessage({
          conversationId,
          userId,
          role: "assistant",
          content: assistantResponse,
        });
      } catch (dbError: unknown) {
        persistenceAvailable = false;
        logError("DB", dbError, { route: "/api/chat", userId, stage: "post_ai_persistence_json" });
      }
    }

    await trackSafe({
      userId,
      type: "MESSAGE_RECEIVED",
      metadata: {
        conversationId,
        responseLength: assistantResponse.length,
        fallback: aiResult.fallback,
        userState: domainState,
        decisionType: domainDecision.type,
      },
    });

    return {
      data: {
        success: true,
        response: assistantResponse,
        state,
        systemState: domainState,
        decision: domainDecision,
        conversationId,
        goal: serializeGoal(activeGoal),
        action: activeAction?.description ?? defaultAction,
        emotionalProfile,
        searchUsed: searchResults.length > 0,
        fallback: aiResult.fallback,
        flow: serializeFlow(flowContext),
        persistenceAvailable,
        mentorMode: mentorMode.mode,
        transformationPhase,
        conversionTrigger,
        conversionType,
        captureEmail: captureEmailRecommended,
        captureEmailMessage: captureEmailRecommended ? captureEmailMessage : null,
        actions: communityCTA ? [communityCTA] : [],
      },
    };
  }

  // ── 11. SSE streaming path ─────────────────────────────────────────────
  const systemPrompt = buildCoachPrompt(state, emotionalProfile, coachContext);
  const metaPayload = {
    success: true,
    state,
    systemState: domainState,
    decision: domainDecision,
    conversationId,
    goal: serializeGoal(activeGoal),
    action: activeAction?.description ?? defaultAction,
    emotionalProfile,
    searchUsed: searchResults.length > 0,
    flow: serializeFlow(flowContext),
    mentorMode: mentorMode.mode,
    transformationPhase,
    conversionTrigger,
    conversionType,
    captureEmail: captureEmailRecommended,
    captureEmailMessage: captureEmailRecommended ? captureEmailMessage : null,
    actions: communityCTA ? [communityCTA] : [],
  };

  const streamUserId = userId;
  const streamConversationId = conversationId;
  let streamPersistence = persistenceAvailable;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let rawText = "";
      let streamFallback = false;

      try {
        for await (const token of streamOpenRouterTokens(message, systemPrompt, conversationHistory)) {
          rawText += token;
          send({ type: "delta", delta: token });
        }
      } catch (streamError: unknown) {
        logError("AI", streamError, { area: "chat_stream", userId: streamUserId });
        streamFallback = true;
      }

      if (!rawText) {
        const fallbackResult = await generateAIResponse(
          message,
          state,
          emotionalProfile,
          coachContext,
          conversationHistory,
          { userId, source: "chat" },
        );
        rawText = fallbackResult.response;
        streamFallback = fallbackResult.fallback;
        send({ type: "delta", delta: rawText });
      }

      let finalText = completionMicroFeedback
        ? `${completionMicroFeedback}\n\n${rawText}`
        : rawText;
      finalText = finalizeResponse(finalText, {
        state,
        mentor: mentorMode,
        goal: buildGoalCoachContext(activeGoal, message, {
          avoidanceCount: goalAvoidanceCount,
          avoidanceDetected: avoidanceDetectedThisTurn,
        }),
        onboarding: onboardingContext,
      });
      finalText = appendConversionPrompt(finalText, conversionTrigger);
      finalText = appendSoftPaywallPrompt(finalText, softPaywallPrompt);
      finalText = appendCaptureEmailPrompt(finalText, captureEmailRecommended);

      if (finalText !== rawText) {
        send({ type: "replace", content: finalText });
      }

      if (streamPersistence) {
        try {
          await saveConversationMessage({
            conversationId: streamConversationId,
            userId: streamUserId,
            role: "assistant",
            content: finalText,
          });
        } catch (dbError: unknown) {
          streamPersistence = false;
          logError("DB", dbError, {
            route: "/api/chat",
            userId: streamUserId,
            stage: "stream_persistence",
          });
        }
      }

      await trackSafe({
        userId: streamUserId,
        type: "MESSAGE_RECEIVED",
        metadata: {
          conversationId: streamConversationId,
          responseLength: finalText.length,
          fallback: streamFallback,
          streaming: true,
          userState: domainState,
          decisionType: domainDecision.type,
        },
      });

      logInfo("AI", "stream_completed", {
        userId: streamUserId,
        conversationId: streamConversationId,
        fallback: streamFallback,
      });

      send({
        type: "meta",
        ...metaPayload,
        fallback: streamFallback,
        persistenceAvailable: streamPersistence,
      });
      send({ type: "done" });
      controller.close();
    },
  });

  return { stream, meta: metaPayload };
}
