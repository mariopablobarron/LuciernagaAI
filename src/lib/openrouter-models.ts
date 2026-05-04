/**
 * Catálogo central de modelos OpenRouter usados por el producto.
 *
 * Antes cada servicio tenía su propio `const OPENROUTER_MODEL = "..."`,
 * lo que convertía cualquier cambio de modelo en 7 PRs paralelos. Ahora
 * cambiar el modelo principal o el fallback es una sola línea aquí.
 *
 * Convención:
 *   - MAIN_CHAT_MODEL: lo que ve el usuario en tiempo real (chat, impulse,
 *     contenido generado para él como avatar scripts y weekly letters).
 *     Calidad > coste.
 *   - BACKGROUND_FAST_MODEL: tareas en background donde la latencia no
 *     se nota y el coste sí (resúmenes de conversación, generación de
 *     pulses semanales en círculos). Coste > calidad.
 *   - MAIN_CHAT_FALLBACK_CHAIN: cadena que OpenRouter intenta en orden
 *     si el modelo primario falla. Siempre empieza por MAIN_CHAT_MODEL,
 *     baja a Haiku (mismo proveedor, más barato) y termina en GPT-4o-mini
 *     (proveedor distinto — sobrevive caídas de Anthropic entero).
 */

export const MAIN_CHAT_MODEL = "anthropic/claude-sonnet-4-6";

export const BACKGROUND_FAST_MODEL = "anthropic/claude-haiku-4-5";

export const MAIN_CHAT_FALLBACK_CHAIN = [
  MAIN_CHAT_MODEL,
  BACKGROUND_FAST_MODEL,
  "openai/gpt-4o-mini",
] as const;

export type OpenRouterModel = string;
