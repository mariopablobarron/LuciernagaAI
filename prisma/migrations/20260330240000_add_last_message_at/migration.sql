-- AlterTable: add lastMessageAt to track last real user message timestamp
ALTER TABLE "User" ADD COLUMN "lastMessageAt" TIMESTAMP(3);
