/**
 * Temas trabajables — semilla del "glosario" del panel.
 *
 * Cuando el usuario menciona en el chat un tema psicológico reconocible
 * (empezando por el síndrome del impostor), el mentor recibe:
 *   1. Una guía de cómo trabajarlo (psicoeducación + preguntas potentes).
 *   2. Un ejercicio curado que puede proponer.
 *
 * Diseño (imita a extendedIntents.ts):
 *  - Detección por regex en español, normalización NFD, sin LLM (coste 0).
 *  - La detección NO intercepta el flow ni etiqueta al usuario: solo añade
 *    guidance al system prompt del coach (workable-topic guidance).
 *
 * BARANDILLA IMPORTANTE (AI Act / honestidad relacional):
 *  - Esto es PSICOEDUCACIÓN, no diagnóstico. El "síndrome del impostor" es un
 *    concepto divulgativo, no una categoría clínica. El mentor NUNCA dice
 *    "tienes síndrome del impostor"; ofrece la idea como una hipótesis
 *    ("lo que cuentas suena a lo que muchos llaman…") y siempre con la puerta
 *    abierta a que la persona no se reconozca en ella.
 *  - El material es contenido CURADO y revisable por humanos (hoy en código;
 *    mañana editable desde /admin), no psicoterapia improvisada por el LLM.
 *
 * Este catálogo en código es la forma de dato que migrará a una tabla
 * editable desde el panel (glosario): id, disparadores, guía, ejercicio.
 */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,!¡¿?…;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type WorkableTopicId = "impostor";

export type WorkableTopicExercise = {
  /** Título que el mentor puede nombrar al ofrecerlo. */
  title: string;
  /** Objetivo en una frase — para el mentor, no se recita al usuario. */
  goal: string;
  /** Pasos del ejercicio, en orden. El mentor los conduce conversando. */
  steps: string[];
};

export type WorkableTopic = {
  id: WorkableTopicId;
  /** Etiqueta interna legible. No es una etiqueta clínica. */
  label: string;
  /** Disparadores: si alguno matchea el mensaje normalizado, activa el tema. */
  triggers: RegExp[];
  /** Guía de cómo trabajarlo, inyectada en el system prompt del coach. */
  mentorGuidance: string;
  /** Ejercicio curado asociado. */
  exercise: WorkableTopicExercise;
};

const IMPOSTOR: WorkableTopic = {
  id: "impostor",
  label: "Síndrome del impostor",
  triggers: [
    /\b(sindrome del impostor|me siento un impostor|me siento una impostora|soy un fraude|soy una fraude|me siento un fraude)\b/,
    /\b(me van a (descubrir|pillar|calar)|se van a dar cuenta de que no (valgo|se|doy la talla)|van a ver que no valgo)\b/,
    /\b(no me (lo )?merezco|no merezco (esto|este puesto|estar aqui|el exito)|no me lo he ganado)\b/,
    /\b(solo (tuve|fue|ha sido) suerte|todo (ha sido|fue) suerte|ha sido (pura|toda) suerte|no (fue|es) merito mio|no por merito)\b/,
    /\b(no se como he llegado aqui|no se que hago aqui|no deberia estar aqui|cualquiera podria hacer(lo| mi trabajo))\b/,
    /\b(no soy tan (buen[oa]|valid[oa]) como (creen|piensan)|creen que soy mejor de lo que soy|si supieran (la verdad|lo que|como)\b)/,
    /\b(es cuestion de tiempo que (se den cuenta|lo vean)|tarde o temprano me descubriran)\b/,
  ],
  mentorGuidance: [
    "TEMA DETECTADO: patrón tipo «síndrome del impostor» (concepto divulgativo, NO diagnóstico).",
    "Cómo acompañar:",
    "- NO etiquetes a la persona. No digas «tienes síndrome del impostor». Si nombras el concepto, hazlo como hipótesis y con puerta de salida: «lo que cuentas suena a algo que a muchísima gente capaz le pasa —lo llaman síndrome del impostor—, ¿te resuena o lo ves de otra forma?».",
    "- Normaliza sin minimizar: es frecuente justo en personas competentes; sentirlo no significa que sea cierto.",
    "- Separa el HECHO (logros, dónde está) de la INTERPRETACIÓN («fue suerte», «me descubrirán»). Devuélvele esa distinción.",
    "- Preguntas potentes, no consejos: «¿Qué tendría que pasar para que te creyeras que te lo has ganado?», «Si un amigo te contara esto mismo de sí mismo, ¿qué le dirías?», «¿Qué evidencia estás descartando para sostener que no vales?».",
    "- Si encaja y la persona quiere, PUEDES ofrecerle un ejercicio concreto (abajo). Ofrécelo, no lo impongas; una sola invitación.",
    "- No conviertas esto en diagnóstico ni en promesa terapéutica. Si detectas sufrimiento intenso o bloqueo serio, recuerda con naturalidad que hablar con un profesional puede ayudar.",
  ].join("\n"),
  exercise: {
    title: "El registro de evidencia",
    goal: "Contrastar la narrativa de «no valgo / fue suerte» con hechos concretos, para reatribuir logros a la propia capacidad.",
    steps: [
      "Pídele que recuerde 3 logros o momentos recientes de los que esté, aunque sea un poco, satisfecho.",
      "Para cada uno, que escriba la explicación que se da a sí mismo (¿suerte? ¿ayuda de otros? ¿casualidad? ¿capacidad?).",
      "Para cada logro, que busque UNA prueba concreta de que su capacidad influyó (una decisión que tomó, algo que hizo distinto, una dificultad que resolvió).",
      "Devuélvele el contraste: ¿qué patrón hay en cómo se atribuye lo bueno frente a lo malo?",
      "Cierre: que se quede con una sola frase realista y creíble para sí mismo — ni «soy el mejor» ni «fue suerte», algo intermedio y verdadero.",
    ],
  },
};

export const WORKABLE_TOPICS: Record<WorkableTopicId, WorkableTopic> = {
  impostor: IMPOSTOR,
};

/**
 * Detecta qué temas trabajables aparecen en el mensaje del usuario.
 * Devuelve los ids en orden de catálogo (hoy, como mucho uno).
 */
export function detectWorkableTopics(message: string): WorkableTopicId[] {
  const norm = normalize(message);
  const hits: WorkableTopicId[] = [];
  for (const topic of Object.values(WORKABLE_TOPICS)) {
    if (topic.triggers.some((p) => p.test(norm))) hits.push(topic.id);
  }
  return hits;
}
