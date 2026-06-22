import { analyzeMessage } from "./phases/analyze";
import { enrichContext } from "./phases/enrich";
import { buildContext } from "./phases/context";
import { interceptActionLock, interceptCrisis, interceptTransitionalVoid } from "./phases/intercept";
import { reformulateMessage } from "./phases/reformulate";
import { logError, logInfo } from "@/lib/logger";
import { generateAIResponse, streamOpenRouterTokens } from "@/services/ai";
import { generateImpulseResponse } from "@/services/impulse-ai";
import { trackSafe } from "@/services/events";
import {
  finalizeResponse,
  buildCoachPrompt,
  CAPTURE_EMAIL_PROMPT,
} from "@/services/coach";
import { saveConversationMessage } from "@/services/conversation";
import { buildGoalCoachContext, getActiveGoalForUser } from "@/services/goals";
import { generateSuggestedActions } from "@/services/suggestedActions";
import { getMentorMode as getAccompanimentMode } from "@/lib/onboarding";
import { autoDetectAndSaveGender } from "@/services/gender-detector";

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
  mentorModeId?: string | null;
  session: SessionContext;
  jsonMode: boolean;
  /** ISO 3166-1 alpha-2 country code from edge proxy headers (cf-ipcountry / x-vercel-ip-country). */
  countryCode?: string | null;
  /** Locale activo del usuario (es/en/pt/fr). Determina el idioma de respuesta
   *  del mentor y los recursos de crisis a sugerir. */
  locale?: "es" | "en" | "pt" | "fr" | "de";
  /** Preferencias del usuario sobre estilo del mentor (no-interpretes, verbosity).
   *  Inyectadas como guidance al system prompt vía buildCoachPrompt. */
  mentorPrefs?: { noInterpretation?: boolean; verbosity?: number } | null;
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
  const { userId, message, session, jsonMode, countryCode, locale } = input;

  // Free es ilimitado: no hay soft paywall ni recuento de "mensajes que quedan".
  // Pro se vende por extras (continuidad, memoria, Modo Impulso), no por cap.
  const remainingMessagesAfterTurn = null;
  const softPaywallActive = false;

  // ── 1. Quick synchronous analysis (Phase 1: Analyze) ────────────────────
  const analysis = await analyzeMessage(userId, message);
  const { state, tvSignals, detectedIntent, detectedDomain, riskLevel, flowContext } = analysis;
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
    locale: input.locale,
  });

  let persistenceAvailable = enriched.persistenceAvailable;
  const {
    conversationId,
    conversationHistory,
    conversationSummary,
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
    captureNameRecommended,
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
    countryCode: countryCode ?? null,
    locale: input.locale,
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

  // ── Detector pasivo de género gramatical (Fase D) ─────────────────────
  // Solo autosetea si el usuario NO tiene preferencia ya elegida en /settings.
  // Fire-and-forget: si detecta algo, surte efecto en el SIGUIENTE turno.
  if (!session.isAnonymous) {
    void autoDetectAndSaveGender({ userId, message }).catch(() => {});
  }

  // ── 6.5. History-aware reformulation (mensajes ambiguos) ───────────────
  // Si el mensaje del usuario es corto/ambiguo (referencias tipo "eso",
  // "y por qué"), pedimos al LLM una versión autocontenida que se inyecta
  // como pista en el system prompt. Fire-and-forget seguro: si falla,
  // seguimos con el flujo normal.
  const reformulation = await reformulateMessage({
    message,
    history: conversationHistory,
    userId,
  });

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
    conversationSummary,
    session: {
      userPlan: session.userPlan,
      remainingMessages: remainingMessagesAfterTurn,
      hasActiveGoal: Boolean(activeGoal),
    },
  });

  const { coachContext: baseCoachContext, searchResults, impulseProfile, impulseLogs, activeAction, defaultAction } = ctx;

  // Inyectamos el modo de acompañamiento del usuario en el system prompt.
  // El cliente NO prefija el mensaje con la instrucción, se envía por id en
  // `mentorModeId` y lo resolvemos aquí. Nunca se muestra al usuario.
  const accompaniment = getAccompanimentMode(input.mentorModeId ?? null);
  const coachContext = {
    ...baseCoachContext,
    ...(accompaniment
      ? { accompanimentMode: { label: accompaniment.label, instruction: accompaniment.instruction } }
      : {}),
    ...(reformulation.reformulated && reformulation.standalone
      ? { contextualInterpretation: reformulation.standalone }
      : {}),
    ...(detectedDomain ? { problemDomain: detectedDomain } : {}),
    // Locale activo del usuario → coach.ts lo usa para responder en ese
    // idioma + sugerir el recurso de crisis del país correcto.
    ...(locale ? { locale } : {}),
    // Último mensaje del usuario — coach.ts lo mira para activar el modo
    // desahogo (extensión proporcional). NO se imprime en el prompt.
    lastUserMessage: input.message,
    // Preferencias explícitas del mentor (no-interpretes, verbosity).
    // Inyectadas como guidance al final del system prompt vía buildMentorPrefsGuidance.
    ...(input.mentorPrefs ? { mentorPrefs: input.mentorPrefs } : {}),
  };

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
        captureName: captureNameRecommended,
        actions: communityCTA ? [communityCTA] : [],
        suggestedActions: generateSuggestedActions({
          dominantPattern: emotionalProfile?.dominantPattern,
          hasPendingActions: (activeGoal?.actions.some((a) => !a.completed)) ?? false,
        }),
      },
    };
  }

  // ── 10. JSON path ──────────────────────────────────────────────────────
  if (jsonMode) {
    const aiResult = await generateAIResponse(message, state, emotionalProfile, coachContext, conversationHistory, { userId, source: "chat", locale });
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
      locale,
    });
    // Los prompts comerciales (conversión / paywall / captura de email) se
    // devuelven como flags del payload y los renderiza el cliente en UI
    // separada. No los pegamos al turno del mentor porque hacía que la
    // respuesta se sintiera como venta dentro de la conversación.

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
        captureName: captureNameRecommended,
        actions: communityCTA ? [communityCTA] : [],
        suggestedActions: generateSuggestedActions({
          dominantPattern: emotionalProfile?.dominantPattern,
          hasPendingActions: (activeGoal?.actions.some((a) => !a.completed)) ?? false,
        }),
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
    captureName: captureNameRecommended,
    actions: communityCTA ? [communityCTA] : [],
    suggestedActions: generateSuggestedActions({
      dominantPattern: emotionalProfile?.dominantPattern,
      hasPendingActions: (activeGoal?.actions.some((a) => !a.completed)) ?? false,
    }),
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
        for await (const token of streamOpenRouterTokens(message, systemPrompt, conversationHistory, { locale })) {
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
          { userId, source: "chat", locale },
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
        locale,
      });
      // Los prompts comerciales se devuelven en los flags del evento `meta`
      // (conversionTrigger, captureEmail, captureEmailMessage) para que el
      // cliente los renderice fuera del turno del mentor.

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
