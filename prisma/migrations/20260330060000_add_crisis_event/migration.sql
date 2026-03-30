-- CreateTable
CREATE TABLE "CrisisEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrisisEvent_level_createdAt_idx" ON "CrisisEvent"("level", "createdAt");

-- CreateIndex
CREATE INDEX "CrisisEvent_userId_createdAt_idx" ON "CrisisEvent"("userId", "createdAt");
