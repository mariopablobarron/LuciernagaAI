-- Tracks where a BlogPost has been syndicated (Medium, Dev.to, Hashnode)
-- Re-publication keeps canonical URL pointing to tresmilmillonesdelatidos.es

CREATE TABLE "BlogSyndication" (
  "id" TEXT NOT NULL,
  "blogPostId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "externalId" TEXT,
  "externalUrl" TEXT,
  "errorMessage" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "succeededAt" TIMESTAMP(3),

  CONSTRAINT "BlogSyndication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlogSyndication_blogPostId_platform_key"
  ON "BlogSyndication"("blogPostId", "platform");

CREATE INDEX "BlogSyndication_blogPostId_idx" ON "BlogSyndication"("blogPostId");
CREATE INDEX "BlogSyndication_status_idx" ON "BlogSyndication"("status");

ALTER TABLE "BlogSyndication"
  ADD CONSTRAINT "BlogSyndication_blogPostId_fkey"
  FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
