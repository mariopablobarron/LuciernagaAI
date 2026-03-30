-- AlterTable
ALTER TABLE "UserState"
ADD COLUMN IF NOT EXISTS "primaryEmotion" TEXT NOT NULL DEFAULT 'calma',
ADD COLUMN IF NOT EXISTS "dominantPattern" TEXT NOT NULL DEFAULT 'evita_decidir',
ADD COLUMN IF NOT EXISTS "focusArea" TEXT NOT NULL DEFAULT 'propósito',
ADD COLUMN IF NOT EXISTS "energyLevel" TEXT NOT NULL DEFAULT 'medio',
ADD COLUMN IF NOT EXISTS "riskLevel" TEXT NOT NULL DEFAULT 'low',
ADD COLUMN IF NOT EXISTS "progressTrend" TEXT NOT NULL DEFAULT 'igual';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserState_primaryEmotion_dominantPattern_updatedAt_idx"
ON "UserState"("primaryEmotion", "dominantPattern", "updatedAt");
