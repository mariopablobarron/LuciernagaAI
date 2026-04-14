ALTER TABLE "User" ADD COLUMN "latidos" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "LatidoTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LatidoTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LatidoTransaction_userId_createdAt_idx" ON "LatidoTransaction"("userId", "createdAt");
CREATE INDEX "LatidoTransaction_reason_createdAt_idx" ON "LatidoTransaction"("reason", "createdAt");

ALTER TABLE "LatidoTransaction" ADD CONSTRAINT "LatidoTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
