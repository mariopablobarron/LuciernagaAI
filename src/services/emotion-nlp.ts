/**
 * Capa NLP de detección de emociones (transformer en español).
 *
 * Complementa al `emotional-model` basado en keywords. NO lo reemplaza.
 *
 * Modelo: pysentimiento/robertuito-emotion-analysis
 *  - Entrenado en español (RoBERTuito).
 *  - Etiquetas: joy, sadness, anger, fear, disgust, surprise, others.
 *  - Devuelve probabilidades por etiqueta (multi-clase, single-label).
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
 *  - Síncrono pero no bloqueante: timeout 800ms; si vence, devolvemos null
 *    y el flujo del coach sigue con el perfil de keywords.
 *  - Sin token configurado → no-op silencioso (no romper local/dev).
 *  - Sin coste de almacenamiento extra: el caller decide si fusiona o loguea.
 */

import { logError, logInfo } from "@/lib/logger";
import type { PrimaryEmotion } from "@/types/emotional-profile";

const HF_MODEL = "pysentimiento/robertuito-emotion-analysis";
const HF_ENDPOINT = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
const DEFAULT_TIMEOUT_MS = 800;

type RawHfLabel =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "disgust"
  | "surprise"
  | "others";

type HfPrediction = { label: RawHfLabel; score: number };

const LABEL_MAP: Partial<Record<RawHfLabel, PrimaryEmotion>> = {
  joy: "calma",
  sadness: "apatía",
  fear: "ansiedad",
  anger: "frustración",
  disgust: "frustración",
};

export type EmotionNlpResult = {
  rawLabel: RawHfLabel;
  rawScore: number;
  mappedEmotion: PrimaryEmotion | null;
  all: HfPrediction[];
};

function isPredictionArray(value: unknown): value is HfPrediction[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { label?: unknown }).label === "string" &&
        typeof (item as { score?: unknown }).score === "number"
    )
  );
}

function pickTop(predictions: HfPrediction[]): HfPrediction | null {
  if (predictions.length === 0) return null;
  return predictions.reduce((top, current) =>
    current.score > top.score ? current : top
  );
}

export async function detectEmotionNlp(
  text: string,
  options: { timeoutMs?: number; token?: string } = {}
): Promise<EmotionNlpResult | null> {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const token = options.token ?? process.env.HUGGINGFACE_API_TOKEN;
  if (!token) return null;

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(HF_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: trimmed,
        options: { wait_for_model: false },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logError("EMOTION_NLP", new Error(`HF API ${response.status}`), {
        status: response.status,
        model: HF_MODEL,
      });
      return null;
    }

    const payload: unknown = await response.json();
    // HF puede devolver [[{label,score},...]] o [{label,score},...] según el modelo.
    const flat = Array.isArray(payload) && Array.isArray(payload[0])
      ? (payload[0] as unknown)
      : payload;

    if (!isPredictionArray(flat)) {
      logError("EMOTION_NLP", new Error("payload_shape_unexpected"), {
        model: HF_MODEL,
      });
      return null;
    }

    const top = pickTop(flat);
    if (!top) return null;

    const mapped = LABEL_MAP[top.label] ?? null;
    logInfo("EMOTION_NLP", "detected", {
      rawLabel: top.label,
      rawScore: Number(top.score.toFixed(3)),
      mapped,
    });

    return {
      rawLabel: top.label,
      rawScore: top.score,
      mappedEmotion: mapped,
      all: flat,
    };
  } catch (error: unknown) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    if (isAbort) {
      logInfo("EMOTION_NLP", "timeout", { timeoutMs, model: HF_MODEL });
    } else {
      logError("EMOTION_NLP", error, { model: HF_MODEL });
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
