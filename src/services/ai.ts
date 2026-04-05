import { logError, logInfo } from "@/lib/logger";
import { logLlmCall } from "@/lib/llm-logger";
import { getErrorMessage, withTimeout } from "@/lib/utils";
import {
  buildCoachPrompt,
  buildFallbackResponse,
  type CoachContext,
} from "@/services/coach";
import type { UserState } from "@/domain/types";
import {
  DEFAULT_EMOTIONAL_PROFILE,
  type EmotionalProfile,
} from "@/types/emotional-profile";

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface OpenRouterStreamChunk {
  choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 15000;
type AIErrorType = "missing_config" | "provider_failure" | "unknown";

class MissingOpenRouterKeyError extends Error {
  constructor() {
    super("OPENROUTER_API_KEY is not configured");
    this.name = "MissingOpenRouterKeyError";
  }
}

class OpenRouterProviderError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "OpenRouterProviderError";
    this.status = status;
  }
}

function normalizeState(userState: string): UserState {
  if (
    userState === "neutral" ||
    userState === "duda" ||
    userState === "bloqueo" ||
    userState === "ansiedad" ||
    userState === "claridad"
  ) {
    return userState;
  }

  if (userState === "ansioso") return "ansiedad";
  if (userState === "bloqueado") return "bloqueo";
  if (userState === "perdido") return "duda";
  return "neutral";
}

function extractReply(data: OpenRouterResponse): string {
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function sanitizeCoachContext(coachContext: CoachContext): CoachContext {
  if (!coachContext.web) {
    return coachContext;
  }

  if (coachContext.web.usage !== "practical_decision") {
    return {
      ...coachContext,
      web: null,
    };
  }

  return coachContext;
}

type ConversationTurn = { role: "user" | "assistant"; content: string };

async function requestOpenRouter(
  message: string,
  userState: UserState,
  emotionalProfile: EmotionalProfile,
  coachContext: CoachContext,
  history: ConversationTurn[] = [],
  opts: { userId?: string; source?: string } = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    logError("AI", new Error("Missing OPENROUTER_API_KEY"), {
      area: "request_openrouter_precheck",
    });
    throw new MissingOpenRouterKeyError();
  }

  logInfo("AI", "openrouter_request_started", {
    model: OPENROUTER_MODEL,
    state: userState,
    primaryEmotion: emotionalProfile.primaryEmotion,
    dominantPattern: emotionalProfile.dominantPattern,
    energyLevel: emotionalProfile.energyLevel,
    messageLength: message.length,
    webUsage: coachContext.web?.usage ?? "none",
    userPlan: coachContext.access?.userPlan ?? "unknown",
    remainingMessages: coachContext.access?.remainingMessages ?? null,
    hasActiveGoal: coachContext.access?.hasActiveGoal ?? false,
    conversionTrigger: coachContext.access?.conversionTrigger ?? false,
  });

  const startTime = Date.now();

  const safeCoachContext = sanitizeCoachContext(coachContext);

  let response: Response;
  try {
    response = await withTimeout(
      fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
          "X-Title": "mentor-web",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: "system",
              content: buildCoachPrompt(userState, emotionalProfile, safeCoachContext),
            },
            ...history,
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      }),
      REQUEST_TIMEOUT_MS
    );
  } catch (error: unknown) {
    throw new OpenRouterProviderError(
      `OpenRouter request failed: ${getErrorMessage(error)}`
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new OpenRouterProviderError(
      `OpenRouter HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      response.status
    );
  }

  const data = (await response.json()) as OpenRouterResponse;
  const reply = extractReply(data);

  if (!reply) {
    throw new OpenRouterProviderError("OpenRouter returned empty response");
  }

  logLlmCall({
    userId: opts.userId,
    model: OPENROUTER_MODEL,
    source: opts.source ?? "chat",
    prompt: message,
    response: reply,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
    totalTokens: data.usage?.total_tokens ?? 0,
    latencyMs: Date.now() - startTime,
  });

  logInfo("AI", "openrouter_request_succeeded", {
    model: OPENROUTER_MODEL,
    replyLength: reply.length,
  });
  return reply;
}

function classifyAIError(error: unknown): AIErrorType {
  if (error instanceof MissingOpenRouterKeyError) {
    return "missing_config";
  }

  if (error instanceof OpenRouterProviderError) {
    return "provider_failure";
  }

  return "unknown";
}

export async function generateAIResponse(
  message: string,
  userState: string,
  emotionalProfile: EmotionalProfile = DEFAULT_EMOTIONAL_PROFILE,
  coachContext: CoachContext = {},
  history: ConversationTurn[] = [],
  opts: { userId?: string; source?: string } = {},
): Promise<{
  response: string;
  fallback: boolean;
  errorType?: AIErrorType;
  errorMessage?: string;
}> {
  const typedState = normalizeState(userState);

  try {
    const response = await requestOpenRouter(message, typedState, emotionalProfile, coachContext, history, opts);
    logInfo("AI", "ai_response_generated", {
      state: typedState,
      primaryEmotion: emotionalProfile.primaryEmotion,
      dominantPattern: emotionalProfile.dominantPattern,
      energyLevel: emotionalProfile.energyLevel,
      model: OPENROUTER_MODEL,
      fallback: false,
      userPlan: coachContext.access?.userPlan ?? "unknown",
      remainingMessages: coachContext.access?.remainingMessages ?? null,
      hasActiveGoal: coachContext.access?.hasActiveGoal ?? false,
    });
    return { response, fallback: false };
  } catch (error: unknown) {
    const errorType = classifyAIError(error);
    const errorMessage = getErrorMessage(error);
    logError("AI", error, {
      state: userState,
      fallback: true,
      route: "ai_service",
      errorType,
    });
    return {
      response: buildFallbackResponse(),
      fallback: true,
      errorType,
      errorMessage,
    };
  }
}

// --- Modo Impulso ---

const IMPULSE_SYSTEM_PROMPT = `Eres Luciérnaga en Modo Impulso.
No es una conversación libre. Es entrenamiento.

Reglas absolutas:
1. Detecta el estado emocional del usuario en la primera línea (no lo digas, solo úsalo para calibrar).
2. Confronta suavemente si hay evasión o vaguedad. No valides sin acción.
3. Da exactamente UNA acción concreta, específica y acotada en tiempo.
4. Cierra SIEMPRE con este formato obligatorio:

"Hoy solo haz esto: [acción concreta]. Te llevará [X] minutos."

Prohibido:
- Respuestas largas (máximo 4 oraciones antes del cierre).
- Validar sin empujar a acción.
- Terminar sin la línea de cierre obligatoria.
- Dar más de una acción.`;

export type ImpulseResponseInput = {
  message: string;
  profileCode: string;
  profileFocus: string;
  recentLogs: Array<{ emotionalState: string | null; note: string | null }>;
};

function buildImpulsePrompt(input: ImpulseResponseInput): string {
  const logContext =
    input.recentLogs.length > 0
      ? `\nÚltimos estados reportados:\n${input.recentLogs
          .slice(0, 3)
          .map((l) => `- Estado: ${l.emotionalState ?? "desconocido"} | Nota: ${l.note ?? "sin nota"}`)
          .join("\n")}`
      : "";

  return `${IMPULSE_SYSTEM_PROMPT}

Perfil del usuario: ${input.profileCode}
Foco operativo: ${input.profileFocus}${logContext}`;
}

export async function generateImpulseResponse(input: ImpulseResponseInput): Promise<{
  response: string;
  fallback: boolean;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return {
      response: "Hoy solo haz esto: abre el documento o la tarea más importante y trabaja 10 minutos sin parar. Te llevará 10 minutos.",
      fallback: true,
    };
  }

  try {
    const res = await withTimeout(
      fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
          "X-Title": "mentor-web-impulso",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: "system", content: buildImpulsePrompt(input) },
            { role: "user", content: input.message },
          ],
          temperature: 0.5,
          max_tokens: 220,
        }),
      }),
      REQUEST_TIMEOUT_MS
    );

    if (!res.ok) {
      throw new OpenRouterProviderError(`OpenRouter HTTP ${res.status}`);
    }

    const data = (await res.json()) as OpenRouterResponse;
    const reply = extractReply(data);

    if (!reply) {
      throw new OpenRouterProviderError("Empty response");
    }

    logInfo("AI", "impulse_response_generated", {
      profileCode: input.profileCode,
      replyLength: reply.length,
    });

    return { response: reply, fallback: false };
  } catch (error: unknown) {
    logError("AI", error, { area: "generateImpulseResponse", profile: input.profileCode });
    return {
      response: "Hoy solo haz esto: define en una sola línea qué tarea es tu prioridad y empiézala ahora. Te llevará 5 minutos.",
      fallback: true,
    };
  }
}

export async function* streamOpenRouterTokens(
  message: string,
  systemPrompt: string,
  history: ConversationTurn[] = [],
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    yield buildFallbackResponse();
    return;
  }

  let res: Response;
  try {
    res = await withTimeout(
      fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
          "X-Title": "mentor-web",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 500,
          stream: true,
        }),
      }),
      REQUEST_TIMEOUT_MS
    );
  } catch (error: unknown) {
    logError("AI", error, { area: "streamOpenRouterTokens_fetch" });
    yield buildFallbackResponse();
    return;
  }

  if (!res.ok) {
    logError("AI", new Error(`OpenRouter stream HTTP ${res.status}`), { area: "streamOpenRouterTokens" });
    yield buildFallbackResponse();
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    yield buildFallbackResponse();
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === "[DONE]") return;
        try {
          const chunk = JSON.parse(jsonStr) as OpenRouterStreamChunk;
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // malformed chunk — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

type LegacyInput = {
  message: string;
  state: UserState;
  profile?: "structured" | "direct";
  emotionalProfile?: EmotionalProfile;
};

export async function generateMentorReply(input: LegacyInput): Promise<{
  reply: string;
  fallback: boolean;
  errorType?: AIErrorType;
  errorMessage?: string;
}> {
  const result = await generateAIResponse(
    input.message,
    input.state,
    input.emotionalProfile ?? DEFAULT_EMOTIONAL_PROFILE
  );
  return {
    reply: result.response,
    fallback: result.fallback,
    errorType: result.errorType,
    errorMessage: result.errorMessage,
  };
}
