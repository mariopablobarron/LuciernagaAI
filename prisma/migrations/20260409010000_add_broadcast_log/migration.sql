-- CreateTable
CREATE TABLE "BroadcastLog" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "subject" TEXT,
    "recipientCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BroadcastLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BroadcastLog_channel_createdAt_idx" ON "BroadcastLog"("channel", "createdAt");

-- CreateIndex
CREATE INDEX "BroadcastLog_status_createdAt_idx" ON "BroadcastLog"("status", "createdAt");
