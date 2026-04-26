-- CreateTable
CREATE TABLE "EnneagramAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scoresByType" JSONB NOT NULL,
    "dominantType" INTEGER NOT NULL,
    "wing" INTEGER,
    "testVersion" TEXT NOT NULL DEFAULT 'oeps-90-v1',
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnneagramAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnneagramAssessment_userId_completedAt_idx" ON "EnneagramAssessment"("userId", "completedAt");

-- AddForeignKey
ALTER TABLE "EnneagramAssessment" ADD CONSTRAINT "EnneagramAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
