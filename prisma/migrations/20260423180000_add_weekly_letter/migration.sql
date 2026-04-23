-- AlterTable: UserPreferences — opt-out flags for weekly letter + email notification
ALTER TABLE "UserPreferences"
  ADD COLUMN "weeklyLetterDisabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "weeklyLetterEmailDisabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: WeeklyLetter
CREATE TABLE "WeeklyLetter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "quotes" JSONB NOT NULL,
    "state" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "skippedReason" TEXT,
    "emailNotifiedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyLetter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyLetter_userId_weekStart_key" ON "WeeklyLetter"("userId", "weekStart");
CREATE INDEX "WeeklyLetter_userId_readAt_idx" ON "WeeklyLetter"("userId", "readAt");
CREATE INDEX "WeeklyLetter_published_createdAt_idx" ON "WeeklyLetter"("published", "createdAt");

-- AddForeignKey
ALTER TABLE "WeeklyLetter" ADD CONSTRAINT "WeeklyLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
