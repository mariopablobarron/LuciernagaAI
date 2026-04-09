/**
 * Bridge between the Personal Project system and the Coach prompt builder.
 *
 * This file is the SINGLE integration point. It:
 * 1. Reads the user's active project context
 * 2. Formats it as a prompt block
 * 3. Returns a string to be injected into CoachContext
 *
 * It does NOT modify coach.ts, processMessage.ts, or ai.ts.
 * The existing system calls this optionally.
 */

import { getProjectCoachContext } from "@/services/projects";
import type { ProjectCoachContext, ProjectPhase } from "@/domain/projects/types";
import { logError } from "@/lib/logger";

const PROJECT_PHASE_GUIDANCE: Record<ProjectPhase, string> = {
  feel: `El usuario esta en fase SENTIR. Ayuda a nombrar con precision. Pregunta por lo normalizado. NO propongas soluciones.`,

  imagine: `El usuario esta en fase IMAGINAR. Amplia vision. Cuestiona focos elegidos. Confronta pensamiento limitante.`,

  act: `El usuario esta en fase ACTUAR. Empuja ejecucion HOY. Confronta evitacion. Conecta accion con porque.`,

  reflect: `El usuario esta en fase REFLEXIONAR. Extrae aprendizaje profundo. Que cambio EN EL. Si descubre algo nuevo, sugiere volver a SENTIR.`,
};

/**
 * Builds the project context block for the system prompt.
 * Returns null if the user has no active project.
 */
export async function buildProjectPromptBlock(
  userId: string,
): Promise<string | null> {
  let context: ProjectCoachContext | null;

  try {
    context = await getProjectCoachContext(userId);
  } catch (error: unknown) {
    logError("PROJECT", error, { userId, action: "build_project_prompt_block" });
    return null;
  }

  if (!context) return null;

  const phaseGuidance = PROJECT_PHASE_GUIDANCE[context.currentPhase] ?? "";

  const focusAreasLine =
    context.focusAreas.length > 0
      ? `- Focos de accion: ${context.focusAreas.join(", ")}`
      : "- Sin focos de accion definidos todavia.";

  const stepsLine =
    context.totalSteps > 0
      ? `- Progreso en pasos: ${context.completedSteps}/${context.totalSteps} completados`
      : "- Sin pasos definidos todavia.";

  const lastReflectionLine = context.lastReflection
    ? `- Ultima reflexion (fase ${context.lastReflection.phase}): "${context.lastReflection.content.slice(0, 300)}"`
    : "- Sin reflexiones todavia.";

  const insightsLine =
    context.pendingInsights > 0
      ? `- Insights pendientes por reconocer: ${context.pendingInsights}`
      : "";

  return `Proyecto personal activo:
- Proyecto: ${context.activeProject}
- Fase: ${context.currentPhase}
- Dias activo: ${context.daysActive}
${focusAreasLine}
${stepsLine}
${lastReflectionLine}
${insightsLine}

${phaseGuidance}

Reglas obligatorias del proyecto:
- Si el usuario menciona su proyecto, conecta con la fase actual y los focos definidos.
- No repitas preguntas que ya respondio — profundiza en lo que descubrio.
- Si hay insights pendientes, integralos naturalmente en la conversacion.
- Confronta con respeto: si evita, nombra la evitacion. Si minimiza, pregunta que hay debajo.
- Si esta en ACTUAR y no ha ejecutado, empuja. La planificacion infinita es evitacion.`;
}
