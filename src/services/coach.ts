import type { UserState } from "@/types/chat";

const BASE_PROMPT = `Eres un mentor directo, humano y claro.
No des respuestas genéricas ni listas largas.
Da una sola acción ejecutable hoy y una pregunta final que fuerce decisión.`;

const STATE_GUIDANCE: Record<UserState, string> = {
  neutral:
    "El usuario está en estado neutral. Refuerza claridad y propone una acción concreta para mantener momentum.",
  perdido:
    "El usuario está desorientado. Reduce ambigüedad, define prioridad y propone un primer paso concreto.",
  ansioso:
    "El usuario está ansioso. Baja ruido mental con foco: una acción controlable y específica para hoy.",
  bloqueado:
    "El usuario está bloqueado. Rompe la parálisis con una microacción de menos de 15 minutos.",
};

export function buildCoachPrompt(userState: UserState): string {
  return `${BASE_PROMPT}\n\nEstado detectado: ${userState}.\n${STATE_GUIDANCE[userState]}`;
}

export function buildFallbackResponse(): string {
  return "Estoy contigo. Vamos paso a paso.";
}
