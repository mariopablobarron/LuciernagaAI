import { logError, logInfo } from "@/lib/logger";
import { getErrorMessage, fetchWithTimeout } from "@/lib/utils";
import { buildFallbackResponse } from "@/services/coach";
import type { DailyImpulseLogSnapshot, ImpulseProfileSnapshot } from "@/types/impulse";

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 15000;

function estimateMinutes(profileCode: ImpulseProfileSnapshot["code"]): number {
  switch (profileCode) {
    case "BLOQUEADO":
      return 10;
    case "ANSIOSO":
      return 12;
    case "DESMOTIVADO":
      return 8;
    case "PERDIDO":
      return 15;
    case "POTENCIAL_ALTO":
      return 25;
    default:
      return 10;
  }
}

function buildImpulsePrompt(
  input: string,
  userProfile: ImpulseProfileSnapshot,
  lastLogs: DailyImpulseLogSnapshot[]
): string {
  const recentLogSummary =
    lastLogs.length === 0
      ? "No hay logs recientes todavía."
      : lastLogs
          .slice(0, 3)
          .map((log) => {
            const state = log.emotionalState || "neutral";
            const note = log.note || "sin nota";
            return `- ${state}: ${note}`;
          })
          .join("\n");

  const estimatedMinutes = estimateMinutes(userProfile.code);

  return `Eres Tres Mil Millones de Latidos en Modo Impulso.

Objetivo:
- No entretener.
- Diagnosticar rapido.
- Confrontar con respeto.
- Empujar a una sola accion concreta.

Perfil actual del usuario:
- Perfil: ${userProfile.title} (${userProfile.code})
- Foco operativo: ${userProfile.operationalFocus}
- Claridad: ${userProfile.scores.claridad}/100
- Autoestima: ${userProfile.scores.autoestima}/100
- Energia: ${userProfile.scores.energia}/100
- Disciplina: ${userProfile.scores.disciplina}/100
- Social: ${userProfile.scores.social}/100

Últimos logs:
${recentLogSummary}

Mensaje actual del usuario:
${input}

Reglas obligatorias:
- Responde en español.
- Máximo 120 palabras.
- Detecta el estado emocional y nómbralo sin sonar clínico.
- Si detectas evasión, dilo con respeto y claridad.
- No cierres en reflexión abstracta.
- No uses listas largas.
- Debes terminar SIEMPRE con estas tres líneas exactas de estructura:
Hoy solo haz esto: [acción concreta y observable].
Te llevará ${estimatedMinutes} minutos.
Cuando lo termines, dime: hecho, no hecho o bloqueado.

- La acción debe ser realista para hoy.
- Si el usuario está bloqueado o ansioso, reduce el tamaño de la acción.
- Si el usuario tiene potencial alto, sube la exigencia práctica sin volverte frío.`;
}

function extractReply(data: OpenRouterResponse): string {
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function normalizeImpulseResponse(
  response: string,
  userProfile: ImpulseProfileSnapshot
): string {
  const trimmed = response.trim();
  const estimatedMinutes = estimateMinutes(userProfile.code);

  const hasActionLine = /Hoy solo haz esto:/i.test(trimmed);
  const hasTimeLine = /Te llevará \d+ minutos\./i.test(trimmed);
  const hasValidationLine = /Cuando lo termines, dime: hecho, no hecho o bloqueado\./i.test(trimmed);

  if (hasActionLine && hasTimeLine && hasValidationLine) {
    return trimmed;
  }

  return [
    trimmed || buildFallbackResponse(),
    `Hoy solo haz esto: escribe en una frase qué vas a terminar hoy y ejecuta el primer paso ahora mismo.`,
    `Te llevará ${estimatedMinutes} minutos.`,
    "Cuando lo termines, dime: hecho, no hecho o bloqueado.",
  ].join("\n");
}

export async function generateImpulseResponse(
  input: string,
  userProfile: ImpulseProfileSnapshot,
  lastLogs: DailyImpulseLogSnapshot[]
): Promise<{
  response: string;
  fallback: boolean;
  errorType?: "missing_config" | "provider_failure";
  errorMessage?: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return {
      response: normalizeImpulseResponse(buildFallbackResponse(), userProfile),
      fallback: true,
      errorType: "missing_config",
      errorMessage: "OPENROUTER_API_KEY is not configured",
    };
  }

  const systemPrompt = buildImpulsePrompt(input, userProfile, lastLogs);

  try {
    logInfo("AI", "impulse_mode_request_started", {
      profile: userProfile.code,
      totalScore: userProfile.scores.total,
      lastLogs: lastLogs.length,
    });

    const response = await fetchWithTimeout(
      OPENROUTER_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
          "X-Title": "mentor-web-impulse",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input },
          ],
          temperature: 0.5,
          max_tokens: 220,
        }),
      },
      REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(`OpenRouter HTTP ${response.status}`);
    }

    const payload = (await response.json()) as OpenRouterResponse;
    const reply = normalizeImpulseResponse(extractReply(payload), userProfile);

    logInfo("AI", "impulse_mode_request_succeeded", {
      profile: userProfile.code,
      replyLength: reply.length,
    });

    return {
      response: reply,
      fallback: false,
    };
  } catch (error: unknown) {
    logError("AI", error, {
      route: "impulse_mode",
      profile: userProfile.code,
    });

    return {
      response: normalizeImpulseResponse(buildFallbackResponse(), userProfile),
      fallback: true,
      errorType: "provider_failure",
      errorMessage: getErrorMessage(error),
    };
  }
}
