import { logError, logInfo } from "@/lib/logger";
import { getErrorMessage, withTimeout } from "@/lib/utils";
import {
  buildCoachPrompt,
  buildFallbackResponse,
  type CoachContext,
} from "@/services/coach";
import type { UserState } from "@/types/chat";
import {
  DEFAULT_EMOTIONAL_PROFILE,
  type EmotionalProfile,
} from "@/types/emotional-profile";

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
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

async function requestOpenRouter(
  message: string,
  userState: UserState,
  emotionalProfile: EmotionalProfile,
  coachContext: CoachContext
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
  });

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
            { role: "system", content: buildCoachPrompt(userState, emotionalProfile, coachContext) },
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
  coachContext: CoachContext = {}
): Promise<{
  response: string;
  fallback: boolean;
  errorType?: AIErrorType;
  errorMessage?: string;
}> {
  const typedState = normalizeState(userState);

  try {
    const response = await requestOpenRouter(message, typedState, emotionalProfile, coachContext);
    logInfo("AI", "ai_response_generated", {
      state: typedState,
      primaryEmotion: emotionalProfile.primaryEmotion,
      dominantPattern: emotionalProfile.dominantPattern,
      energyLevel: emotionalProfile.energyLevel,
      model: OPENROUTER_MODEL,
      fallback: false,
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
