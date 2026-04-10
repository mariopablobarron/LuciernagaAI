import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

// ── Precios en USD por 1M tokens (fuente: openrouter.ai/models) ──────────────
// Añade modelos según los uses. Si el modelo no está en el mapa, coste = 0.
const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "openai/gpt-4o-mini":                    { inputPer1M: 0.15,  outputPer1M: 0.60  },
  "openai/gpt-4o":                          { inputPer1M: 2.50,  outputPer1M: 10.00 },
  "openai/gpt-4-turbo":                     { inputPer1M: 10.00, outputPer1M: 30.00 },
  "anthropic/claude-3-haiku":               { inputPer1M: 0.25,  outputPer1M: 1.25  },
  "anthropic/claude-3-5-haiku":             { inputPer1M: 0.80,  outputPer1M: 4.00  },
  "anthropic/claude-3-5-sonnet":            { inputPer1M: 3.00,  outputPer1M: 15.00 },
  "anthropic/claude-sonnet-4-5":            { inputPer1M: 3.00,  outputPer1M: 15.00 },
  "anthropic/claude-sonnet-4-6":            { inputPer1M: 3.00,  outputPer1M: 15.00 },
  "anthropic/claude-3-opus":                { inputPer1M: 15.00, outputPer1M: 75.00 },
  "meta-llama/llama-3-8b-instruct":         { inputPer1M: 0.05,  outputPer1M: 0.05  },
  "meta-llama/llama-3-70b-instruct":        { inputPer1M: 0.52,  outputPer1M: 0.75  },
  "google/gemini-flash-1.5":                { inputPer1M: 0.075, outputPer1M: 0.30  },
  "google/gemini-pro-1.5":                  { inputPer1M: 1.25,  outputPer1M: 5.00  },
  "mistralai/mistral-7b-instruct":          { inputPer1M: 0.06,  outputPer1M: 0.06  },
};

function calculateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (promptTokens * pricing.inputPer1M + completionTokens * pricing.outputPer1M) /
    1_000_000
  );
}

export interface LlmLogInput {
  userId?: string;
  model: string;
  source?: string;
  prompt: string;
  response: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

/**
 * Fire-and-forget — nunca awaited, nunca bloquea la respuesta.
 * El coste USD se calcula aquí automáticamente según el modelo.
 */
export function logLlmCall(input: LlmLogInput): void {
  const costUsd = calculateCostUsd(input.model, input.promptTokens, input.completionTokens);

  try {
    const db = getPrismaClient();
    db.llmLog
      .create({
        data: {
          userId: input.userId ?? null,
          model: input.model,
          source: input.source ?? "chat",
          prompt: input.prompt,
          response: input.response,
          promptTokens: input.promptTokens,
          completionTokens: input.completionTokens,
          totalTokens: input.totalTokens,
          costUsd,
          latencyMs: input.latencyMs,
        },
      })
      .catch((err: unknown) => {
        logError("LLM_LOG", err, { area: "logLlmCall" });
      });
  } catch (err: unknown) {
    logError("LLM_LOG", err, { area: "logLlmCall" });
  }
}
