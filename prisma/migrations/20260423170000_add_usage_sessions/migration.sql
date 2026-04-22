-- CreateTable
CREATE TABLE "UsageSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "surface" TEXT NOT NULL DEFAULT 'app',
    "userAgent" TEXT,

    CONSTRAINT "UsageSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageSession_userId_startedAt_idx" ON "UsageSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "UsageSession_userId_lastPingAt_idx" ON "UsageSession"("userId", "lastPingAt");

-- CreateIndex
CREATE INDEX "UsageSession_endedAt_idx" ON "UsageSession"("endedAt");

-- AddForeignKey
ALTER TABLE "UsageSession" ADD CONSTRAINT "UsageSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
