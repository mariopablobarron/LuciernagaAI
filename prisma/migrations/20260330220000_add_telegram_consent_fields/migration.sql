-- AlterTable: add telegram identity and consent fields to User
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;
ALTER TABLE "User" ADD COLUMN "consentGiven" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "consentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "source" TEXT;

-- CreateIndex: unique constraint on telegramId (nulls are allowed to be non-unique in PG)
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
