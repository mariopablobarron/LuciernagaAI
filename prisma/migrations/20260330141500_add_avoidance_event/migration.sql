-- CreateTable
CREATE TABLE "AvoidanceEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AvoidanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvoidanceEvent_userId_createdAt_idx"
ON "AvoidanceEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AvoidanceEvent_actionId_createdAt_idx"
ON "AvoidanceEvent"("actionId", "createdAt");

-- CreateIndex
CREATE INDEX "AvoidanceEvent_actionId_type_createdAt_idx"
ON "AvoidanceEvent"("actionId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "AvoidanceEvent"
ADD CONSTRAINT "AvoidanceEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvoidanceEvent"
ADD CONSTRAINT "AvoidanceEvent_actionId_fkey"
FOREIGN KEY ("actionId") REFERENCES "Action"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
