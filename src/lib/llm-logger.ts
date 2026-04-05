import { getPrismaClient } from "@/db/prisma";
import { logError } from "@/lib/logger";

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
 * Fire-and-forget — never awaited so it never blocks the response path.
 * Errors are swallowed and logged via the internal logger.
 */
export function logLlmCall(input: LlmLogInput): void {
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
