Loaded Prisma config from prisma.config.ts.

-- CreateEnum
CREATE TYPE "CirclePhase" AS ENUM ('bloqueo', 'exploracion', 'decision', 'accion', 'consistencia');

-- CreateEnum
CREATE TYPE "CircleRole" AS ENUM ('member', 'mentor_par', 'coach', 'psychologist');

-- AlterTable
ALTER TABLE "CommunityPost" ADD COLUMN     "blocker" TEXT,
ADD COLUMN     "circleId" TEXT,
ADD COLUMN     "feeling" TEXT,
ADD COLUMN     "spaceId" TEXT,
ADD COLUMN     "step" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'reflection',
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "plan" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Circle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phase" "CirclePhase" NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 8,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleMember" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CircleRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "CircleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleChallenge" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunitySpace" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CommunitySpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Heartbeat" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Heartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCommitment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "circleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "hostName" TEXT NOT NULL,
    "hostRole" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "meetingUrl" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "icon" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'system',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "pushed" BOOLEAN NOT NULL DEFAULT false,
    "pushedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Circle_phase_isActive_idx" ON "Circle"("phase", "isActive");

-- CreateIndex
CREATE INDEX "CircleMember_userId_idx" ON "CircleMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleMember_circleId_userId_key" ON "CircleMember"("circleId", "userId");

-- CreateIndex
CREATE INDEX "CircleChallenge_circleId_weekStart_idx" ON "CircleChallenge"("circleId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "CommunitySpace_slug_key" ON "CommunitySpace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Heartbeat_postId_userId_key" ON "Heartbeat"("postId", "userId");

-- CreateIndex
CREATE INDEX "DailyCommitment_circleId_date_idx" ON "DailyCommitment"("circleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCommitment_userId_circleId_date_key" ON "DailyCommitment"("userId", "circleId", "date");

-- CreateIndex
CREATE INDEX "LiveSession_scheduledAt_idx" ON "LiveSession"("scheduledAt");

-- CreateIndex
CREATE INDEX "LiveSession_circleId_scheduledAt_idx" ON "LiveSession"("circleId", "scheduledAt");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_channel_createdAt_idx" ON "Notification"("channel", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_circleId_createdAt_idx" ON "CommunityPost"("circleId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_spaceId_createdAt_idx" ON "CommunityPost"("spaceId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_type_createdAt_idx" ON "CommunityPost"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "CommunitySpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleChallenge" ADD CONSTRAINT "CircleChallenge_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heartbeat" ADD CONSTRAINT "Heartbeat_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heartbeat" ADD CONSTRAINT "Heartbeat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCommitment" ADD CONSTRAINT "DailyCommitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCommitment" ADD CONSTRAINT "DailyCommitment_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

