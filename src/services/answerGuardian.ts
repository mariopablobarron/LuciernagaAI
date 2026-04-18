import { logError, logInfo } from "@/lib/logger";
import { logLlmCall } from "@/lib/llm-logger";
import { fetchWithTimeout } from "@/lib/utils";

/**
 * Answer guardian — classifies a user's would-be community answer as
 * prescriptive (directive, advice-giving) vs. interpellative (inviting
 * reflection). When prescriptive, suggests a reformulation in question
 * form aligned with the product's pedagogical stance (interpellate > instruct).
 *
 * NOT a blocker. Returns `null` on any failure so callers fall through
 * to publishing the original text. Does not replace content safety.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4-6";
const TIMEOUT_MS = 15000;

export type AnswerClassification = {
  isPrescriptive: boolean;
  suggestedReformulation: string | null;
  reasoning: string;
};

const SYSTEM_PROMPT = `Eres un evaluador pedagógico para un foro de apoyo emocional. Tu trabajo es leer la respuesta que un usuario quiere dar a la pregunta de otro y decidir si es PRESCRIPTIVA (dice qué hacer: "deberías", "tienes que", "yo haría", "lo mejor es...") o INTERPELATIVA (acompaña con preguntas o reflexiones sin imponer).

Si es PRESCRIPTIVA, propón una REFORMULACIÓN breve que convierta el mismo contenido en una pregunta que invite al otro a pensar por sí mismo. Máximo 2 frases. Mantén el espíritu del mensaje original.

Si ya es interpelativa, deja reformulation en null.

Responde SOLO con JSON válido, sin texto adicional:
{"is_prescriptive": boolean, "reformulation": string|null, "reasoning": "una frase corta"}`;

type OpenRouterJson = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export async function classifyAnswer(
  content: string,
  opts: { userId?: string } = {},
): Promise<AnswerClassification | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    logError("GUARDIAN", new Error("Missing OPENROUTER_API_KEY"), { area: "answer_guardian" });
    return null;
  }
  if (!content.trim()) return null;

  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(
      OPENROUTER_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
          "X-Title": "mentor-web",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content },
          ],
          temperature: 0.3,
          max_tokens: 250,
          response_format: { type: "json_object" },
        }),
      },
      TIMEOUT_MS,
    );

    if (!response.ok) {
      logError("GUARDIAN", new Error(`HTTP ${response.status}`), { userId: opts.userId });
      return null;
    }

    const data = (await response.json()) as OpenRouterJson;
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) return null;

    let parsed: { is_prescriptive?: boolean; reformulation?: string | null; reasoning?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      logError("GUARDIAN", new Error("Non-JSON guardian response"), {
        userId: opts.userId,
        preview: raw.slice(0, 100),
      });
      return null;
    }

    const result: AnswerClassification = {
      isPrescriptive: !!parsed.is_prescriptive,
      suggestedReformulation: parsed.reformulation?.trim() || null,
      reasoning: (parsed.reasoning ?? "").slice(0, 200),
    };

    logLlmCall({
      userId: opts.userId,
      model: MODEL,
      source: "answer_guardian",
      prompt: content,
      response: raw,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
      latencyMs: Date.now() - startTime,
    });

    logInfo("GUARDIAN", "answer_classified", {
      userId: opts.userId,
      isPrescriptive: result.isPrescriptive,
      hasReformulation: !!result.suggestedReformulation,
    });
    return result;
  } catch (error) {
    logError("GUARDIAN", error, { area: "classify_answer", userId: opts.userId });
    return null;
  }
}
