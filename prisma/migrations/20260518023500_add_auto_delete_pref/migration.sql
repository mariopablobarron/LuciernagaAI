-- UserPreferences.autoDeleteAfter30dInactive: opt-in del usuario para
-- que sus datos se borren automáticamente tras 30 días sin actividad
-- (lastSeen < now - 30d). Refuerza la promesa anonymous-first del producto:
-- "si no vuelvo, olvídame".
--
-- Default false: usuarios históricos mantienen comportamiento actual
-- (sus datos no se auto-borran). El usuario decide explícitamente desde
-- el modal de "Mis datos" si quiere activarlo.
--
-- El cron /api/cron/auto-delete-inactive (a programar en VPS crontab)
-- es el que efectivamente ejecuta el borrado periódicamente.

ALTER TABLE "UserPreferences" ADD COLUMN "autoDeleteAfter30dInactive" BOOLEAN NOT NULL DEFAULT false;
