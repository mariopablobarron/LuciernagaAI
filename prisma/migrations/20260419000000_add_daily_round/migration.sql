-- Ronda Diaria (Cafetería): un prompt al día, respuestas anónimas,
-- reacciones emoji y "espejo" (pregunta corta de un usuario a una respuesta).
-- Idempotente por si se reaplica.

-- ── DailyRound ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DailyRound" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyRound_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyRound_date_key" ON "DailyRound"("date");
CREATE INDEX IF NOT EXISTS "DailyRound_date_idx" ON "DailyRound"("date");

-- ── DailyRoundResponse ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DailyRoundResponse" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT true,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyRoundResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyRoundResponse_roundId_userId_key"
    ON "DailyRoundResponse"("roundId", "userId");
CREATE INDEX IF NOT EXISTS "DailyRoundResponse_roundId_createdAt_idx"
    ON "DailyRoundResponse"("roundId", "createdAt");
CREATE INDEX IF NOT EXISTS "DailyRoundResponse_userId_createdAt_idx"
    ON "DailyRoundResponse"("userId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyRoundResponse_roundId_fkey') THEN
        ALTER TABLE "DailyRoundResponse"
            ADD CONSTRAINT "DailyRoundResponse_roundId_fkey"
            FOREIGN KEY ("roundId") REFERENCES "DailyRound"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyRoundResponse_userId_fkey') THEN
        ALTER TABLE "DailyRoundResponse"
            ADD CONSTRAINT "DailyRoundResponse_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ── DailyRoundReaction ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DailyRoundReaction" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyRoundReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyRoundReaction_responseId_userId_key"
    ON "DailyRoundReaction"("responseId", "userId");
CREATE INDEX IF NOT EXISTS "DailyRoundReaction_responseId_idx"
    ON "DailyRoundReaction"("responseId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyRoundReaction_responseId_fkey') THEN
        ALTER TABLE "DailyRoundReaction"
            ADD CONSTRAINT "DailyRoundReaction_responseId_fkey"
            FOREIGN KEY ("responseId") REFERENCES "DailyRoundResponse"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyRoundReaction_userId_fkey') THEN
        ALTER TABLE "DailyRoundReaction"
            ADD CONSTRAINT "DailyRoundReaction_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ── DailyRoundMirror ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DailyRoundMirror" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyRoundMirror_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyRoundMirror_responseId_authorId_key"
    ON "DailyRoundMirror"("responseId", "authorId");
CREATE INDEX IF NOT EXISTS "DailyRoundMirror_responseId_createdAt_idx"
    ON "DailyRoundMirror"("responseId", "createdAt");
CREATE INDEX IF NOT EXISTS "DailyRoundMirror_authorId_createdAt_idx"
    ON "DailyRoundMirror"("authorId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyRoundMirror_responseId_fkey') THEN
        ALTER TABLE "DailyRoundMirror"
            ADD CONSTRAINT "DailyRoundMirror_responseId_fkey"
            FOREIGN KEY ("responseId") REFERENCES "DailyRoundResponse"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyRoundMirror_authorId_fkey') THEN
        ALTER TABLE "DailyRoundMirror"
            ADD CONSTRAINT "DailyRoundMirror_authorId_fkey"
            FOREIGN KEY ("authorId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
