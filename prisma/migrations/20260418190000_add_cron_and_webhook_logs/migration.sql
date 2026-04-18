-- CreateTable
CREATE TABLE "CronRunLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "recordsProcessed" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "CronRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronRunLog_jobName_startedAt_idx" ON "CronRunLog"("jobName", "startedAt");
CREATE INDEX "CronRunLog_status_startedAt_idx" ON "CronRunLog"("status", "startedAt");
CREATE INDEX "CronRunLog_startedAt_idx" ON "CronRunLog"("startedAt");

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "event" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "signatureValid" BOOLEAN,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "payload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookLog_source_receivedAt_idx" ON "WebhookLog"("source", "receivedAt");
CREATE INDEX "WebhookLog_status_receivedAt_idx" ON "WebhookLog"("status", "receivedAt");
CREATE INDEX "WebhookLog_receivedAt_idx" ON "WebhookLog"("receivedAt");
