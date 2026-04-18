-- Add AdminNote: verificar que Coolify tenga backup automático de la DB.
-- Surgido tras configurar el cron daily-backup en cron-job.org, que en
-- realidad es solo un ping de salud (descarta el .sql.gz que devuelve el
-- endpoint). Si no hay backup nativo en Coolify, no hay backup real.
-- Idempotente via ON CONFLICT.

INSERT INTO "AdminNote" ("id", "title", "body", "tag", "priority", "status", "createdBy", "createdAt", "updatedAt")
VALUES (
    'seed_notes_verify_coolify_backup',
    'Verificar que Coolify tenga backup automático de la DB',
    'El cron daily-backup en cron-job.org solo sirve como ping de salud: el endpoint /api/admin/backup devuelve un .sql.gz en el body de la respuesta y cron-job.org lo descarta. NO es backup real.

Pasos para verificar:
1. Entrar a Coolify → seleccionar la base de datos del proyecto.
2. Pestaña "Backups".
3. Comprobar que hay un schedule activo (ideal: diario, retención >= 7 días).
4. Si no lo hay, activarlo o refactorizar /api/admin/backup para subir el .gz a S3/B2/Dropbox.

Hasta confirmar esto, NO hay backup real de la DB — solo descargas manuales desde /admin/operaciones.',
    'env',
    'high',
    'claude',
    NOW(),
    NOW()
)
ON CONFLICT ("id") DO NOTHING;
