-- ─── WaitlistEntry (critical: breaks /unirse without this) ────────────────────
CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
  "id"         TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "mission1"   TEXT NOT NULL,
  "mission2"   TEXT NOT NULL,
  "mission3"   TEXT NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'approved',
  "inviteCode" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WaitlistEntry_email_key" ON "WaitlistEntry"("email");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_status_createdAt_idx" ON "WaitlistEntry"("status", "createdAt");

-- ─── Invitation ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Invitation" (
  "id"          TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "usedByEmail" TEXT,
  "usedAt"      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Invitation_code_key" ON "Invitation"("code");
CREATE INDEX IF NOT EXISTS "Invitation_userId_createdAt_idx" ON "Invitation"("userId", "createdAt");
ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;
ALTER TABLE "Invitation" VALIDATE CONSTRAINT "Invitation_userId_fkey";

-- ─── User: invitesEarned + stripeCustomerId ────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invitesEarned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId") WHERE "stripeCustomerId" IS NOT NULL;

-- ─── Subscription: Stripe fields + updatedAt ──────────────────────────────────
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeCustomerId"     TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripePriceId"        TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodStart"   TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd"     TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelledAt"          TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId") WHERE "stripeSubscriptionId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- ─── QuizResult ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "QuizResult" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "state"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuizResult_userId_createdAt_idx" ON "QuizResult"("userId", "createdAt");

-- ─── AdminTask ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AdminTask" (
  "id"          TEXT NOT NULL,
  "instruction" TEXT NOT NULL,
  "source"      TEXT NOT NULL DEFAULT 'telegram',
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "result"      TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "doneAt"      TIMESTAMP(3),
  CONSTRAINT "AdminTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdminTask_status_createdAt_idx" ON "AdminTask"("status", "createdAt");

-- ─── Win ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Win" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "note"             TEXT NOT NULL,
  "sharedWithFamily" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Win_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Win_userId_createdAt_idx" ON "Win"("userId", "createdAt");
ALTER TABLE "Win"
  ADD CONSTRAINT "Win_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;

-- ─── ActionReminder ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ActionReminder" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "actionText"     TEXT NOT NULL,
  "remindAt"       TIMESTAMP(3) NOT NULL,
  "sent"           BOOLEAN NOT NULL DEFAULT false,
  "sentAt"         TIMESTAMP(3),
  "conversationId" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionReminder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ActionReminder_userId_remindAt_idx" ON "ActionReminder"("userId", "remindAt");
CREATE INDEX IF NOT EXISTS "ActionReminder_sent_remindAt_idx" ON "ActionReminder"("sent", "remindAt");
ALTER TABLE "ActionReminder"
  ADD CONSTRAINT "ActionReminder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;

-- ─── UserPreferences ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserPreferences" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "aiTone"       TEXT NOT NULL DEFAULT 'directo',
  "reminderTime" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreferences_userId_key" ON "UserPreferences"("userId");
ALTER TABLE "UserPreferences"
  ADD CONSTRAINT "UserPreferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;

-- ─── ClinicalNote ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ClinicalNote" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "tags"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ClinicalNote_userId_createdAt_idx" ON "ClinicalNote"("userId", "createdAt");
ALTER TABLE "ClinicalNote"
  ADD CONSTRAINT "ClinicalNote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;

-- ─── Assessment ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Assessment" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "questions" JSONB NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Assessment_userId_status_createdAt_idx" ON "Assessment"("userId", "status", "createdAt");
ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;

-- ─── AssessmentResponse ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AssessmentResponse" (
  "id"           TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "answers"      JSONB NOT NULL,
  "totalScore"   INTEGER NOT NULL,
  "severity"     TEXT NOT NULL,
  "completedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentResponse_assessmentId_key" ON "AssessmentResponse"("assessmentId");
CREATE INDEX IF NOT EXISTS "AssessmentResponse_userId_completedAt_idx" ON "AssessmentResponse"("userId", "completedAt");
ALTER TABLE "AssessmentResponse"
  ADD CONSTRAINT "AssessmentResponse_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;

-- ─── TrustedContact ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TrustedContact" (
  "id"                 TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "name"               TEXT NOT NULL,
  "email"              TEXT NOT NULL,
  "phone"              TEXT,
  "relation"           TEXT,
  "accessToken"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "shareProgress"      BOOLEAN NOT NULL DEFAULT false,
  "shareWins"          BOOLEAN NOT NULL DEFAULT false,
  "shareStreak"        BOOLEAN NOT NULL DEFAULT false,
  "notifyOnCrisis"     BOOLEAN NOT NULL DEFAULT true,
  "notifyOnInactivity" BOOLEAN NOT NULL DEFAULT true,
  "inactivityDays"     INTEGER NOT NULL DEFAULT 3,
  "inviteSentAt"       TIMESTAMP(3),
  "lastAccessAt"       TIMESTAMP(3),
  "lastNotifiedAt"     TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrustedContact_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TrustedContact_userId_key" ON "TrustedContact"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TrustedContact_accessToken_key" ON "TrustedContact"("accessToken");
CREATE INDEX IF NOT EXISTS "TrustedContact_userId_idx" ON "TrustedContact"("userId");
CREATE INDEX IF NOT EXISTS "TrustedContact_accessToken_idx" ON "TrustedContact"("accessToken");
ALTER TABLE "TrustedContact"
  ADD CONSTRAINT "TrustedContact_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;

-- ─── SupportMessage ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "trustedContactId" TEXT,
  "fromName"         TEXT NOT NULL,
  "content"          TEXT NOT NULL,
  "scheduledAt"      TIMESTAMP(3),
  "deliveredAt"      TIMESTAMP(3),
  "readAt"           TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportMessage_userId_deliveredAt_idx" ON "SupportMessage"("userId", "deliveredAt");
CREATE INDEX IF NOT EXISTS "SupportMessage_trustedContactId_createdAt_idx" ON "SupportMessage"("trustedContactId", "createdAt");
ALTER TABLE "SupportMessage"
  ADD CONSTRAINT "SupportMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;
ALTER TABLE "SupportMessage"
  ADD CONSTRAINT "SupportMessage_trustedContactId_fkey"
  FOREIGN KEY ("trustedContactId") REFERENCES "TrustedContact"("id") ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;

-- ─── FamilyPing ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "FamilyPing" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "trustedContactId" TEXT NOT NULL,
  "respondedAt"      TIMESTAMP(3),
  "response"         TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FamilyPing_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FamilyPing_userId_createdAt_idx" ON "FamilyPing"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "FamilyPing_trustedContactId_createdAt_idx" ON "FamilyPing"("trustedContactId", "createdAt");
ALTER TABLE "FamilyPing"
  ADD CONSTRAINT "FamilyPing_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
  NOT VALID;
