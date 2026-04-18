-- Cleanup: reflect reality on the seeded admin notes.
-- The 4 migration-related notes are auto-applied by this same redeploy
-- (Dockerfile runs `prisma migrate deploy`). The referral-30d-active cron
-- has already been configured externally by the user (cron-job.org).
-- Idempotent: only updates still-open rows.

UPDATE "AdminNote"
SET "status" = 'done',
    "resolvedAt" = NOW(),
    "resolvedBy" = 'auto_redeploy',
    "updatedAt" = NOW()
WHERE "id" IN (
    'seed_notes_migrate_referrals',
    'seed_notes_migrate_site_content',
    'seed_notes_migrate_tags_testimonials',
    'seed_notes_migrate_admin_notes'
) AND "status" = 'open';

UPDATE "AdminNote"
SET "status" = 'done',
    "resolvedAt" = NOW(),
    "resolvedBy" = 'mario',
    "body" = COALESCE("body", '') || E'\n\n[Configurado en cron-job.org el 2026-04-18]',
    "updatedAt" = NOW()
WHERE "id" = 'seed_notes_cron_referral_30d' AND "status" = 'open';
