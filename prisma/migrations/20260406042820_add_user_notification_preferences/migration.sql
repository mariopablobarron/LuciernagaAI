-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_userId_fkey";

-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "notifyGoals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyInsights" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyUpdates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
ADD COLUMN     "weeklyEmailEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmLog" ADD CONSTRAINT "LlmLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
