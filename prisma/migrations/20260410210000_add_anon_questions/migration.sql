
-- CreateTable
CREATE TABLE "AnonQuestion" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT,
    "targetId" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnonQuestion_targetId_createdAt_idx" ON "AnonQuestion"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "AnonQuestion_hidden_createdAt_idx" ON "AnonQuestion"("hidden", "createdAt");

-- CreateIndex
CREATE INDEX "AnonAnswer_questionId_createdAt_idx" ON "AnonAnswer"("questionId", "createdAt");

-- AddForeignKey
ALTER TABLE "AnonQuestion" ADD CONSTRAINT "AnonQuestion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonQuestion" ADD CONSTRAINT "AnonQuestion_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonAnswer" ADD CONSTRAINT "AnonAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AnonQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonAnswer" ADD CONSTRAINT "AnonAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

