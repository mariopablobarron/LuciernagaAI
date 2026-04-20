-- Activation audit fields on User
-- Aditiva, segura: todas las columnas son NULL y los índices no bloquean escritura.
-- Populate retroactively via /api/cron/backfill-activation.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "firstMessageSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "activatedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_activatedAt_idx"         ON "User" ("activatedAt");
CREATE INDEX IF NOT EXISTS "User_firstMessageSentAt_idx"  ON "User" ("firstMessageSentAt");
