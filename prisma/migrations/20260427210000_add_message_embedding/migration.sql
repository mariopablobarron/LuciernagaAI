-- Añade embedding semántico a Message (sin pgvector — array nativo de Postgres).
-- Búsqueda por coseno se calcula en aplicación, no en SQL. Decisión consciente:
-- evitar dependencias de extensiones Postgres (lección 2026-04-26: pgvector
-- tumbó la web entera con P3009).

ALTER TABLE "Message"
  ADD COLUMN "embedding" double precision[] NOT NULL DEFAULT ARRAY[]::double precision[],
  ADD COLUMN "embeddedAt" TIMESTAMP(3);

-- Índice parcial para que el cron sólo escanee mensajes pendientes de embed.
CREATE INDEX "Message_embeddedAt_pending_idx"
  ON "Message" ("createdAt")
  WHERE "embeddedAt" IS NULL;
