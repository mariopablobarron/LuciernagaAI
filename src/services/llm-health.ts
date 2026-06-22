/**
 * LLM Health — observabilidad operativa de los fallbacks del coach.
 *
 * Contexto del incidente 2026-06-22: el saldo de OpenRouter se agotó entre
 * el 19-jun y el 22-jun. Hoy 22-jun el 91.3% de respuestas asistente fueron
 * el fallback genérico ("Vamos a hacerlo simple..."). 4 usuarios reales —
 * incluyendo una persona expresando duelo profundo en alemán — recibieron
 * la misma frase scripted en español. Nadie se enteró hasta que Mario
 * reportó el bug en chat.
 *
 * Este módulo añade:
 *   - logFallback(reason): registra un fallback con tag "AI_FALLBACK"
 *   - getFallbackStats(windowMin): consulta SystemLog para health checks
 *   - maybeAlertHighFallback(reason): notifyAdmin Telegram con dedup
 *
 * Patrón: fire-and-forget desde los puntos donde se devuelve fallback en
 * ai.ts. Nunca bloquea la respuesta al usuario.
 */

import { getPrismaClient } from "@/db/prisma";
import { notifyAdmin } from "@/services/telegram";
import { logInfo, logError, logWarn } from "@/lib/logger";

const FALLBACK_TAG = "AI_FALLBACK";
const ALERT_TAG = "AI_FALLBACK_ALERT";

// Configurables vía env. Defaults pensados para detectar caída de OpenRouter
// (saldo, 5xx, rate limit) sin falsos positivos por errores aislados.
const ALERT_THRESHOLD = Number(process.env.LLM_FALLBACK_ALERT_THRESHOLD ?? 5);
const ALERT_WINDOW_MIN = Number(process.env.LLM_FALLBACK_ALERT_WINDOW_MIN ?? 10);
const DEDUP_WINDOW_MIN = Number(process.env.LLM_FALLBACK_ALERT_DEDUP_MIN ?? 30);

type FallbackReason =
  | "no_api_key"
  | "openrouter_402"
  | "openrouter_http_error"
  | "fetch_error"
  | "empty_response"
  | "stream_error"
  | "unknown";

export type FallbackStats = {
  windowMin: number;
  fallbacks: number;
  byReason: Record<string, number>;
  lastFallbackAt: Date | null;
};

/**
 * Registra un fallback en SystemLog y dispara alerta si el umbral se cumple.
 * Llamar desde los puntos en ai.ts donde se devuelve buildFallbackResponse.
 * Fire-and-forget: no bloquea la respuesta al usuario.
 */
export function recordFallback(reason: FallbackReason, context?: Record<string, unknown>): void {
  // log síncrono ya va a stdout + SystemLog (via lib/logger pipeline).
  logWarn("AI_FALLBACK", "emitted", { reason, ...context });

  // Async fire-and-forget para la alerta.
  void (async () => {
    try {
      const prisma = getPrismaClient();
      // Log dedicado con tag específico para queries futuras (banner /admin,
      // métricas). El logWarn anterior va a tag="AI_FALLBACK" message="emitted",
      // pero el tag de SystemLog viene del nombre del logger ("AI_FALLBACK"
      // como primer arg de logWarn). Así que esto ya queda persistido por la
      // pipeline normal del logger — no duplicamos aquí.
      await maybeAlertHighFallback(reason, prisma);
    } catch (e) {
      logError("LLM_HEALTH", e, { area: "recordFallback" });
    }
  })();
}

/** Lee SystemLog para componer stats. Usado por /admin/health/ai. */
export async function getFallbackStats(windowMin = 60): Promise<FallbackStats> {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - windowMin * 60 * 1000);

  const rows = await prisma.systemLog.findMany({
    where: { tag: FALLBACK_TAG, timestamp: { gte: since } },
    select: { timestamp: true, context: true },
    orderBy: { timestamp: "desc" },
  });

  const byReason: Record<string, number> = {};
  for (const r of rows) {
    const reason = (r.context as { reason?: string } | null)?.reason ?? "unknown";
    byReason[reason] = (byReason[reason] ?? 0) + 1;
  }

  return {
    windowMin,
    fallbacks: rows.length,
    byReason,
    lastFallbackAt: rows[0]?.timestamp ?? null,
  };
}

/**
 * Si el conteo de fallbacks supera el umbral en la ventana, envía alerta
 * a Telegram. Dedup por DEDUP_WINDOW_MIN para no spamear (una alerta cada
 * 30 min como máximo cuando hay outage sostenido).
 */
async function maybeAlertHighFallback(
  reason: FallbackReason,
  prisma: ReturnType<typeof getPrismaClient>,
): Promise<void> {
  const windowSince = new Date(Date.now() - ALERT_WINDOW_MIN * 60 * 1000);
  const fallbacks = await prisma.systemLog.count({
    where: { tag: FALLBACK_TAG, timestamp: { gte: windowSince } },
  });

  if (fallbacks < ALERT_THRESHOLD) return;

  const dedupSince = new Date(Date.now() - DEDUP_WINDOW_MIN * 60 * 1000);
  const recentAlert = await prisma.systemLog.findFirst({
    where: { tag: ALERT_TAG, timestamp: { gte: dedupSince } },
    select: { id: true },
  });
  if (recentAlert) return;

  const reasonLabel: Record<FallbackReason, string> = {
    no_api_key: "Falta OPENROUTER_API_KEY en el container",
    openrouter_402: "OpenRouter devuelve 402 (sin saldo o límite excedido)",
    openrouter_http_error: "OpenRouter HTTP error (5xx, rate limit, etc.)",
    fetch_error: "Error de red al contactar OpenRouter (timeout, DNS, etc.)",
    empty_response: "OpenRouter devolvió respuesta vacía",
    stream_error: "Error durante el streaming SSE",
    unknown: "Causa desconocida (revisar logs)",
  };

  const text =
    `🚨 *LLM Fallback alto*\n\n` +
    `${fallbacks} fallbacks en últimos ${ALERT_WINDOW_MIN} min ` +
    `(umbral: ${ALERT_THRESHOLD}).\n\n` +
    `*Causa probable:* ${reasonLabel[reason]}\n\n` +
    `Si es 402, recarga saldo en openrouter.ai/settings/credits.\n` +
    `Próxima alerta en ≥${DEDUP_WINDOW_MIN} min si sigue.`;

  notifyAdmin(text);

  await prisma.systemLog.create({
    data: {
      level: "warn",
      tag: ALERT_TAG,
      message: `threshold_hit:${fallbacks}`,
      context: { fallbacks, reason, window_min: ALERT_WINDOW_MIN, threshold: ALERT_THRESHOLD },
    },
  });

  logInfo("LLM_HEALTH", "fallback_alert_sent", { fallbacks, reason });
}
