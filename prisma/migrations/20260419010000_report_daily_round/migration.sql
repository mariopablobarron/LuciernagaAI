-- Extiende CommunityReport para poder reportar respuestas y espejos de la
-- Ronda Diaria. Idempotente.

ALTER TABLE "CommunityReport"
    ADD COLUMN IF NOT EXISTS "dailyRoundResponseId" TEXT,
    ADD COLUMN IF NOT EXISTS "dailyRoundMirrorId"   TEXT;

CREATE INDEX IF NOT EXISTS "CommunityReport_dailyRoundResponseId_status_idx"
    ON "CommunityReport"("dailyRoundResponseId", "status");
CREATE INDEX IF NOT EXISTS "CommunityReport_dailyRoundMirrorId_status_idx"
    ON "CommunityReport"("dailyRoundMirrorId", "status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CommunityReport_dailyRoundResponseId_fkey'
    ) THEN
        ALTER TABLE "CommunityReport"
            ADD CONSTRAINT "CommunityReport_dailyRoundResponseId_fkey"
            FOREIGN KEY ("dailyRoundResponseId") REFERENCES "DailyRoundResponse"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CommunityReport_dailyRoundMirrorId_fkey'
    ) THEN
        ALTER TABLE "CommunityReport"
            ADD CONSTRAINT "CommunityReport_dailyRoundMirrorId_fkey"
            FOREIGN KEY ("dailyRoundMirrorId") REFERENCES "DailyRoundMirror"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
