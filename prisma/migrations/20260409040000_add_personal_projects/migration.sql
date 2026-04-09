-- PersonalProject
CREATE TABLE "PersonalProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "phase" TEXT NOT NULL DEFAULT 'feel',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonalProject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonalProject_userId_status_idx" ON "PersonalProject"("userId", "status");
CREATE INDEX "PersonalProject_userId_phase_status_idx" ON "PersonalProject"("userId", "phase", "status");

ALTER TABLE "PersonalProject" ADD CONSTRAINT "PersonalProject_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProjectPhaseEntry
CREATE TABLE "ProjectPhaseEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT,
    "aiReflection" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectPhaseEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectPhaseEntry_projectId_phase_order_idx" ON "ProjectPhaseEntry"("projectId", "phase", "order");

ALTER TABLE "ProjectPhaseEntry" ADD CONSTRAINT "ProjectPhaseEntry_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "PersonalProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProjectFocusArea
CREATE TABLE "ProjectFocusArea" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectFocusArea_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectFocusArea_projectId_status_idx" ON "ProjectFocusArea"("projectId", "status");

ALTER TABLE "ProjectFocusArea" ADD CONSTRAINT "ProjectFocusArea_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "PersonalProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProjectStep
CREATE TABLE "ProjectStep" (
    "id" TEXT NOT NULL,
    "focusAreaId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "reflection" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectStep_focusAreaId_completed_idx" ON "ProjectStep"("focusAreaId", "completed");

ALTER TABLE "ProjectStep" ADD CONSTRAINT "ProjectStep_focusAreaId_fkey"
    FOREIGN KEY ("focusAreaId") REFERENCES "ProjectFocusArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProjectReflection
CREATE TABLE "ProjectReflection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'free',
    "content" TEXT NOT NULL,
    "aiChallenge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectReflection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectReflection_projectId_createdAt_idx" ON "ProjectReflection"("projectId", "createdAt");

ALTER TABLE "ProjectReflection" ADD CONSTRAINT "ProjectReflection_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "PersonalProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProjectInsight
CREATE TABLE "ProjectInsight" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectInsight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectInsight_projectId_acknowledged_idx" ON "ProjectInsight"("projectId", "acknowledged");

ALTER TABLE "ProjectInsight" ADD CONSTRAINT "ProjectInsight_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "PersonalProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
