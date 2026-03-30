-- AlterTable: add activity tracking and active flag to User
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "messageCount" INTEGER NOT NULL DEFAULT 0;
