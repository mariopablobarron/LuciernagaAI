-- Adds User.onboardingContext (JSON) to persist the { feeling, timeframe, intent }
-- payload captured by /app/inicio. Used by /api/onboarding and the proactive
-- prompt pipeline to inject onboarding context in the first mentor turns.
-- Idempotent via IF NOT EXISTS so the migration is safe to re-run.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "onboardingContext" JSONB;
