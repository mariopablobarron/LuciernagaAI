-- CreateTable
CREATE TABLE "CustomTracker" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "apiHost" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomTracker_isActive_provider_idx" ON "CustomTracker"("isActive", "provider");
