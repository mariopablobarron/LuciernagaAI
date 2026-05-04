-- SEO agent tables — espejo local de GA4 + Search Console + oportunidades.

CREATE TABLE "Ga4DailyMetric" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "pagePath" TEXT NOT NULL,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "screenPageViews" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageSessionSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ga4DailyMetric_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Ga4DailyMetric_date_pagePath_key" ON "Ga4DailyMetric"("date", "pagePath");
CREATE INDEX "Ga4DailyMetric_pagePath_idx" ON "Ga4DailyMetric"("pagePath");
CREATE INDEX "Ga4DailyMetric_date_idx" ON "Ga4DailyMetric"("date");

CREATE TABLE "GscDailyQuery" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "query" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscDailyQuery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GscDailyQuery_date_query_key" ON "GscDailyQuery"("date", "query");
CREATE INDEX "GscDailyQuery_query_idx" ON "GscDailyQuery"("query");
CREATE INDEX "GscDailyQuery_date_idx" ON "GscDailyQuery"("date");
CREATE INDEX "GscDailyQuery_clicks_idx" ON "GscDailyQuery"("clicks");
CREATE INDEX "GscDailyQuery_impressions_idx" ON "GscDailyQuery"("impressions");

CREATE TABLE "GscDailyPage" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscDailyPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GscDailyPage_date_page_key" ON "GscDailyPage"("date", "page");
CREATE INDEX "GscDailyPage_page_idx" ON "GscDailyPage"("page");
CREATE INDEX "GscDailyPage_date_idx" ON "GscDailyPage"("date");

CREATE TABLE "SeoOpportunity" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "url" TEXT,
    "query" TEXT,
    "metrics" JSONB,
    "recommendation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "fingerprint" TEXT NOT NULL,

    CONSTRAINT "SeoOpportunity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SeoOpportunity_fingerprint_key" ON "SeoOpportunity"("fingerprint");
CREATE INDEX "SeoOpportunity_status_priority_idx" ON "SeoOpportunity"("status", "priority");
CREATE INDEX "SeoOpportunity_kind_status_idx" ON "SeoOpportunity"("kind", "status");
CREATE INDEX "SeoOpportunity_detectedAt_idx" ON "SeoOpportunity"("detectedAt");
