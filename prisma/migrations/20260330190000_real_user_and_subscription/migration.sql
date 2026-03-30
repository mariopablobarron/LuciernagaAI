-- Add real identity fields to existing users while preserving anonymous sessions.
ALTER TABLE "User"
ADD COLUMN "email" TEXT,
ADD COLUMN "name" TEXT,
ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

UPDATE "User"
SET "email" = CONCAT(
  LOWER(REGEXP_REPLACE("id", '[^a-zA-Z0-9._-]', '-', 'g')),
  '@session.luciernaga.local'
)
WHERE "email" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "email" SET NOT NULL;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Subscription_userId_createdAt_idx" ON "Subscription"("userId", "createdAt");
CREATE INDEX "Subscription_status_plan_createdAt_idx" ON "Subscription"("status", "plan", "createdAt");

ALTER TABLE "Subscription"
ADD CONSTRAINT "Subscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
