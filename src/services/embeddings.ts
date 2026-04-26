/**
 * Embeddings provider (OpenAI `text-embedding-3-small`, 1536 dim).
 *
 * Kept behind a thin interface so the model/provider can be swapped
 * (Voyage, Cohere, local Ollama) without touching callers.
 *
 * Used by semantic-memory.ts and the embed-pending-memories cron.
 * NOT used during the chat turn — embeddings happen out-of-band.
 */

import { logError } from "@/lib/logger";
import { fetchWithTimeout, getErrorMessage } from "@/lib/utils";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIM = 1536;
const REQUEST_TIMEOUT_MS = 20000;
// OpenAI accepts up to 2048 inputs per call; we batch smaller to keep
// per-request payloads reasonable and recover faster on partial failures.
const MAX_BATCH = 64;

interface OpenAIEmbeddingsResponse {
  data?: Array<{ embedding?: number[]; index?: number }>;
  usage?: { prompt_tokens?: number; total_tokens?: number };
}

export class MissingOpenAIKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured");
    this.name = "MissingOpenAIKeyError";
  }
}

export class EmbeddingsProviderError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "EmbeddingsProviderError";
    this.status = status;
  }
}

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new MissingOpenAIKeyError();
  return key;
}

async function callOpenAI(input: string[]): Promise<number[][]> {
  const apiKey = getApiKey();
  const res = await fetchWithTimeout(
    OPENAI_EMBEDDINGS_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EmbeddingsProviderError(
      `OpenAI embeddings ${res.status}: ${body.slice(0, 200)}`,
      res.status,
    );
  }

  const json = (await res.json()) as OpenAIEmbeddingsResponse;
  const data = json.data ?? [];
  if (data.length !== input.length) {
    throw new EmbeddingsProviderError(
      `Expected ${input.length} embeddings, got ${data.length}`,
    );
  }

  // OpenAI documents that `index` matches the input order, but be defensive.
  const ordered = new Array<number[]>(input.length);
  for (const item of data) {
    const idx = item.index ?? 0;
    const vec = item.embedding ?? [];
    if (vec.length !== EMBEDDING_DIM) {
      throw new EmbeddingsProviderError(
        `Embedding dim mismatch: expected ${EMBEDDING_DIM}, got ${vec.length}`,
      );
    }
    ordered[idx] = vec;
  }
  return ordered;
}

export async function embed(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }
  const [vec] = await callOpenAI([trimmed]);
  return vec;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  const cleaned = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (cleaned.length === 0) return [];

  const out: number[][] = [];
  for (let i = 0; i < cleaned.length; i += MAX_BATCH) {
    const batch = cleaned.slice(i, i + MAX_BATCH);
    try {
      const vecs = await callOpenAI(batch);
      out.push(...vecs);
    } catch (err) {
      logError("EMBEDDINGS", err, {
        batchStart: i,
        batchSize: batch.length,
        message: getErrorMessage(err),
      });
      throw err;
    }
  }
  return out;
}

/**
 * Format a number[] for pgvector literal injection.
 * pgvector accepts `'[0.1,0.2,...]'::vector`. We emit fixed-precision
 * floats to keep the SQL deterministic and small.
 */
export function toPgVectorLiteral(vec: number[]): string {
  return `[${vec.map((v) => v.toFixed(7)).join(",")}]`;
}
