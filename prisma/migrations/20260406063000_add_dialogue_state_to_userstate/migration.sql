-- AlterTable
ALTER TABLE "UserState" ADD COLUMN "dialogueIntent" TEXT NOT NULL DEFAULT 'clarification';
ALTER TABLE "UserState" ADD COLUMN "dialogueStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserState" ADD COLUMN "dialogueFlow" TEXT;
