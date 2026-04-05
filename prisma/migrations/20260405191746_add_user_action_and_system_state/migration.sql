-- AlterTable
ALTER TABLE "Assessment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ClinicalNote" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "journalMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rating" INTEGER;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TrustedContact" ALTER COLUMN "accessToken" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserPreferences" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserState" ADD COLUMN     "systemState" TEXT NOT NULL DEFAULT 'ESTABLE';

-- CreateTable
CREATE TABLE "UserAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAction_userId_createdAt_idx" ON "UserAction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserAction_userId_status_idx" ON "UserAction"("userId", "status");

-- CreateIndex
CREATE INDEX "Action_goalId_completed_idx" ON "Action"("goalId", "completed");

-- CreateIndex
CREATE INDEX "UserChallenge_userId_updatedAt_idx" ON "UserChallenge"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "UserState_systemState_updatedAt_idx" ON "UserState"("systemState", "updatedAt");

-- AddForeignKey
ALTER TABLE "UserAction" ADD CONSTRAINT "UserAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
