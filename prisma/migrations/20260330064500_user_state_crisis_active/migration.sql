-- AlterTable
ALTER TABLE "UserState"
ADD COLUMN "crisisActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "crisisActivatedAt" TIMESTAMP(3),
ADD COLUMN "crisisActiveUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "UserState_crisisActive_crisisActiveUntil_idx"
ON "UserState"("crisisActive", "crisisActiveUntil");
