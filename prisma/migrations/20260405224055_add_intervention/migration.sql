-- AlterTable
ALTER TABLE "LlmLog" ADD COLUMN     "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Intervention_userId_sentAt_idx" ON "Intervention"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "Intervention_adminId_sentAt_idx" ON "Intervention"("adminId", "sentAt");

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
