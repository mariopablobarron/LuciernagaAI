-- Circles v2 redesign — async, pattern-matched, mentor-reflected.
-- Cutover is clean: production reports 0 active circles. We DROP all old circle data
-- and recreate the schema from scratch. No user-facing migration of data.

-- 1. Wipe any leftover circle data so NOT NULL columns can be added safely.
TRUNCATE TABLE "CircleSyncEcho", "CircleSyncResponse", "CircleSyncSession", "CircleChallenge", "CircleMember", "Circle" RESTART IDENTITY CASCADE;

-- 2. Drop old foreign keys.
ALTER TABLE "CircleSyncSession" DROP CONSTRAINT IF EXISTS "CircleSyncSession_circleId_fkey";
ALTER TABLE "CircleSyncResponse" DROP CONSTRAINT IF EXISTS "CircleSyncResponse_sessionId_fkey";
ALTER TABLE "CircleSyncResponse" DROP CONSTRAINT IF EXISTS "CircleSyncResponse_userId_fkey";
ALTER TABLE "CircleSyncEcho" DROP CONSTRAINT IF EXISTS "CircleSyncEcho_responseId_fkey";
ALTER TABLE "CircleSyncEcho" DROP CONSTRAINT IF EXISTS "CircleSyncEcho_userId_fkey";
ALTER TABLE "CircleChallenge" DROP CONSTRAINT IF EXISTS "CircleChallenge_circleId_fkey";

-- 3. Drop old indexes on Circle.
DROP INDEX IF EXISTS "Circle_phase_isActive_idx";
DROP INDEX IF EXISTS "Circle_syncEnabled_isActive_idx";

-- 4. Reshape Circle: drop legacy sync/phase columns, add match-by-pattern columns.
ALTER TABLE "Circle"
  DROP COLUMN IF EXISTS "endsAt",
  DROP COLUMN IF EXISTS "phase",
  DROP COLUMN IF EXISTS "syncDayOfWeek",
  DROP COLUMN IF EXISTS "syncEnabled",
  DROP COLUMN IF EXISTS "syncHour",
  ADD COLUMN  "cycleEndsAt"  TIMESTAMP(3),
  ADD COLUMN  "matchEmotion" TEXT NOT NULL,
  ADD COLUMN  "matchPattern" TEXT NOT NULL,
  ALTER COLUMN "maxMembers" SET DEFAULT 4;

-- 5. Drop legacy tables (data already truncated in step 1).
DROP TABLE IF EXISTS "CircleSyncEcho";
DROP TABLE IF EXISTS "CircleSyncResponse";
DROP TABLE IF EXISTS "CircleSyncSession";
DROP TABLE IF EXISTS "CircleChallenge";

-- 6. New tables.
CREATE TABLE "CirclePulse" (
    "id"           TEXT NOT NULL,
    "circleId"     TEXT NOT NULL,
    "prompt"       TEXT NOT NULL,
    "promptSource" TEXT NOT NULL,
    "weekStart"    TIMESTAMP(3) NOT NULL,
    "weekEnd"      TIMESTAMP(3) NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'open',
    "openedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt"     TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CirclePulse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CirclePulseResponse" (
    "id"          TEXT NOT NULL,
    "pulseId"     TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "content"     TEXT NOT NULL,
    "anonymous"   BOOLEAN NOT NULL DEFAULT true,
    "flagged"     BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt"    TIMESTAMP(3),
    CONSTRAINT "CirclePulseResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorReflection" (
    "id"          TEXT NOT NULL,
    "pulseId"     TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "content"     TEXT NOT NULL,
    "source"      TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt"  TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "readAt"      TIMESTAMP(3),
    CONSTRAINT "MentorReflection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CircleClosingLetter" (
    "id"          TEXT NOT NULL,
    "circleId"    TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "reason"      TEXT NOT NULL,
    "body"        TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    CONSTRAINT "CircleClosingLetter_pkey" PRIMARY KEY ("id")
);

-- 7. Indexes.
CREATE INDEX "CirclePulse_status_weekEnd_idx"            ON "CirclePulse"("status", "weekEnd");
CREATE INDEX "CirclePulse_circleId_weekStart_idx"         ON "CirclePulse"("circleId", "weekStart");
CREATE UNIQUE INDEX "CirclePulse_circleId_weekStart_key" ON "CirclePulse"("circleId", "weekStart");

CREATE INDEX "CirclePulseResponse_pulseId_submittedAt_idx" ON "CirclePulseResponse"("pulseId", "submittedAt");
CREATE INDEX "CirclePulseResponse_userId_submittedAt_idx"  ON "CirclePulseResponse"("userId", "submittedAt");
CREATE UNIQUE INDEX "CirclePulseResponse_pulseId_userId_key" ON "CirclePulseResponse"("pulseId", "userId");

CREATE INDEX "MentorReflection_userId_publishedAt_idx" ON "MentorReflection"("userId", "publishedAt");
CREATE INDEX "MentorReflection_approvedAt_idx"          ON "MentorReflection"("approvedAt");
CREATE UNIQUE INDEX "MentorReflection_pulseId_userId_key" ON "MentorReflection"("pulseId", "userId");

CREATE INDEX "CircleClosingLetter_userId_generatedAt_idx"   ON "CircleClosingLetter"("userId", "generatedAt");
CREATE INDEX "CircleClosingLetter_circleId_generatedAt_idx" ON "CircleClosingLetter"("circleId", "generatedAt");

CREATE INDEX "Circle_isActive_cycleEndsAt_idx"                  ON "Circle"("isActive", "cycleEndsAt");
CREATE INDEX "Circle_matchPattern_matchEmotion_isActive_idx"    ON "Circle"("matchPattern", "matchEmotion", "isActive");

-- 8. New foreign keys.
ALTER TABLE "CirclePulse"          ADD CONSTRAINT "CirclePulse_circleId_fkey"         FOREIGN KEY ("circleId") REFERENCES "Circle"("id")       ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePulseResponse"  ADD CONSTRAINT "CirclePulseResponse_pulseId_fkey"   FOREIGN KEY ("pulseId")  REFERENCES "CirclePulse"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePulseResponse"  ADD CONSTRAINT "CirclePulseResponse_userId_fkey"    FOREIGN KEY ("userId")   REFERENCES "User"("id")         ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorReflection"     ADD CONSTRAINT "MentorReflection_pulseId_fkey"      FOREIGN KEY ("pulseId")  REFERENCES "CirclePulse"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorReflection"     ADD CONSTRAINT "MentorReflection_userId_fkey"       FOREIGN KEY ("userId")   REFERENCES "User"("id")         ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleClosingLetter"  ADD CONSTRAINT "CircleClosingLetter_circleId_fkey"  FOREIGN KEY ("circleId") REFERENCES "Circle"("id")       ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleClosingLetter"  ADD CONSTRAINT "CircleClosingLetter_userId_fkey"    FOREIGN KEY ("userId")   REFERENCES "User"("id")         ON DELETE CASCADE ON UPDATE CASCADE;
