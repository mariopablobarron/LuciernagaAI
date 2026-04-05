-- CreateTable
CREATE TABLE "LlmLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "model" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'chat',
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmLog_createdAt_idx" ON "LlmLog"("createdAt");

-- CreateIndex
CREATE INDEX "LlmLog_userId_createdAt_idx" ON "LlmLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmLog_model_createdAt_idx" ON "LlmLog"("model", "createdAt");

-- CreateIndex
CREATE INDEX "LlmLog_source_createdAt_idx" ON "LlmLog"("source", "createdAt");
