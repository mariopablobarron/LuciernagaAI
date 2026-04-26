-- Semantic memory: pgvector-backed store of embeddings for curated journal
-- material (daily logs, conversation summaries). The chat pipeline retrieves
-- top-K hits in Phase 4 (Context) to surface longitudinal patterns without
-- bloating the prompt with raw history.
--
-- We embed only DISTILLED sources (DailyLog, Conversation.summarySoFar),
-- never raw messages — keeps cost low and signal high. Crisis-flagged
-- content is filtered out at write time.
--
-- The `embedding` column uses pgvector. Queries are raw SQL because
-- Prisma's `Unsupported("vector(1536)")` mapping cannot be selected/ordered
-- through the typed client. The table is intentionally NOT mirrored in
-- schema.prisma — Prisma only manages the migration; reads/writes go
-- through `src/services/semantic-memory.ts` using `$queryRawUnsafe`.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "SemanticMemory" (
  "id"         TEXT        NOT NULL,
  "userId"     TEXT        NOT NULL,
  "source"     TEXT        NOT NULL,
  "sourceId"   TEXT        NOT NULL,
  "content"    TEXT        NOT NULL,
  "embedding"  vector(1536) NOT NULL,
  "metadata"   JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SemanticMemory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SemanticMemory_source_sourceId_key"
  ON "SemanticMemory" ("source", "sourceId");

CREATE INDEX "SemanticMemory_userId_source_idx"
  ON "SemanticMemory" ("userId", "source");

CREATE INDEX "SemanticMemory_userId_createdAt_idx"
  ON "SemanticMemory" ("userId", "createdAt");

-- IVFFlat ANN index for cosine similarity. `lists=100` is a sane default
-- for tens of thousands of rows; tune upward if the table grows past ~1M.
CREATE INDEX "SemanticMemory_embedding_cosine_idx"
  ON "SemanticMemory"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE "SemanticMemory"
  ADD CONSTRAINT "SemanticMemory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
