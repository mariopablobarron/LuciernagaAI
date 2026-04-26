/**
 * Fase 1.5 — History-aware reformulation.
 *
 * Cuando el usuario manda un mensaje corto o ambiguo (referencias tipo "eso",
 * "lo que dijiste antes", "y por qué"), pedimos al LLM que reescriba el mensaje
 * en una versión autocontenida usando el historial. Esa versión se mete como
 * contexto adicional en el system prompt — NO sustituye al mensaje original
 * que ve el usuario ni el que se persiste.
 *
 * Idea inspirada en `create_history_aware_retriever` de LangChain (estándar
 * RAG conversacional). Adaptada para mentor-web: aquí no hay retrieval sobre
 * documentos, pero sí mejora la calidad de respuesta cuando el LLM tiene que
 * resolver pronombres referenciales.
 *
 * Para minimizar coste: solo se invoca si el mensaje "huele" a ambiguo.
 */

import { logError, logInfo } from "@/lib/logger";

const REFORMULATION_MODEL =
  process.env.OPENROUTER_REFORMULATION_MODEL?.trim() ||
  "google/gemini-2.5-flash-lite";

const SYSTEM_PROMPT =
  "Reformula el mensaje del usuario en una versión autocontenida usando el historial. " +
  "NO respondas a la pregunta. NO añadas explicación. Devuelve SOLO la versión reformulada en español, " +
  "manteniendo el tono y la intención originales. Si el mensaje ya es autocontenido, devuélvelo tal cual.";

const AMBIGUOUS_TOKENS = [
  "eso",
  "esto",
  "esa",
  "esas",
  "ese",
  "esos",
  "lo que",
  "ahí",
  "allí",
  "y por qué",
  "y eso",
  "y entonces",
  "como te dije",
  "como dije",
  "lo de",
  "lo del",
  "antes",
  "ayer",
  "anteayer",
];

/**
 * Decide si vale la pena pagar un round-trip al LLM para reformular.
 * Heurísticas conservadoras: solo cuando hay clara sospecha de ambigüedad
 * y hay historial que la pueda resolver.
 */
function shouldReformulate(message: string, historyTurns: number): boolean {
  if (historyTurns < 2) return false;
  const trimmed = message.trim();
  if (trimmed.length === 0) return false;
  // Mensajes largos (>120 caracteres) ya suelen ser autocontenidos.
  if (trimmed.length > 120) return false;
  const lower = trimmed.toLowerCase();
  return AMBIGUOUS_TOKENS.some((token) => lower.includes(token));
}

type HistoryEntry = { role: "user" | "assistant"; content: string };

export type ReformulationResult = {
  reformulated: boolean;
  standalone: string | null;
  reason: "no_history" | "looks_explicit" | "skipped_short" | "llm_failed" | "unchanged" | "rewritten";
};

export async function reformulateMessage(input: {
  message: string;
  history: HistoryEntry[];
  userId: string;
}): Promise<ReformulationResult> {
  const { message, history, userId } = input;

  if (!shouldReformulate(message, history.length)) {
    return {
      reformulated: false,
      standalone: null,
      reason: history.length < 2 ? "no_history" : "looks_explicit",
    };
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return { reformulated: false, standalone: null, reason: "skipped_short" };

  try {
    // Solo nos llevamos los últimos 6 turnos (3 user + 3 assistant) — más
    // que suficiente para resolver pronombres y barato en tokens.
    const recentHistory = history.slice(-6).map((h) => ({
      role: h.role,
      content: h.content.length > 400 ? `${h.content.slice(0, 400)}…` : h.content,
    }));

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: REFORMULATION_MODEL,
        max_tokens: 120,
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...recentHistory.map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
          { role: "user", content: `[Mensaje a reformular]: ${message}` },
        ],
      }),
    });

    if (!res.ok) {
      logError("CHAT_REFORMULATE", new Error(`HTTP ${res.status}`), { userId });
      return { reformulated: false, standalone: null, reason: "llm_failed" };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const standalone = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!standalone) return { reformulated: false, standalone: null, reason: "llm_failed" };

    // Si la reformulación es básicamente el mismo mensaje (cambio menor),
    // no merece la pena meterlo como ruido en el system prompt.
    const original = message.trim();
    if (standalone.length < original.length + 5 && standalone.toLowerCase().startsWith(original.toLowerCase().slice(0, Math.min(20, original.length)))) {
      return { reformulated: false, standalone: null, reason: "unchanged" };
    }

    logInfo("CHAT_REFORMULATE", "rewritten", {
      userId,
      originalLen: original.length,
      standaloneLen: standalone.length,
    });
    return { reformulated: true, standalone, reason: "rewritten" };
  } catch (err) {
    logError("CHAT_REFORMULATE", err, { userId });
    return { reformulated: false, standalone: null, reason: "llm_failed" };
  }
}
