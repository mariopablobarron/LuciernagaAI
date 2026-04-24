-- CreateEnum
CREATE TYPE "CapsuleKind" AS ENUM ('snapshot', 'letter');

-- CreateEnum
CREATE TYPE "CapsuleStatus" AS ENUM ('pending', 'ready', 'delivered', 'expired');

-- CreateTable
CREATE TABLE "Capsule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "CapsuleKind" NOT NULL,
    "status" "CapsuleStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliverAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,

    CONSTRAINT "Capsule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Capsule_userId_status_deliverAt_idx" ON "Capsule"("userId", "status", "deliverAt");

-- CreateIndex
CREATE INDEX "Capsule_deliverAt_status_idx" ON "Capsule"("deliverAt", "status");

-- AddForeignKey
ALTER TABLE "Capsule" ADD CONSTRAINT "Capsule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
