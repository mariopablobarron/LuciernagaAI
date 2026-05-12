-- Discovery agent: conversaciones en foros donde el producto aporta valor

CREATE TABLE "DiscoveryMatch" (
  "id" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "externalUrl" TEXT NOT NULL,
  "subredditOrTag" TEXT,
  "title" TEXT,
  "excerpt" TEXT,
  "authorHandle" TEXT,
  "postedAt" TIMESTAMP(3),
  "matchedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

  "llmScore" INTEGER,
  "llmReason" TEXT,
  "draftResponse" TEXT,

  "status" TEXT NOT NULL DEFAULT 'pending',
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "publishedUrl" TEXT,
  "publishError" TEXT,

  "notifiedAt" TIMESTAMP(3),

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DiscoveryMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscoveryMatch_platform_externalId_key"
  ON "DiscoveryMatch"("platform", "externalId");

CREATE INDEX "DiscoveryMatch_status_createdAt_idx"
  ON "DiscoveryMatch"("status", "createdAt");

CREATE INDEX "DiscoveryMatch_platform_llmScore_idx"
  ON "DiscoveryMatch"("platform", "llmScore");
