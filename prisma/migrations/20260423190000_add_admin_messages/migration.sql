-- CreateTable
CREATE TABLE "AdminMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdByAdmin" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channels" TEXT NOT NULL DEFAULT 'in_app,email',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "notificationId" TEXT,

    CONSTRAINT "AdminMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminMessage_userId_sentAt_idx" ON "AdminMessage"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "AdminMessage_createdByAdmin_sentAt_idx" ON "AdminMessage"("createdByAdmin", "sentAt");

-- CreateIndex
CREATE INDEX "AdminMessage_readAt_idx" ON "AdminMessage"("readAt");

-- AddForeignKey
ALTER TABLE "AdminMessage" ADD CONSTRAINT "AdminMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
