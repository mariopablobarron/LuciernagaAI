/**
 * Text-to-speech via ElevenLabs con cache LRU en memoria.
 *
 * Decisión de cache: in-memory Map con LRU eviction. Razón: el container
 * de luciernaga-ai no tiene volumen persistente para `/tmp` y montar uno
 * implicaría editar compose en el VPS. La memoria del proceso pierde
 * cache en cada deploy (~5 min cada push a main), pero el TTS no es
 * tan frecuente como para que esto duela. Si pasa a serlo, migrar a
 * Postgres con `TtsCache { hashKey, audioBlob }` o a Redis.
 *
 * Tamaño máximo: 64MB en memoria. Si se llena, se evicta el menos
 * recientemente usado. 64MB ≈ 1000 entradas de ~64KB (audio típico de
 * un mensaje del mentor en multilingual_v2).
 */

import crypto from "node:crypto";
import { callElevenLabs } from "./client";
import {
  DEFAULT_MENTOR_VOICE_ID,
  DEFAULT_TTS_MODEL,
  DEFAULT_VOICE_SETTINGS,
  TTS_MAX_CHARS_PER_REQUEST,
} from "./voices";

const CACHE_MAX_BYTES = 64 * 1024 * 1024; // 64MB

type CacheEntry = {
  // ArrayBuffer (no Uint8Array): es asignable a BodyInit en NextResponse
  // sin casts. Uint8Array<ArrayBufferLike> tropezaba con tipos genéricos.
  audio: ArrayBuffer;
  lastAccessed: number;
};

const cache = new Map<string, CacheEntry>();
let cacheBytes = 0;

function cacheKey(text: string, voiceId: string, model: string): string {
  return crypto.createHash("sha256").update(`${voiceId}|${model}|${text}`).digest("hex");
}

function evictLRU(): void {
  if (cacheBytes <= CACHE_MAX_BYTES) return;
  // Ordenar por lastAccessed ascendente y eliminar hasta volver bajo el cap.
  const entries = Array.from(cache.entries()).sort(
    (a, b) => a[1].lastAccessed - b[1].lastAccessed,
  );
  for (const [key, entry] of entries) {
    if (cacheBytes <= CACHE_MAX_BYTES) break;
    cache.delete(key);
    cacheBytes -= entry.audio.byteLength;
  }
}

export type SynthesizeOptions = {
  voiceId?: string;
  model?: string;
};

export type SynthesizeResult = {
  /** Audio bytes (ArrayBuffer), listo para `new NextResponse(audio, …)`. */
  audio: ArrayBuffer;
  contentType: string;
  cached: boolean;
  voiceId: string;
  model: string;
};

/**
 * Genera el audio del texto. Devuelve Buffer + metadata.
 *
 * Throws si:
 *  - el texto es vacío
 *  - el texto excede TTS_MAX_CHARS_PER_REQUEST
 *  - ElevenLabs falla (la excepción será un ElevenLabsError)
 */
export async function synthesize(
  text: string,
  options: SynthesizeOptions = {},
): Promise<SynthesizeResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Texto vacío");
  if (trimmed.length > TTS_MAX_CHARS_PER_REQUEST) {
    throw new Error(`Texto excede ${TTS_MAX_CHARS_PER_REQUEST} caracteres`);
  }

  const voiceId = options.voiceId ?? DEFAULT_MENTOR_VOICE_ID;
  const model = options.model ?? DEFAULT_TTS_MODEL;
  const key = cacheKey(trimmed, voiceId, model);

  const hit = cache.get(key);
  if (hit) {
    hit.lastAccessed = Date.now();
    return {
      audio: hit.audio,
      contentType: "audio/mpeg",
      cached: true,
      voiceId,
      model,
    };
  }

  const response = (await callElevenLabs({
    method: "POST",
    path: `/v1/text-to-speech/${voiceId}`,
    json: {
      text: trimmed,
      model_id: model,
      voice_settings: DEFAULT_VOICE_SETTINGS,
    },
    raw: true,
    timeoutMs: 30_000,
  })) as Response;

  const audio = await response.arrayBuffer();

  cache.set(key, { audio, lastAccessed: Date.now() });
  cacheBytes += audio.byteLength;
  evictLRU();

  return {
    audio,
    contentType: response.headers.get("content-type") ?? "audio/mpeg",
    cached: false,
    voiceId,
    model,
  };
}

/** Stats útiles para /api/admin/voice/stats si se quiere monitorizar. */
export function getCacheStats(): { entries: number; bytes: number; maxBytes: number } {
  return { entries: cache.size, bytes: cacheBytes, maxBytes: CACHE_MAX_BYTES };
}
