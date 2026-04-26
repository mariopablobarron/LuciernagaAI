/**
 * Cliente de embeddings vía OpenAI directo (no OpenRouter, que no expone embeddings).
 * Modelo: text-embedding-3-small — 1536 dims, $0.02/1M tokens.
 *
 * Decisión consciente: pegarle directo a OpenAI con OPENAI_API_KEY en vez de
 * pgvector local. La extensión pgvector tumbó la web el 2026-04-26 (ver
 * memory/feedback_coolify_pg_extensions.md).
 */

import { logError } from "@/lib/logger";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const MODEL = "text-embedding-3-small";
const DIMS = 1536;

export const EMBEDDING_DIMS = DIMS;
export const EMBEDDING_MODEL = MODEL;

/** Texto cortado para embed: skipea mensajes triviales y trunca largos. */
const MIN_CHARS = 20;
const MAX_CHARS = 8000;

export class EmbeddingsDisabledError extends Error {
  constructor() {
    super("OPENAI_API_KEY no configurada — embeddings deshabilitados");
    this.name = "EmbeddingsDisabledError";
  }
}

export function isEmbeddingsEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function shouldEmbed(text: string): boolean {
  const t = text.trim();
  return t.length >= MIN_CHARS;
}

export function prepareForEmbed(text: string): string {
  return text.trim().slice(0, MAX_CHARS);
}

type OpenAIEmbeddingResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  usage?: { prompt_tokens: number; total_tokens: number };
};

/** Embed batch (hasta 2048 inputs según OpenAI). Devuelve array alineado con `inputs`. */
export async function embedBatch(inputs: string[]): Promise<number[][]> {
  if (!isEmbeddingsEnabled()) throw new EmbeddingsDisabledError();
  if (inputs.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY!.trim();

  try {
    const res = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: MODEL, input: inputs }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI embeddings ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as OpenAIEmbeddingResponse;
    // Asegurar orden por `index` (OpenAI los devuelve ordenados, pero nos cubrimos).
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  } catch (error) {
    logError("EMBEDDINGS", error, { inputs: inputs.length, model: MODEL });
    throw error;
  }
}

export async function embedOne(input: string): Promise<number[]> {
  const [v] = await embedBatch([input]);
  return v;
}

/** Coseno entre dos vectores. Devuelve 0 si dimensiones no coinciden o vector vacío. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
