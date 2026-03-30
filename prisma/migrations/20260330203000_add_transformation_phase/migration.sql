ALTER TABLE "UserState"
ADD COLUMN "transformationPhase" TEXT NOT NULL DEFAULT 'bloqueo';

CREATE INDEX "UserState_transformationPhase_updatedAt_idx"
ON "UserState"("transformationPhase", "updatedAt");
