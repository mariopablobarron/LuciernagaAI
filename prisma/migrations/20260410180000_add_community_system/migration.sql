-- CreateEnum
CREATE TYPE "CirclePhase" AS ENUM ('bloqueo', 'exploracion', 'decision', 'accion', 'consistencia');
CREATE TYPE "CircleRole" AS ENUM ('member', 'mentor_par', 'coach', 'psychologist');

-- CreateTable: Circle
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
CREATE INDEX "Circle_phase_isActive_idx" ON "Circle"("phase", "isActive");

-- CreateTable: CircleMember
CREATE TABLE "CircleMember" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CircleRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    CONSTRAINT "CircleMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CircleMember_circleId_userId_key" ON "CircleMember"("circleId", "userId");
CREATE INDEX "CircleMember_userId_idx" ON "CircleMember"("userId");
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE;
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- CreateTable: CircleChallenge
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
CREATE INDEX "CircleChallenge_circleId_weekStart_idx" ON "CircleChallenge"("circleId", "weekStart");
ALTER TABLE "CircleChallenge" ADD CONSTRAINT "CircleChallenge_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE;

-- CreateTable: CommunitySpace
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
CREATE UNIQUE INDEX "CommunitySpace_slug_key" ON "CommunitySpace"("slug");

-- CreateTable: CommunityPost
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "circleId" TEXT,
    "spaceId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'reflection',
    "feeling" TEXT,
    "blocker" TEXT,
    "step" TEXT,
    "content" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunityPost_circleId_createdAt_idx" ON "CommunityPost"("circleId", "createdAt");
CREATE INDEX "CommunityPost_spaceId_createdAt_idx" ON "CommunityPost"("spaceId", "createdAt");
CREATE INDEX "CommunityPost_userId_createdAt_idx" ON "CommunityPost"("userId", "createdAt");
CREATE INDEX "CommunityPost_type_createdAt_idx" ON "CommunityPost"("type", "createdAt");
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL;
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "CommunitySpace"("id") ON DELETE SET NULL;

-- CreateTable: Heartbeat
CREATE TABLE "Heartbeat" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Heartbeat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Heartbeat_postId_userId_key" ON "Heartbeat"("postId", "userId");
ALTER TABLE "Heartbeat" ADD CONSTRAINT "Heartbeat_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE;
ALTER TABLE "Heartbeat" ADD CONSTRAINT "Heartbeat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- CreateTable: DailyCommitment
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
CREATE UNIQUE INDEX "DailyCommitment_userId_circleId_date_key" ON "DailyCommitment"("userId", "circleId", "date");
CREATE INDEX "DailyCommitment_circleId_date_idx" ON "DailyCommitment"("circleId", "date");
ALTER TABLE "DailyCommitment" ADD CONSTRAINT "DailyCommitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "DailyCommitment" ADD CONSTRAINT "DailyCommitment_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE;

-- CreateTable: LiveSession
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
CREATE INDEX "LiveSession_scheduledAt_idx" ON "LiveSession"("scheduledAt");
CREATE INDEX "LiveSession_circleId_scheduledAt_idx" ON "LiveSession"("circleId", "scheduledAt");
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL;

-- Seed: Default community spaces
INSERT INTO "CommunitySpace" ("id", "slug", "name", "description", "icon", "sortOrder") VALUES
  ('space_bloqueo', 'bloqueo-procrastinacion', 'Bloqueo y procrastinación', 'Cuando sabes lo que tienes que hacer pero no puedes empezar', '🧱', 1),
  ('space_ansiedad', 'ansiedad-sobrecarga', 'Ansiedad y sobrecarga', 'Cuando todo es urgente y nada avanza', '⚡', 2),
  ('space_decisiones', 'decisiones-rumbo', 'Decisiones y rumbo', 'Cuando no sabes qué camino tomar', '🧭', 3),
  ('space_habitos', 'habitos-consistencia', 'Hábitos y consistencia', 'Cuando quieres mantener el ritmo sin quemarte', '🔥', 4);
