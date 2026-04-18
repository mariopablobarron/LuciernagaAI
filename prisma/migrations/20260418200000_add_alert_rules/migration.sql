-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "level" TEXT NOT NULL,
    "tagPattern" TEXT,
    "messagePattern" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'telegram',
    "throttleMinutes" INTEGER NOT NULL DEFAULT 15,
    "lastFiredAt" TIMESTAMP(3),
    "firedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertRule_enabled_level_idx" ON "AlertRule"("enabled", "level");
