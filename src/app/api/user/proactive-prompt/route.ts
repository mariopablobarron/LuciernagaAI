import { type NextRequest, NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { getActiveGoalForUser } from "@/services/goals";
import { buildCoachPrompt } from "@/services/coach";
import { generateAIResponse } from "@/services/ai";
import { DEFAULT_EMOTIONAL_PROFILE } from "@/types/emotional-profile";
import {
  buildOnboardingOpeningMessage,
  type OnboardingPayload,
} from "@/lib/onboarding-archetypes";

const PROACTIVE_INSTRUCTION = `
Tu tarea en este turno es generar UNA SOLA pregunta proactiva breve (máximo 2 frases) para iniciar o retomar la conversación.
No respondas al mensaje del usuario. Solo genera la pregunta de apertura.
Basa la pregunta en el contexto disponible: objetivo activo, estado emocional, fase de transformación, patrón dominante.
Si hay una acción pendiente, pregunta por ella directamente.
Si no hay contexto, usa una pregunta de apertura general sobre el estado del día.
Responde SOLO con la pregunta, sin saludos, sin contexto adicional.
`;

// GET /api/user/proactive-prompt
// Returns a context-aware proactive question to start/resume conversation
export async function GET(req: NextRequest) {
  const identity = await resolveIdentity(req);
  const prisma = getPrismaClient();

  try {
    // Primera sesión tras onboarding: si el usuario acaba de completar /app/inicio
    // y aún no ha escrito el primer mensaje, devolvemos el arquetipo fijo (sin LLM).
    const userForOnboarding = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { messageCount: true, onboardingContext: true },
    });
    if (userForOnboarding && userForOnboarding.messageCount === 0 && userForOnboarding.onboardingContext) {
      const ctx = userForOnboarding.onboardingContext as OnboardingPayload | null;
      if (ctx?.feeling && ctx?.intent) {
        return NextResponse.json({ prompt: buildOnboardingOpeningMessage(ctx) });
      }
    }

    // Gather user context
    const [userState, activeGoal] = await Promise.all([
      prisma.userState.findUnique({
        where: { userId: identity.userId },
        select: { state: true, transformationPhase: true },
      }),
      getActiveGoalForUser(identity.userId),
    ]);

    const state = (userState?.state as "neutral" | "duda" | "ansiedad" | "bloqueo" | "claridad") ?? "neutral";
    const pendingAction = activeGoal?.actions.find((a) => !a.completed);

    const coachContext = {
      goal: activeGoal
        ? {
            title: activeGoal.title,
            progress: activeGoal.progress,
            pendingActions: activeGoal.actions.filter((a) => !a.completed).map((a) => a.description),
            activeAction: pendingAction?.description ?? null,
            avoidanceDetected: false,
            avoidanceCount: 0,
            unfinishedActionsCount: activeGoal.totalCount - activeGoal.completedCount,
            confrontationMode: false,
          }
        : null,
      transformation: userState?.transformationPhase
        ? { phase: userState.transformationPhase as "bloqueo", summary: "" }
        : null,
    };

    // Build a short system prompt combining identity + proactive instruction
    const basePrompt = buildCoachPrompt(state, DEFAULT_EMOTIONAL_PROFILE, coachContext);
    const systemPrompt = `${basePrompt}\n\n${PROACTIVE_INSTRUCTION}`;

    // Use a simple trigger message so the AI generates the proactive question
    const triggerMessage = pendingAction
      ? `Contexto: el usuario tiene una acción pendiente: "${pendingAction.description}". Genera la pregunta proactiva.`
      : `Contexto: el usuario está en estado "${state}" sin acción pendiente activa. Genera la pregunta proactiva.`;

    const result = await generateAIResponse(triggerMessage, state, DEFAULT_EMOTIONAL_PROFILE, coachContext);

    return NextResponse.json({ prompt: result.response });
  } catch {
    // Return a safe fallback if anything fails
    const fallbacks = [
      "¿Qué es lo más importante que tienes pendiente hoy?",
      "¿Cómo estás llegando a este momento?",
      "¿Qué avance has tenido desde la última vez?",
      "¿Qué te está frenando ahora mismo?",
    ];
    return NextResponse.json({
      prompt: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    });
  }
}
