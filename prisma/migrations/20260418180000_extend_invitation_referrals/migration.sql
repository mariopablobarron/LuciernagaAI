-- Extend Invitation model with referral tracking: link to referred user,
-- reason (milestone that earned the invite), and analytics indexes.
-- Idempotent: safe to re-run.

ALTER TABLE "Invitation"
    ADD COLUMN IF NOT EXISTS "reason" TEXT,
    ADD COLUMN IF NOT EXISTS "usedByUserId" TEXT;

-- FK: if a referred user is deleted, keep the invitation row but null the link.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Invitation_usedByUserId_fkey'
    ) THEN
        ALTER TABLE "Invitation"
            ADD CONSTRAINT "Invitation_usedByUserId_fkey"
            FOREIGN KEY ("usedByUserId") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Invitation_createdAt_idx" ON "Invitation"("createdAt");
CREATE INDEX IF NOT EXISTS "Invitation_usedAt_idx" ON "Invitation"("usedAt");
CREATE INDEX IF NOT EXISTS "Invitation_usedByUserId_idx" ON "Invitation"("usedByUserId");
CREATE INDEX IF NOT EXISTS "Invitation_reason_idx" ON "Invitation"("reason");
