-- AddForeignKey
ALTER TABLE "CrisisEvent"
ADD CONSTRAINT "CrisisEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
