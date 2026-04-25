-- CreateTable
CREATE TABLE "ScheduledAgent" (
    "id" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "cronExpression" TEXT,
    "promptSummary" TEXT NOT NULL,
    "model" TEXT,
    "repo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "resultUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduledAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledAgent_triggerId_key" ON "ScheduledAgent"("triggerId");

-- CreateIndex
CREATE INDEX "ScheduledAgent_status_scheduledFor_idx" ON "ScheduledAgent"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledAgent_status_createdAt_idx" ON "ScheduledAgent"("status", "createdAt");
