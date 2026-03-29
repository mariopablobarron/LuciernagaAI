import { logError, logInfo } from "@/lib/logger";
import { withTimeout } from "@/lib/utils";
import { buildCoachPrompt, buildFallbackResponse } from "@/services/coach";
import type { UserState } from "@/types/chat";

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 15000;

function normalizeState(userState: string): UserState {
  if (
    userState === "neutral" ||
    userState === "ansioso" ||
    userState === "bloqueado" ||
    userState === "perdido"
  ) {
    return userState;
  }
  return "neutral";
}

function extractReply(data: OpenRouterResponse): string {
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function requestOpenRouter(message: string, userState: UserState): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await withTimeout(
    fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
        "X-Title": "mentor-web",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: buildCoachPrompt(userState) },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    }),
    REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter HTTP ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const reply = extractReply(data);

  if (!reply) {
    throw new Error("OpenRouter returned empty response");
  }

  return reply;
}

export async function generateAIResponse(
  message: string,
  userState: string
): Promise<{ response: string; fallback: boolean }> {
  const typedState = normalizeState(userState);

  try {
    const response = await requestOpenRouter(message, typedState);
    logInfo("CHAT", "ai_response_generated", {
      state: typedState,
      model: OPENROUTER_MODEL,
      fallback: false,
    });
    return { response, fallback: false };
  } catch (error: unknown) {
    logError("CHAT", error, { state: userState, fallback: true, route: "ai_service" });
    return {
      response: buildFallbackResponse(),
      fallback: true,
    };
  }
}

type LegacyInput = {
  message: string;
  state: UserState;
  profile?: "structured" | "direct";
};

export async function generateMentorReply(input: LegacyInput): Promise<{
  reply: string;
  fallback: boolean;
}> {
  const result = await generateAIResponse(input.message, input.state);
  return {
    reply: result.response,
    fallback: result.fallback,
  };
}
