-- Internal admin notes board — lightweight follow-up / reminder table.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "AdminNote" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "tag" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdBy" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminNote_status_createdAt_idx" ON "AdminNote"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminNote_tag_status_idx" ON "AdminNote"("tag", "status");
CREATE INDEX IF NOT EXISTS "AdminNote_priority_status_idx" ON "AdminNote"("priority", "status");

-- Seed: pending items known at migration time. Idempotent via ON CONFLICT.
INSERT INTO "AdminNote" ("id", "title", "body", "tag", "priority", "status", "createdBy", "createdAt", "updatedAt")
VALUES
  ('seed_notes_migrate_referrals',
   'Aplicar migración 20260418180000_extend_invitation_referrals en Coolify',
   'Añade usedByUserId, reason e índices a Invitation. Sin esto el panel de Referidos no rellenará datos y el signup silenciosamente no vinculará al referido.',
   'migration', 'high', 'open', 'claude', NOW(), NOW()),

  ('seed_notes_migrate_site_content',
   'Aplicar migración 20260418170000_add_site_content_and_media',
   'Crea SiteContent y MediaAsset. Requerida para que los overrides i18n y el endpoint /api/media funcionen.',
   'migration', 'high', 'open', 'claude', NOW(), NOW()),

  ('seed_notes_migrate_tags_testimonials',
   'Aplicar migración 20260415030000_add_user_tags_and_testimonials',
   'Añade User.tags y campos de testimonials. El panel de Tagging y la sección pública de testimonials dependen de esto.',
   'migration', 'high', 'open', 'claude', NOW(), NOW()),

  ('seed_notes_migrate_admin_notes',
   'Aplicar migración 20260418190000_add_admin_notes',
   'Esta misma tabla. Tras aplicarla la página /admin/notas funciona. Eliminar esta nota una vez verificado.',
   'migration', 'medium', 'open', 'claude', NOW(), NOW()),

  ('seed_notes_cron_referral_30d',
   'Programar cron diario /api/cron/referral-30d-active en Coolify',
   'GET con ?secret=$CRON_SECRET. Otorga invitación + badge active_30d a usuarios con 30+ días de antigüedad y actividad reciente.',
   'cron', 'medium', 'open', 'claude', NOW(), NOW()),

  ('seed_notes_cron_backup',
   'Configurar cron de backup daily-backup en Coolify',
   'Curl al endpoint de backup a las 3am UTC. Pendiente desde antes de esta sesión.',
   'cron', 'medium', 'open', 'claude', NOW(), NOW()),

  ('seed_notes_verify_integrations',
   'Verificar integraciones externas: Resend, Hostinger email, GA4, Search Console, Google Business Profile',
   'Pendiente revisar que las credenciales y envíos sigan funcionando tras cambios recientes.',
   'env', 'low', 'open', 'claude', NOW(), NOW()),

  ('seed_notes_coolify_webhook_404',
   'Investigar webhook de Coolify devolviendo 404',
   'Identificado en el incidente del 14-abr. El webhook no dispara builds en ciertas condiciones — confirmar URL y secret.',
   'incident', 'medium', 'open', 'claude', NOW(), NOW()),

  ('seed_notes_schema_drift_statuschecks',
   'Arreglar schema drift en statusChecks.ts (processedAt inexistente)',
   'tsc reportó que processedAt no existe en ScheduledEmailWhereInput. Mismo patrón del incidente del 14-abr.',
   'incident', 'medium', 'open', 'claude', NOW(), NOW()),

  ('seed_notes_referral_e2e',
   'Hacer prueba E2E del flujo de referrals',
   'Abrir /i/[code] → /unirse → /signup, verificar que el referido recibe +50 latidos y que al hacer su primer check-in el invitador recibe +30 + badge invite_used + notificación.',
   'referrals', 'medium', 'open', 'claude', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
