-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifyExpires" TIMESTAMP(3),
ADD COLUMN     "emailVerifyToken" TEXT;

-- CreateTable
CREATE TABLE "AdminSnapshot" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "data" JSONB NOT NULL,
    "summary" TEXT,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminSnapshot_type_createdAt_idx" ON "AdminSnapshot"("type", "createdAt");

-- CreateIndex
CREATE INDEX "DailyLog_userId_emotionalState_createdAt_idx" ON "DailyLog"("userId", "emotionalState", "createdAt");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "LlmLog_model_idx" ON "LlmLog"("model");

-- CreateIndex
CREATE INDEX "LlmLog_source_idx" ON "LlmLog"("source");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_isActive_createdAt_idx" ON "User"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "User_lastSeen_idx" ON "User"("lastSeen");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_organizationId_isActive_lastSeen_idx" ON "User"("organizationId", "isActive", "lastSeen");
