export type Intent =
  | "greeting"
  | "problem"
  | "doubt"
  | "action_done"
  | "postpone"
  | "refusal"
  | "goal_creation"
  | "clarification";

function normalizeText(message: string): string {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesAny(message: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(message));
}

const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  greeting: [/\b(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|que tal)\b/],
  problem: [
    /\b(tengo un problema|me pasa|me esta pasando|estoy mal|no puedo|me cuesta|me bloqueo|me siento mal)\b/,
  ],
  doubt: [/\b(no se|no se que|no tengo claro|dudo|tengo dudas|no estoy seguro|incertidumbre)\b/],
  action_done: [
    /\b(ya lo hice|hecho|ya esta|completado|termine|terminado|avance|avance hecho|lo logre)\b/,
  ],
  postpone: [/\b(luego|despues|manana|mas tarde|no hoy|lo hare luego|lo dejo para)\b/],
  refusal: [/\b(no quiero|no voy a|me niego|paso|no lo hare|no quiero hacerlo)\b/],
  goal_creation: [
    /\b(mi objetivo|quiero lograr|quiero conseguir|meta|objetivo|quiero empezar|quiero construir)\b/,
  ],
  clarification: [/\b(explica|aclara|a que te refieres|como asi|que quieres decir|no entendi)\b/],
};

const INTENT_PRIORITY: Intent[] = [
  "action_done",
  "refusal",
  "postpone",
  "goal_creation",
  "doubt",
  "problem",
  "clarification",
  "greeting",
];

export function detectIntent(message: string): Intent {
  const normalized = normalizeText(message);

  for (const intent of INTENT_PRIORITY) {
    if (matchesAny(normalized, INTENT_PATTERNS[intent])) {
      return intent;
    }
  }

  return "clarification";
}
