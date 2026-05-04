/**
 * Resumen progresivo de conversaciones largas (LangChain SummaryBufferMemory
 * pattern adaptado).
 *
 * Problema: el sistema actual carga al system prompt los últimos 16 mensajes
 * de la conversación. Cuando una usuaria llega al turno 50, los 34 turnos
 * más antiguos desaparecen del contexto — incluyendo nombres mencionados,
 * decisiones tomadas y arcos emocionales que el mentor debería recordar.
 *
 * Solución: cada vez que una conversación crece más allá de WINDOW_SIZE,
 * los mensajes que se salen de la ventana se condensan en `summarySoFar`
 * (2-3 frases). El system prompt recibe:
 *   - el resumen acumulado (si existe)
 *   - los últimos WINDOW_SIZE mensajes literales
 *
 * Coste: 1 llamada Haiku ~150 tokens cada vez que la ventana avanza.
 * Para una conversación de 100 turnos = ~10 llamadas → céntimos.
 */

import { logError, logInfo } from "@/lib/logger";
import { getOpenRouterChatUrl, getOpenRouterHeaders, getOpenRouterModel } from "@/lib/openrouter";
import { getPrismaClient } from "@/db/prisma";
import { listMessagesForConversation } from "@/services/conversation";

const OPENROUTER_MODEL = getOpenRouterModel("anthropic/claude-haiku-4-5");
const REQUEST_TIMEOUT_MS = 15_000;

/** Total de mensajes que dejamos literales al final del histórico. */
export const VERBATIM_WINDOW_SIZE = 16;
/** Mínimo de mensajes para activar el summarizer (sin esto no merece la pena). */
export const SUMMARIZE_THRESHOLD = 22;
/** Cantidad de mensajes nuevos que deben acumularse antes de re-resumir. */
export const RE_SUMMARIZE_DELTA = 8;

const SYSTEM_PROMPT = `Eres un asistente que destila conversaciones de mentoría emocional para alimentar la memoria del mentor.

Tu único trabajo: dadas (a) un resumen previo de la conversación y (b) mensajes nuevos que se salen de la ventana visible, devuelve UN nuevo resumen actualizado de 2-4 frases que capture:
- Quiénes son las personas/entidades mencionadas (nombre, rol: pareja, jefa, hija…) — clave para que el mentor no olvide a quién se refiere "ella" o "él" turnos después
- Decisiones, compromisos o acciones acordadas
- Patrón emocional o estado dominante observado
- Eventos críticos (rupturas, despidos, hitos)

Reglas:
- 2-4 frases, sin listas con bullets, sin labels.
- Tono neutral descriptivo (no replica el tono del mentor).
- En castellano.
- NO inventes datos que no aparezcan en los mensajes.
- Si los mensajes nuevos no aportan nada relevante respecto al resumen previo, devuelve el resumen previo sin cambios.
- Si NO hay resumen previo, condensa solo los mensajes nuevos.`;

type ChatTurn = { role: "user" | "assistant"; content: string };

function buildUserPrompt(previousSummary: string | null, newTurns: ChatTurn[]): string {
  const lines: string[] = [];
  lines.push(previousSummary ? `Resumen previo:\n${previousSummary}` : "Sin resumen previo.");
  lines.push("");
  lines.push("Mensajes nuevos a integrar:");
  for (const turn of newTurns) {
    lines.push(`[${turn.role}] ${turn.content}`);
  }
  lines.push("");
  lines.push("Devuelve únicamente el nuevo resumen actualizado (sin meta-comentarios).");
  return lines.join("\n");
}

async function callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(getOpenRouterChatUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        ...getOpenRouterHeaders(apiKey, { feature: "conversation_summary" }),
        "HTTP-Referer": process.env.APP_BASE_URL ?? "http://localhost:3000",
        "X-Title": "mentor-web",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 220,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) throw new Error("OpenRouter empty reply");
    return reply;
  } finally {
    clearTimeout(timeout);
  }
}

export type SummarizeInput = {
  previousSummary: string | null;
  newTurns: ChatTurn[];
  callLLM?: (system: string, user: string) => Promise<string>;
};

/**
 * Genera (o actualiza) el resumen acumulado. Devuelve null si no hay
 * mensajes nuevos a procesar (el caller decide si conserva el previo).
 */
export async function generateConversationSummary(input: SummarizeInput): Promise<string | null> {
  if (input.newTurns.length === 0) return input.previousSummary;
  const callLLM = input.callLLM ?? callOpenRouter;
  try {
    const reply = await callLLM(
      SYSTEM_PROMPT,
      buildUserPrompt(input.previousSummary, input.newTurns)
    );
    if (!reply || reply.length < 20) {
      // Demasiado corto o vacío: probablemente el LLM falló silenciosamente.
      // Mejor mantener el resumen previo que perderlo.
      return input.previousSummary;
    }
    logInfo("CONV_SUMMARY", "summary_generated", {
      previousLength: input.previousSummary?.length ?? 0,
      newTurnsCount: input.newTurns.length,
      newSummaryLength: reply.length,
    });
    return reply;
  } catch (error) {
    logError("CONV_SUMMARY", error, { newTurnsCount: input.newTurns.length });
    return input.previousSummary;
  }
}

// ─── Orchestrator usado desde enrich.ts ─────────────────────────────────────

export type ConversationContextForLLM = {
  /** Resumen acumulado (null si la conversación es corta o no se pudo generar). */
  summarySoFar: string | null;
  /** Últimos VERBATIM_WINDOW_SIZE mensajes (sin contar el turno actual del usuario). */
  recentHistory: ChatTurn[];
};

/**
 * Carga el histórico de mensajes y, si la conversación lo merece, actualiza
 * el resumen progresivo en BD. Devuelve {summarySoFar, recentHistory} listos
 * para inyectar en el coach context.
 *
 * Idempotente: re-llamarse en el mismo turno no genera coste extra (compara
 * summarizedUpToMessageId antes de re-resumir).
 */
export async function loadHistoryWithProgressiveSummary({
  userId,
  conversationId,
}: {
  userId: string;
  conversationId: string;
}): Promise<ConversationContextForLLM> {
  const prisma = getPrismaClient();

  const [conversation, allMessages] = await Promise.all([
    prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true, summarySoFar: true, summarizedUpToMessageId: true },
    }),
    listMessagesForConversation({ userId, conversationId }),
  ]);

  if (!conversation || !allMessages || allMessages.length <= 1) {
    return { summarySoFar: null, recentHistory: [] };
  }

  // Excluir el último turno del usuario (es el message in-flight, lo
  // procesa el LLM principal en el turno actual).
  const past = allMessages.slice(0, -1);

  // Si la conversación es corta, no merece resumir. Devolver hasta 16
  // mensajes literales sin tocar BD.
  if (past.length < SUMMARIZE_THRESHOLD) {
    return {
      summarySoFar: conversation.summarySoFar ?? null,
      recentHistory: past
        .slice(-VERBATIM_WINDOW_SIZE)
        .map((m) => ({ role: m.role as ChatTurn["role"], content: m.content })),
    };
  }

  // Mensajes que SE QUEDARÁN literales (los últimos 16).
  const verbatimSlice = past.slice(-VERBATIM_WINDOW_SIZE);
  // Mensajes que estarían fuera de la ventana → candidatos a resumir.
  const outOfWindow = past.slice(0, past.length - VERBATIM_WINDOW_SIZE);

  // Solo resumir el delta nuevo (los que aún no estén cubiertos por
  // summarizedUpToMessageId).
  let firstNewIndex = 0;
  if (conversation.summarizedUpToMessageId) {
    const idx = outOfWindow.findIndex((m) => m.id === conversation.summarizedUpToMessageId);
    firstNewIndex = idx >= 0 ? idx + 1 : 0;
  }
  const newToSummarize = outOfWindow.slice(firstNewIndex);

  // Si el delta es pequeño, no merece la llamada LLM. Mantener resumen
  // previo + ventana literal.
  if (newToSummarize.length < RE_SUMMARIZE_DELTA) {
    return {
      summarySoFar: conversation.summarySoFar ?? null,
      recentHistory: verbatimSlice.map((m) => ({
        role: m.role as ChatTurn["role"],
        content: m.content,
      })),
    };
  }

  // Llamada LLM real para actualizar el resumen.
  const newTurns: ChatTurn[] = newToSummarize.map((m) => ({
    role: m.role as ChatTurn["role"],
    content: m.content,
  }));
  const updatedSummary = await generateConversationSummary({
    previousSummary: conversation.summarySoFar ?? null,
    newTurns,
  });

  if (updatedSummary && updatedSummary !== conversation.summarySoFar) {
    try {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          summarySoFar: updatedSummary,
          summarizedUpToMessageId: outOfWindow[outOfWindow.length - 1]!.id,
        },
      });
    } catch (error) {
      logError("CONV_SUMMARY", error, { step: "persist", conversationId });
    }
  }

  return {
    summarySoFar: updatedSummary ?? null,
    recentHistory: verbatimSlice.map((m) => ({
      role: m.role as ChatTurn["role"],
      content: m.content,
    })),
  };
}
