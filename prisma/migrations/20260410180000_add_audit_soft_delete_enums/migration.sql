-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('free', 'pro');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'paused', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('sent', 'read', 'resolved');

-- AlterTable: Remove legacy Json messages from Conversation
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "messages";

-- AlterTable: Goal — convert status to enum
ALTER TABLE "Goal" DROP COLUMN "status",
ADD COLUMN     "status" "GoalStatus" NOT NULL DEFAULT 'active';

-- AlterTable: Intervention — convert status to enum
ALTER TABLE "Intervention" DROP COLUMN "status",
ADD COLUMN     "status" "InterventionStatus" NOT NULL DEFAULT 'sent';

-- AlterTable: LlmLog — nullable prompt/response for purging, add purgedAt
ALTER TABLE "LlmLog" ADD COLUMN     "purgedAt" TIMESTAMP(3),
ALTER COLUMN "prompt" DROP NOT NULL,
ALTER COLUMN "response" DROP NOT NULL;

-- AlterTable: Subscription — convert status and plan to enums
ALTER TABLE "Subscription" DROP COLUMN "status",
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
DROP COLUMN "plan",
ADD COLUMN     "plan" "SubscriptionPlan" NOT NULL DEFAULT 'free';

-- AlterTable: User — add soft delete
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable: UserState — update default
ALTER TABLE "UserState" ALTER COLUMN "state" SET DEFAULT 'neutral';

-- CreateTable: AuditLog for RGPD/LOPD compliance
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "CrisisEvent_userId_level_createdAt_idx" ON "CrisisEvent"("userId", "level", "createdAt");

-- CreateIndex
CREATE INDEX "DiaryEntry_userId_mood_createdAt_idx" ON "DiaryEntry"("userId", "mood", "createdAt");

-- CreateIndex (recreate for new enum type)
DROP INDEX IF EXISTS "Goal_userId_status_createdAt_idx";
CREATE INDEX "Goal_userId_status_createdAt_idx" ON "Goal"("userId", "status", "createdAt");

-- CreateIndex
DROP INDEX IF EXISTS "Goal_status_idx";
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "Intervention_userId_status_idx" ON "Intervention"("userId", "status");

-- CreateIndex
CREATE INDEX "LlmLog_purgedAt_createdAt_idx" ON "LlmLog"("purgedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex (recreate for new enum types)
DROP INDEX IF EXISTS "Subscription_status_plan_createdAt_idx";
CREATE INDEX "Subscription_status_plan_createdAt_idx" ON "Subscription"("status", "plan", "createdAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
