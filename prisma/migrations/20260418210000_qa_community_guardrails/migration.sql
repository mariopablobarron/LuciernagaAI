-- Q&A community guardrails: extend CommunityReport to cover anon items,
-- add crisisDetected flag on AnonQuestion, and a "me ayudó" vote table
-- for AnonAnswer. Idempotent (guarded by IF NOT EXISTS / DO blocks).

-- ── CommunityReport: postId nullable + FKs to anon items ──────────────────
ALTER TABLE "CommunityReport"
    ALTER COLUMN "postId" DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS "anonQuestionId" TEXT,
    ADD COLUMN IF NOT EXISTS "anonAnswerId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CommunityReport_anonQuestionId_fkey'
    ) THEN
        ALTER TABLE "CommunityReport"
            ADD CONSTRAINT "CommunityReport_anonQuestionId_fkey"
            FOREIGN KEY ("anonQuestionId") REFERENCES "AnonQuestion"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CommunityReport_anonAnswerId_fkey'
    ) THEN
        ALTER TABLE "CommunityReport"
            ADD CONSTRAINT "CommunityReport_anonAnswerId_fkey"
            FOREIGN KEY ("anonAnswerId") REFERENCES "AnonAnswer"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CommunityReport_anonQuestionId_status_idx"
    ON "CommunityReport"("anonQuestionId", "status");
CREATE INDEX IF NOT EXISTS "CommunityReport_anonAnswerId_status_idx"
    ON "CommunityReport"("anonAnswerId", "status");

-- ── AnonQuestion: crisisDetected + better indexes ─────────────────────────
ALTER TABLE "AnonQuestion"
    ADD COLUMN IF NOT EXISTS "crisisDetected" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "AnonQuestion_crisisDetected_idx" ON "AnonQuestion"("crisisDetected");
CREATE INDEX IF NOT EXISTS "AnonQuestion_targetId_hidden_createdAt_idx"
    ON "AnonQuestion"("targetId", "hidden", "createdAt");

-- ── AnonAnswer: extra index for hidden filter ─────────────────────────────
CREATE INDEX IF NOT EXISTS "AnonAnswer_questionId_hidden_idx"
    ON "AnonAnswer"("questionId", "hidden");

-- ── AnonAnswerVote: new table for "me ayudó" votes ───────────────────────
CREATE TABLE IF NOT EXISTS "AnonAnswerVote" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonAnswerVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnonAnswerVote_answerId_userId_key"
    ON "AnonAnswerVote"("answerId", "userId");
CREATE INDEX IF NOT EXISTS "AnonAnswerVote_answerId_idx" ON "AnonAnswerVote"("answerId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AnonAnswerVote_answerId_fkey'
    ) THEN
        ALTER TABLE "AnonAnswerVote"
            ADD CONSTRAINT "AnonAnswerVote_answerId_fkey"
            FOREIGN KEY ("answerId") REFERENCES "AnonAnswer"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AnonAnswerVote_userId_fkey'
    ) THEN
        ALTER TABLE "AnonAnswerVote"
            ADD CONSTRAINT "AnonAnswerVote_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
