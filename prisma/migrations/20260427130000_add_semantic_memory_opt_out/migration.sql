-- Per-user opt-out for semantic memory (PR3 of the semantic-memory rollout).
-- Default false → memoria activa para usuarios autenticados que no la rechacen.
-- Cuando TRUE, phases/context.ts → loadSemanticEchoes corta el retrieve para
-- ese userId aunque la feature esté activa globalmente.

ALTER TABLE "UserPreferences"
  ADD COLUMN "semanticMemoryOptOut" BOOLEAN NOT NULL DEFAULT false;
