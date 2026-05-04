/**
 * Helper centralizado para llamar a OpenRouter, con soporte transparente para
 * Helicone. Si `HELICONE_API_KEY` está configurada, todas las llamadas pasan
 * por su proxy y aparecen en el dashboard de Helicone (cost, latency, prompt
 * inspection). Si no está, se llama directo a OpenRouter — cero diferencia
 * funcional.
 *
 * Uso:
 *   const url = getOpenRouterChatUrl();
 *   const headers = getOpenRouterHeaders(process.env.OPENROUTER_API_KEY!, {
 *     userId,
 *     feature: "main_chat",
 *   });
 *   const res = await fetch(url, { method: "POST", headers, body: ... });
 *
 * Helicone proxy doc: https://docs.helicone.ai/getting-started/integration-method/openrouter
 *
 * Si necesitas desviar las llamadas a un endpoint compatible con OpenRouter
 * (por ejemplo, un proxy de OpenCode o un endpoint interno), configura
 * OPENROUTER_CHAT_URL.
 */

const HELICONE_OPENROUTER_PROXY = "https://openrouter.helicone.ai/api/v1/chat/completions";
const OPENROUTER_DEFAULT_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

export function isHeliconeEnabled(): boolean {
  return Boolean(process.env.HELICONE_API_KEY?.trim());
}

export function getOpenRouterChatUrl(): string {
  const explicitUrl = process.env.OPENROUTER_CHAT_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  return isHeliconeEnabled() ? HELICONE_OPENROUTER_PROXY : OPENROUTER_DEFAULT_CHAT_URL;
}

export function getOpenRouterModel(defaultModel: string): string {
  return process.env.OPENROUTER_MODEL?.trim() || defaultModel;
}

type HeliconeMeta = {
  /// Identificador estable del usuario (cuando exista). Permite ver el coste
  /// por usuario en el dashboard.
  userId?: string;
  /// Nombre de la feature/endpoint que origina la llamada — útil para
  /// segmentar en el dashboard ("main_chat", "weekly_letter", "reframe", …).
  feature?: string;
  /// Caché de respuestas idénticas en el lado de Helicone (segundos).
  /// Útil para llamadas idempotentes; no usar en chat conversacional.
  cacheTtlSeconds?: number;
};

export function getOpenRouterHeaders(
  apiKey: string,
  meta: HeliconeMeta = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (!isHeliconeEnabled()) return headers;

  headers["Helicone-Auth"] = `Bearer ${process.env.HELICONE_API_KEY!.trim()}`;
  if (meta.userId) headers["Helicone-User-Id"] = meta.userId;
  if (meta.feature) headers["Helicone-Property-Feature"] = meta.feature;
  if (meta.cacheTtlSeconds && meta.cacheTtlSeconds > 0) {
    headers["Helicone-Cache-Enabled"] = "true";
    headers["Cache-Control"] = `max-age=${meta.cacheTtlSeconds}`;
  }
  return headers;
}
