import { logError, logInfo } from "@/lib/logger";
import type { WeeklyLetterDigest } from "@/services/weekly-letter-digest";
import { getOpenRouterChatUrl, getOpenRouterHeaders, getOpenRouterModel } from "@/lib/openrouter";

export const WEEKLY_LETTER_SUBJECT = "Tu semana — una pregunta";

const OPENROUTER_MODEL = getOpenRouterModel("anthropic/claude-sonnet-4-6");
const MAX_WORDS = 200;
const REQUEST_TIMEOUT_MS = 20_000;

const SYSTEM_PROMPT = `Eres el mentor de Tres Mil Millones de Latidos — tono directo, respetuoso, sin adornos ni empalago. Escribes cartas cortas, en segunda persona.

Reglas absolutas para esta carta semanal:
1. Máximo 150 palabras en total. Breve.
2. Cita textualmente al menos una de las frases del usuario entre comillas españolas ("...") — exactamente como la escribió, sin reformular.
3. No inventes eventos, sentimientos ni hechos que el usuario no haya dicho.
4. Nada de emojis, nada de "abrazos", nada de metáforas cursis.
5. Termina con una única pregunta abierta, concreta, formulada desde lo que ha ocurrido esta semana. No "¿cómo estás?".
6. No incluyas enlaces, URLs ni firmas. Firmamos nosotros al mostrar la carta.
7. Si no tienes material suficiente, responde literalmente: NO_MATERIAL.`;

function buildUserPrompt(digest: WeeklyLetterDigest): string {
  const quotesBlock = digest.quotes.map((q, i) => `${i + 1}. "${q}"`).join("\n");
  return [
    `Esta semana el usuario ha estado en estado dominante: ${digest.dominantState}.`,
    `Activo en ${digest.daysActive} días distintos, con ${digest.messageCount} mensajes totales.`,
    `Frases textuales del usuario (elige al menos una para citar literalmente):`,
    quotesBlock,
    ``,
    `Escribe la carta siguiendo las reglas.`,
  ].join("\n");
}

export type ComposedLetter = {
  subject: string;
  body: string;
};

export class InsufficientMaterialError extends Error {
  constructor() {
    super("NO_MATERIAL");
    this.name = "InsufficientMaterialError";
  }
}

export class QuoteNotGroundedError extends Error {
  constructor() {
    super("QUOTE_NOT_GROUNDED");
    this.name = "QuoteNotGroundedError";
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function includesAnyQuote(body: string, quotes: string[]): boolean {
  return quotes.some((q) => body.includes(q));
}

async function callOpenRouter(userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(getOpenRouterChatUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        ...getOpenRouterHeaders(apiKey, { feature: "weekly_letter" }),
        "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
        "X-Title": "mentor-web",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 350,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) throw new Error("OpenRouter returned empty reply");
    return reply;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Compose the weekly letter for a user given their digest. Applies two
 * guardrails and retries once on failure before giving up:
 *
 *  - NO_MATERIAL sentinel  → InsufficientMaterialError
 *  - body must include ≥1 verbatim quote → QuoteNotGroundedError
 *  - body must be ≤ MAX_WORDS words → retries once, then trims
 */
export async function composeWeeklyLetter(
  digest: WeeklyLetterDigest,
  options: {
    now?: Date;
    callLLM?: (prompt: string) => Promise<string>;
  } = {}
): Promise<ComposedLetter> {
  const callLLM = options.callLLM ?? callOpenRouter;
  const userPrompt = buildUserPrompt(digest);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callLLM(userPrompt);

      if (raw.trim() === "NO_MATERIAL") {
        throw new InsufficientMaterialError();
      }

      if (!includesAnyQuote(raw, digest.quotes)) {
        throw new QuoteNotGroundedError();
      }

      const words = countWords(raw);
      const body = words > MAX_WORDS ? raw.split(/\s+/).slice(0, MAX_WORDS).join(" ") : raw;

      logInfo("WEEKLY_LETTER", "letter_composed", {
        userId: digest.userId,
        attempts: attempt,
        wordCount: countWords(body),
        quotesProvided: digest.quotes.length,
      });

      return { subject: WEEKLY_LETTER_SUBJECT, body };
    } catch (error) {
      lastError = error as Error;
      if (error instanceof InsufficientMaterialError) throw error;
      if (attempt >= 2) break;
      logInfo("WEEKLY_LETTER", "letter_retry", {
        userId: digest.userId,
        reason: lastError?.name ?? "unknown",
      });
    }
  }

  logError("WEEKLY_LETTER", lastError ?? new Error("compose_failed"), {
    userId: digest.userId,
    stage: "compose",
  });
  throw lastError ?? new Error("compose_failed");
}
