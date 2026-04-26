/**
 * Semantic memory store (pgvector) — write/read API.
 *
 * The chat pipeline NEVER writes here directly during a turn. Writes happen
 * out-of-band via `/api/cron/embed-pending-memories`, which scans:
 *   - DailyLog rows without a matching SemanticMemory entry (source="daily_log")
 *   - Conversation.summarySoFar without a matching entry (source="conversation_summary")
 * batches them, requests embeddings from OpenAI, and inserts.
 *
 * Reads happen in Phase 4 (Context) of processMessage — but that wiring
 * lands in PR2; this PR only ships the storage primitives + cron and is
 * inert from the chat's point of view.
 */

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { embedMany, toPgVectorLiteral } from "@/services/embeddings";

export type SemanticSource = "daily_log" | "conversation_summary" | "insight";

export type SemanticHit = {
  id: string;
  source: SemanticSource;
  sourceId: string;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
  createdAt: Date;
};

export type PendingItem = {
  source: SemanticSource;
  sourceId: string;
  userId: string;
  content: string;
  metadata: Record<string, unknown> | null;
};

// ─── Pending-item discovery ─────────────────────────────────────────────────

/**
 * Find DailyLog rows that don't yet have a SemanticMemory entry.
 * Skips rows whose `note` is empty (nothing to embed) and rows flagged
 * as crisis (we don't want a crisis episode resurfacing months later
 * via similarity).
 */
async function listPendingDailyLogs(limit: number): Promise<PendingItem[]> {
  const prisma = getPrismaClient();
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    userId: string;
    note: string | null;
    emotionalState: string | null;
    mood: string | null;
    momentum: number | null;
    logDate: Date;
  }>>`
    SELECT dl."id", dl."userId", dl."note", dl."emotionalState",
           dl."mood", dl."momentum", dl."logDate"
    FROM "DailyLog" dl
    LEFT JOIN "SemanticMemory" sm
      ON sm."source" = 'daily_log' AND sm."sourceId" = dl."id"
    WHERE sm."id" IS NULL
      AND dl."note" IS NOT NULL
      AND length(trim(dl."note")) > 20
      AND COALESCE(dl."emotionalState", '') <> 'crisis'
    ORDER BY dl."createdAt" DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    source: "daily_log" as const,
    sourceId: r.id,
    userId: r.userId,
    content: r.note ?? "",
    metadata: {
      emotionalState: r.emotionalState,
      mood: r.mood,
      momentum: r.momentum,
      logDate: r.logDate.toISOString(),
    },
  }));
}

/**
 * Find Conversation.summarySoFar values that don't yet have a SemanticMemory
 * entry. Anonymous conversations (userId NULL) are skipped — anonymous-first
 * means no longitudinal memory until upgrade.
 */
async function listPendingConversationSummaries(limit: number): Promise<PendingItem[]> {
  const prisma = getPrismaClient();
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    userId: string;
    summary: string;
    updatedAt: Date;
  }>>`
    SELECT c."id", c."userId", c."summarySoFar" AS "summary", c."updatedAt"
    FROM "Conversation" c
    LEFT JOIN "SemanticMemory" sm
      ON sm."source" = 'conversation_summary' AND sm."sourceId" = c."id"
    WHERE sm."id" IS NULL
      AND c."userId" IS NOT NULL
      AND c."summarySoFar" IS NOT NULL
      AND length(trim(c."summarySoFar")) > 20
    ORDER BY c."updatedAt" DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    source: "conversation_summary" as const,
    sourceId: r.id,
    userId: r.userId,
    content: r.summary,
    metadata: {
      conversationUpdatedAt: r.updatedAt.toISOString(),
    },
  }));
}

export async function listPendingMemories(limit = 50): Promise<PendingItem[]> {
  const half = Math.max(1, Math.floor(limit / 2));
  const [logs, summaries] = await Promise.all([
    listPendingDailyLogs(half),
    listPendingConversationSummaries(half),
  ]);
  return [...logs, ...summaries];
}

// ─── Insertion ──────────────────────────────────────────────────────────────

/**
 * Embed and insert a batch of pending items. Returns the count actually
 * persisted (skipping any that fail mid-batch).
 *
 * Idempotent: collisions on (source, sourceId) are silently ignored, so
 * re-running the cron is safe.
 */
export async function embedAndStore(items: PendingItem[]): Promise<number> {
  if (items.length === 0) return 0;

  const vecs = await embedMany(items.map((i) => i.content));
  if (vecs.length !== items.length) {
    throw new Error(
      `embedMany returned ${vecs.length} vectors for ${items.length} items`,
    );
  }

  const prisma = getPrismaClient();
  let inserted = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const vecLiteral = toPgVectorLiteral(vecs[i]);
    const id = randomUUID();
    const metaJson = item.metadata ? JSON.stringify(item.metadata) : null;

    try {
      // ON CONFLICT keeps the cron idempotent if a previous run partially
      // committed before failing.
      await prisma.$executeRaw`
        INSERT INTO "SemanticMemory"
          ("id", "userId", "source", "sourceId", "content", "embedding", "metadata")
        VALUES
          (${id}, ${item.userId}, ${item.source}, ${item.sourceId},
           ${item.content}, ${Prisma.raw(`'${vecLiteral}'::vector`)},
           ${metaJson ? Prisma.raw(`'${metaJson.replace(/'/g, "''")}'::jsonb`) : Prisma.raw("NULL")})
        ON CONFLICT ("source", "sourceId") DO NOTHING
      `;
      inserted++;
    } catch (err) {
      logError("SEMANTIC_MEMORY", err, {
        source: item.source,
        sourceId: item.sourceId,
        userId: item.userId,
      });
    }
  }

  logInfo("SEMANTIC_MEMORY", "batch_inserted", {
    requested: items.length,
    inserted,
  });
  return inserted;
}

// ─── Retrieval (used in PR2 — included now for tests + admin) ───────────────

export type RetrieveOpts = {
  userId: string;
  embedding: number[];
  topK?: number;
  minSimilarity?: number;
  maxAgeDays?: number;
  sources?: SemanticSource[];
};

export async function retrieveSemanticMemory(opts: RetrieveOpts): Promise<SemanticHit[]> {
  const {
    userId,
    embedding,
    topK = 3,
    minSimilarity = 0.78,
    maxAgeDays,
    sources,
  } = opts;

  if (embedding.length === 0) return [];

  const prisma = getPrismaClient();
  const vecLiteral = toPgVectorLiteral(embedding);

  // We compute cosine *distance* via `<=>` (pgvector operator) and convert
  // to similarity = 1 - distance for the threshold check downstream.
  const ageClause = maxAgeDays
    ? Prisma.sql`AND "createdAt" >= NOW() - ${Prisma.raw(`INTERVAL '${maxAgeDays} days'`)}`
    : Prisma.empty;
  const sourceClause = sources && sources.length > 0
    ? Prisma.sql`AND "source" IN (${Prisma.join(sources)})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    source: SemanticSource;
    sourceId: string;
    content: string;
    metadata: Record<string, unknown> | null;
    distance: number;
    createdAt: Date;
  }>>`
    SELECT "id", "source", "sourceId", "content", "metadata",
           "embedding" <=> ${Prisma.raw(`'${vecLiteral}'::vector`)} AS "distance",
           "createdAt"
    FROM "SemanticMemory"
    WHERE "userId" = ${userId}
      ${ageClause}
      ${sourceClause}
    ORDER BY "distance" ASC
    LIMIT ${topK}
  `;

  return rows
    .map((r) => ({
      id: r.id,
      source: r.source,
      sourceId: r.sourceId,
      content: r.content,
      metadata: r.metadata,
      similarity: 1 - Number(r.distance),
      createdAt: r.createdAt,
    }))
    .filter((h) => h.similarity >= minSimilarity);
}
