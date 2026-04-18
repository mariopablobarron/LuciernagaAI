-- Circle Synchronous Sessions — weekly 30-min co-presence windows

ALTER TABLE "Circle"
    ADD COLUMN "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "syncDayOfWeek" INTEGER NOT NULL DEFAULT 4,
    ADD COLUMN "syncHour" INTEGER NOT NULL DEFAULT 20;

CREATE INDEX "Circle_syncEnabled_isActive_idx" ON "Circle"("syncEnabled", "isActive");

-- Session instance
CREATE TABLE "CircleSyncSession" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptSource" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CircleSyncSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleSyncSession_circleId_scheduledFor_key" ON "CircleSyncSession"("circleId", "scheduledFor");
CREATE INDEX "CircleSyncSession_status_scheduledFor_idx" ON "CircleSyncSession"("status", "scheduledFor");
CREATE INDEX "CircleSyncSession_circleId_scheduledFor_idx" ON "CircleSyncSession"("circleId", "scheduledFor");

ALTER TABLE "CircleSyncSession"
    ADD CONSTRAINT "CircleSyncSession_circleId_fkey"
    FOREIGN KEY ("circleId") REFERENCES "Circle"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Response per user per session
CREATE TABLE "CircleSyncResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT true,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    CONSTRAINT "CircleSyncResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleSyncResponse_sessionId_userId_key" ON "CircleSyncResponse"("sessionId", "userId");
CREATE INDEX "CircleSyncResponse_sessionId_submittedAt_idx" ON "CircleSyncResponse"("sessionId", "submittedAt");

ALTER TABLE "CircleSyncResponse"
    ADD CONSTRAINT "CircleSyncResponse_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "CircleSyncSession"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleSyncResponse"
    ADD CONSTRAINT "CircleSyncResponse_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Echo ("te escucho") on a response, 1 per user per response
CREATE TABLE "CircleSyncEcho" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CircleSyncEcho_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleSyncEcho_responseId_userId_key" ON "CircleSyncEcho"("responseId", "userId");
CREATE INDEX "CircleSyncEcho_userId_createdAt_idx" ON "CircleSyncEcho"("userId", "createdAt");

ALTER TABLE "CircleSyncEcho"
    ADD CONSTRAINT "CircleSyncEcho_responseId_fkey"
    FOREIGN KEY ("responseId") REFERENCES "CircleSyncResponse"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleSyncEcho"
    ADD CONSTRAINT "CircleSyncEcho_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
