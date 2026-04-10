-- ScheduledEmail
CREATE TABLE IF NOT EXISTS "ScheduledEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ScheduledEmail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScheduledEmail_scheduledAt_sentAt_idx" ON "ScheduledEmail"("scheduledAt", "sentAt");
CREATE INDEX IF NOT EXISTS "ScheduledEmail_userId_template_idx" ON "ScheduledEmail"("userId", "template");

ALTER TABLE "ScheduledEmail" ADD CONSTRAINT "ScheduledEmail_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
