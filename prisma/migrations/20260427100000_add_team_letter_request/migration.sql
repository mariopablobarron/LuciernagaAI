-- CreateTable
CREATE TABLE "TeamLetterRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "context" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "sentByAdminId" TEXT,
    "notes" TEXT,

    CONSTRAINT "TeamLetterRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamLetterRequest_status_requestedAt_idx" ON "TeamLetterRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "TeamLetterRequest_userId_requestedAt_idx" ON "TeamLetterRequest"("userId", "requestedAt");

-- AddForeignKey
ALTER TABLE "TeamLetterRequest" ADD CONSTRAINT "TeamLetterRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
