-- Add nullable dedup key + unique compound for distributed cron locking.
-- Existing rows get NULL; in Postgres NULLs do not collide on UNIQUE, so the
-- unique constraint only enforces dedup for rows that explicitly set dedupKey.
ALTER TABLE "CronRunLog" ADD COLUMN "dedupKey" TEXT;

CREATE UNIQUE INDEX "CronRunLog_jobName_dedupKey_key" ON "CronRunLog"("jobName", "dedupKey");
