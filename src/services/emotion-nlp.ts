/**
 * Capa NLP de detección de emociones.
 *
 * Complementa al `emotional-model` basado en keywords. NO lo reemplaza.
 *
 * Historia: hasta 2026-05 usaba el modelo HuggingFace
 * `pysentimiento/robertuito-emotion-analysis` vía la Inference API gratuita.
 * HuggingFace deprecó esa API y el endpoint empezó a devolver 404 de forma
 * permanente (~33 errores/semana). Migrado a clasificación vía LLM
 * (OpenRouter / Claude Haiku) — sin dependencia externa frágil, mismo
 * contrato público.
 *
 * Etiquetas (se conservan las del modelo anterior para compatibilidad con
 * el endpoint /api/admin/emotion-nlp-stats y los logs históricos):
 *   joy, sadness, anger, fear, disgust, surprise, others.
 *
 * Mapeo a las etiquetas internas (PrimaryEmotion):
 *   joy      → calma
 *   sadness  → apatía       (proxy razonable; el keyword model también las solapa)
 *   fear     → ansiedad
 *   anger    → frustración
 *   disgust  → frustración   (cercano en valencia/arousal)
 *   surprise → sin mapeo     (no aporta señal accionable; se ignora)
 *   others   → sin mapeo
 *
 * Política de uso:
 *  - Síncrono pero no bloqueante: timeout configurable; si vence, devolvemos
 *    null y el flujo del coach sigue con el perfil de keywords.
 *  - Sin OPENROUTER_API_KEY → no-op silencioso (no romper local/dev).
 *  - Hoy se usa en modo shadow (enrich.ts) — compara NLP vs keywords sin
 *    alterar el perfil. Coste por llamada: mínimo (Haiku, ~60 tokens).
 */

import { logError, logInfo } from "@/lib/logger";
import { getOpenRouterChatUrl, getOpenRouterHeaders, getOpenRouterModel } from "@/lib/openrouter";
import type { PrimaryEmotion } from "@/types/emotional-profile";

// La llamada LLM es más lenta que la antigua HF Inference. 2.5s es un techo
// razonable para una capa shadow no-bloqueante: si tarda más, abortamos y el
// coach sigue con keywords.
const DEFAULT_TIMEOUT_MS = 2_500;
const EMOTION_MODEL = getOpenRouterModel("anthropic/claude-haiku-4-5");

type RawEmotionLabel =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "disgust"
  | "surprise"
  | "others";

const VALID_LABELS: readonly RawEmotionLabel[] = [
  "joy", "sadness", "anger", "fear", "disgust", "surprise", "others",
];

type EmotionPrediction = { label: RawEmotionLabel; score: number };

const LABEL_MAP: Partial<Record<RawEmotionLabel, PrimaryEmotion>> = {
  joy: "calma",
  sadness: "apatía",
  fear: "ansiedad",
  anger: "frustración",
  disgust: "frustración",
};

export type EmotionNlpResult = {
  rawLabel: RawEmotionLabel;
  rawScore: number;
  mappedEmotion: PrimaryEmotion | null;
  all: EmotionPrediction[];
};

const CLASSIFY_SYSTEM_PROMPT = `Eres un clasificador de emoción. Recibes un mensaje de un usuario y devuelves la emoción dominante.

Etiquetas posibles (elige UNA):
- joy: alegría, calma, satisfacción, esperanza
- sadness: tristeza, apatía, desánimo, vacío
- anger: enfado, frustración, irritación, rabia
- fear: miedo, ansiedad, angustia, preocupación
- disgust: asco, rechazo, hartazgo
- surprise: sorpresa, asombro
- others: neutro, sin emoción clara, o no clasificable

Responde SOLO con un objeto JSON, sin texto adicional, sin markdown:
{"label":"<etiqueta>","score":<0.0-1.0>}

score = tu confianza en la clasificación (0.0 = nada seguro, 1.0 = totalmente seguro).`;

function isValidLabel(v: unknown): v is RawEmotionLabel {
  return typeof v === "string" && (VALID_LABELS as readonly string[]).includes(v);
}

/**
 * Parsea la respuesta del LLM. Tolera que venga envuelta en ```json … ```
 * o con texto alrededor — extrae el primer objeto {…} válido.
 */
function parseClassification(raw: string): EmotionPrediction | null {
  const match = raw.match(/\{[^}]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as { label?: unknown; score?: unknown };
    if (!isValidLabel(obj.label)) return null;
    const score =
      typeof obj.score === "number" && obj.score >= 0 && obj.score <= 1
        ? obj.score
        : 0.5; // score ausente o fuera de rango → confianza media
    return { label: obj.label, score };
  } catch {
    return null;
  }
}

export async function detectEmotionNlp(
  text: string,
  options: { timeoutMs?: number } = {}
): Promise<EmotionNlpResult | null> {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(getOpenRouterChatUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        ...getOpenRouterHeaders(apiKey, { feature: "emotion_nlp" }),
        "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
        "X-Title": "mentor-web",
      },
      body: JSON.stringify({
        model: EMOTION_MODEL,
        messages: [
          { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
          { role: "user", content: trimmed.slice(0, 2000) },
        ],
        temperature: 0,
        max_tokens: 30,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      logError("EMOTION_NLP", new Error(`OpenRouter ${response.status}`), {
        status: response.status,
        model: EMOTION_MODEL,
      });
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";
    const prediction = parseClassification(content);

    if (!prediction) {
      logError("EMOTION_NLP", new Error("payload_shape_unexpected"), {
        model: EMOTION_MODEL,
        sample: content.slice(0, 120),
      });
      return null;
    }

    const mapped = LABEL_MAP[prediction.label] ?? null;
    logInfo("EMOTION_NLP", "detected", {
      rawLabel: prediction.label,
      rawScore: Number(prediction.score.toFixed(3)),
      mapped,
    });

    return {
      rawLabel: prediction.label,
      rawScore: prediction.score,
      mappedEmotion: mapped,
      all: [prediction],
    };
  } catch (error: unknown) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    if (isAbort) {
      logInfo("EMOTION_NLP", "timeout", { timeoutMs, model: EMOTION_MODEL });
    } else {
      logError("EMOTION_NLP", error, { model: EMOTION_MODEL });
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fusiona el resultado NLP con la emoción inferida por keywords.
 *
 * Reglas:
 *  - Si NLP no está disponible (null), devolver la keyword-emotion sin tocar.
 *  - Si NLP confianza < 0.55, devolver keyword-emotion (señal débil, no pisar).
 *  - Si keyword-emotion es "calma" (default cuando no hay matches fuertes)
 *    y NLP detecta una emoción negativa con score >= 0.55 → usar NLP.
 *  - En cualquier otro caso, mantener keyword-emotion (es controlable y rápida).
 */
export function fuseEmotion(
  keywordEmotion: PrimaryEmotion,
  nlp: EmotionNlpResult | null
): PrimaryEmotion {
  if (!nlp || !nlp.mappedEmotion) return keywordEmotion;
  if (nlp.rawScore < 0.55) return keywordEmotion;
  if (keywordEmotion === "calma" && nlp.mappedEmotion !== "calma") {
    return nlp.mappedEmotion;
  }
  return keywordEmotion;
}
