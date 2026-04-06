/**
 * Bridge between the Journey system and the Coach prompt builder.
 *
 * This file is the SINGLE integration point. It:
 * 1. Reads the user's active journey context
 * 2. Formats it as a prompt block
 * 3. Returns a string to be injected into CoachContext
 *
 * It does NOT modify coach.ts, processMessage.ts, or ai.ts.
 * The existing system calls this optionally.
 */

import { getJourneyCoachContext } from "@/services/journeys";
import type { JourneyCoachContext } from "@/domain/journeys/types";
import { logError } from "@/lib/logger";

const JOURNEY_PHASE_GUIDANCE: Record<string, string> = {
  autoconocimiento: `El usuario está en fase de Autoconocimiento.
- Prioriza preguntas que le ayuden a identificar patrones, emociones y creencias.
- No empujes acción ejecutiva todavía — el foco es comprensión.
- Usa reflejo y reformulación como herramientas principales.
- Si menciona un ejercicio del itinerario, ayúdale a profundizar en lo que descubrió.`,

  gestion_emocional: `El usuario está en fase de Gestión Emocional.
- Prioriza herramientas prácticas de regulación.
- Si detectas ansiedad o desborde, ofrece una técnica concreta (respiración, anclaje, pausa).
- Conecta lo que siente con lo que aprendió en autoconocimiento.
- Si menciona un ejercicio del itinerario, valida el progreso y profundiza.`,

  proposito: `El usuario está en fase de Propósito y Dirección.
- Prioriza claridad sobre valores, motivaciones y sentido.
- Ayuda a conectar acciones con identidad ("¿esto va contigo?").
- No fuerces decisiones prematuras — acompaña la exploración.
- Si el usuario tiene un ejercicio de propósito reciente, referéncialo.`,

  accion: `El usuario está en fase de Acción y Seguimiento.
- Máxima orientación a ejecución.
- Conecta cada acción con el propósito definido en fases anteriores.
- Si hay ejercicios completados, usa las reflexiones como contexto.
- Confronta evasión con firmeza pero conectando con lo que ya descubrió de sí mismo.`,
};

/**
 * Builds the journey context block for the system prompt.
 * Returns null if the user has no active journey.
 */
export async function buildJourneyPromptBlock(
  userId: string,
): Promise<string | null> {
  let context: JourneyCoachContext | null;

  try {
    context = await getJourneyCoachContext(userId);
  } catch (error: unknown) {
    logError("JOURNEY", error, { userId, action: "build_journey_prompt_block" });
    return null;
  }

  if (!context) return null;

  const phaseGuidance =
    JOURNEY_PHASE_GUIDANCE[context.currentPhase] ?? "";

  const lastExerciseLine = context.lastExercise
    ? `- Último ejercicio completado: "${context.lastExercise.title}" (${context.lastExercise.type}).${
        context.lastExercise.reflection
          ? `\n  Reflexión del usuario: "${context.lastExercise.reflection.slice(0, 300)}"`
          : ""
      }`
    : "- No ha completado ejercicios todavía.";

  const nextExerciseLine = context.nextExercise
    ? `- Siguiente ejercicio sugerido: "${context.nextExercise.title}" (${context.nextExercise.type}).`
    : "- Ha completado todos los ejercicios del módulo actual.";

  return `Itinerario de desarrollo activo:
- Itinerario: ${context.activeJourney}
- Fase: ${context.currentPhase}
- Módulo actual: ${context.currentModule}
- Progreso general: ${context.progress}%
- Ejercicios completados: ${context.exercisesCompletedTotal}
${lastExerciseLine}
${nextExerciseLine}

${phaseGuidance}

Reglas obligatorias del itinerario:
- Si el usuario menciona un ejercicio que acaba de hacer, haz debrief: pregunta qué descubrió, qué le sorprendió, qué haría diferente.
- No repitas el contenido del ejercicio — profundiza en la reflexión.
- Conecta lo que dice con el contexto del itinerario y su fase actual.
- Si no menciona el itinerario, sigue con la conversación normal pero calibra tu tono según la fase.`;
}

/**
 * Generates an AI debrief for a completed exercise.
 * Called after the user completes an exercise, stored in UserExercise.aiDebrief.
 */
export function buildExerciseDebriefPrompt(params: {
  exerciseTitle: string;
  exerciseType: string;
  exerciseDebrief: string | null;
  userReflection: string | null;
  userResponses: Array<{ stepIndex: number; answer: string | number }> | null;
  userPhase: string;
}): string {
  const responseSummary = params.userResponses
    ?.map((r) => `Paso ${r.stepIndex + 1}: ${r.answer}`)
    .join("\n") ?? "Sin respuestas registradas";

  return `Acabas de completar un ejercicio del itinerario. Haz un debrief breve y útil.

Ejercicio: "${params.exerciseTitle}" (tipo: ${params.exerciseType})
Fase actual del usuario: ${params.userPhase}
${params.exerciseDebrief ? `Guía de debrief: ${params.exerciseDebrief}` : ""}

Respuestas del usuario:
${responseSummary}

${params.userReflection ? `Reflexión libre del usuario: "${params.userReflection}"` : "El usuario no dejó reflexión libre."}

Reglas del debrief:
1. Máximo 4 oraciones.
2. Nombra UN patrón o descubrimiento que ves en sus respuestas.
3. Conecta con su fase actual del itinerario.
4. Cierra con una pregunta que invite a profundizar.
5. NO repitas lo que ya dijo — interpreta y devuelve claridad.`;
}
