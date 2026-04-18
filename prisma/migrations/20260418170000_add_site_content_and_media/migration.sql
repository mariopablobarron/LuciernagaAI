-- CreateTable
CREATE TABLE "SiteContent" (
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key","locale")
);

-- CreateIndex
CREATE INDEX "SiteContent_locale_idx" ON "SiteContent"("locale");

-- CreateTable
CREATE TABLE "MediaAsset" (
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("key")
);
