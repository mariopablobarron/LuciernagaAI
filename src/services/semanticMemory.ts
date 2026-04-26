/**
 * Búsqueda semántica sobre mensajes históricos del usuario.
 *
 * Sin pgvector: leemos los embeddings de un batch reciente del usuario y
 * calculamos coseno en memoria. Para volumen actual (<10k msgs/usuario) es
 * sub-100ms. Cuando crezca, migrar a un vector store dedicado.
 */

import { getPrismaClient } from "@/db/prisma";
import {
  cosineSimilarity,
  embedOne,
  isEmbeddingsEnabled,
  prepareForEmbed,
  shouldEmbed,
} from "@/lib/embeddings";
import { logError, logInfo } from "@/lib/logger";

export type SimilarMessage = {
  id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
  score: number;
};

const SCAN_LIMIT = 500; // últimos N mensajes del usuario que escaneamos
const MIN_SCORE = 0.55; // umbral mínimo para considerar relevante
const EXCLUDE_RECENT_MS = 5 * 60_000; // ignora últimos 5 min (ya están en el contexto vivo)

export type FindSimilarOptions = {
  topK?: number;
  excludeConversationId?: string;
};

/**
 * Devuelve los `topK` mensajes más similares al texto dado entre los últimos
 * `SCAN_LIMIT` mensajes del usuario que ya tienen embedding.
 *
 * Si no hay OPENAI_API_KEY o el texto es trivial, devuelve [].
 * Nunca lanza — degrada silencioso (la conversación debe seguir).
 */
export async function findSimilarMessages(
  userId: string,
  text: string,
  options: FindSimilarOptions = {},
): Promise<SimilarMessage[]> {
  const { topK = 3, excludeConversationId } = options;

  if (!isEmbeddingsEnabled()) return [];
  if (!shouldEmbed(text)) return [];

  try {
    const queryVec = await embedOne(prepareForEmbed(text));
    if (queryVec.length === 0) return [];

    const prisma = getPrismaClient();
    const cutoff = new Date(Date.now() - EXCLUDE_RECENT_MS);

    const rows = await prisma.message.findMany({
      where: {
        userId,
        embeddedAt: { not: null },
        createdAt: { lt: cutoff },
        ...(excludeConversationId ? { conversationId: { not: excludeConversationId } } : {}),
      },
      select: {
        id: true,
        content: true,
        role: true,
        createdAt: true,
        embedding: true,
      },
      orderBy: { createdAt: "desc" },
      take: SCAN_LIMIT,
    });

    if (rows.length === 0) return [];

    const scored: SimilarMessage[] = [];
    for (const row of rows) {
      if (!row.embedding || row.embedding.length === 0) continue;
      const score = cosineSimilarity(queryVec, row.embedding);
      if (score < MIN_SCORE) continue;
      scored.push({
        id: row.id,
        content: row.content,
        role: row.role === "assistant" ? "assistant" : "user",
        createdAt: row.createdAt,
        score,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, topK);

    logInfo("SEMANTIC_MEMORY", "search", {
      userId,
      scanned: rows.length,
      matched: scored.length,
      returned: top.length,
      topScore: top[0]?.score ?? 0,
    });

    return top;
  } catch (error) {
    logError("SEMANTIC_MEMORY", error, { userId, op: "findSimilar" });
    return [];
  }
}
