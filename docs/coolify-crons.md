# Cron Jobs — Configuracion para Coolify

Todos los endpoints requieren `CRON_SECRET` como query parameter.
La variable ya debe estar configurada en Coolify como env var del servicio.

Reemplaza `$DOMAIN` por `https://tresmilmillonesdelatidos.es` (o el dominio que corresponda).

> **Scheduler actual**: cron-job.org (externo). El antiguo `vercel.json` fue
> eliminado el 2026-04-22 porque el deploy en Coolify no lo ejecuta.
> Para el estado operativo (qué crons están realmente programados y cuáles
> faltan por añadir en cron-job.org), ver `reference_external_crons.md` en
> memoria. Este doc es la referencia tecnica completa.

---

## Tareas diarias

```bash
# 03:00 UTC — Backup de base de datos
curl -sf "$DOMAIN/api/admin/backup?secret=$CRON_SECRET" -o /dev/null

# 08:00 UTC — Recordatorios generales (email + Telegram)
curl -sf "$DOMAIN/api/cron/reminders?secret=$CRON_SECRET" -o /dev/null

# 08:00 UTC — Revision proactiva (detecta usuarios en riesgo, alerta admin)
curl -sf "$DOMAIN/api/cron/proactive-review?secret=$CRON_SECRET" -o /dev/null

# 09:00 UTC — Recordatorios de acciones pendientes (Telegram)
curl -sf "$DOMAIN/api/cron/action-reminders?secret=$CRON_SECRET" -o /dev/null

# 09:00 UTC — Check-in matutino (Telegram)
curl -sf "$DOMAIN/api/cron/telegram-checkin?secret=$CRON_SECRET&period=morning" -o /dev/null

# 10:00 UTC — Deteccion de usuarios inactivos (alerta a contactos de confianza)
curl -sf "$DOMAIN/api/cron/inactivity-check?secret=$CRON_SECRET" -o /dev/null

# 21:00 UTC — Check-in nocturno (Telegram)
curl -sf "$DOMAIN/api/cron/telegram-checkin?secret=$CRON_SECRET&period=evening" -o /dev/null

# 04:00 UTC — Scan midpoint de videos avatar (detecta usuarios con goal activo en estado bajo
# y genera video de fase MIDPOINT). Sujeto a maxVideosPerDay en AvatarVideoConfig.
curl -sf "$DOMAIN/api/cron/goal-avatar-midpoint?secret=$CRON_SECRET" -o /dev/null

# 03:15 UTC — Backfill retroactivo de campos de activacion (idempotente, no-op si todo esta poblado).
# Rellena firstMessageSentAt, activatedAt, onboardingCompletedAt en usuarios historicos.
curl -sf "$DOMAIN/api/cron/backfill-activation?secret=$CRON_SECRET&limit=500" -o /dev/null

# 10:00 UTC — Nudge a usuarios que no han vuelto en 24h desde signup (email).
curl -sf "$DOMAIN/api/cron/24h-nudge?secret=$CRON_SECRET" -o /dev/null

# 02:00 UTC — Purga de logs antiguos (SystemLog 30d, EmailLog/CronRunLog 90d, WebhookLog 30d).
curl -sf "$DOMAIN/api/cron/purge-logs?secret=$CRON_SECRET" -o /dev/null

# 23:05 UTC — Crea la ronda diaria de la Cafeteria para el dia siguiente.
curl -sf "$DOMAIN/api/cron/daily-round-create?secret=$CRON_SECRET" -o /dev/null
```

## Tareas de frecuencia intermedia

```bash
# Cada 2h — Procesa cola de emails programados (ScheduledEmail).
curl -sf "$DOMAIN/api/cron/scheduled-emails?secret=$CRON_SECRET" -o /dev/null
```

## Tareas de alta frecuencia

```bash
# Cada 10 min — Polling de HeyGen (descarga videos avatar listos y actualiza estados).
# Cubre tanto los videos del arco del goal como los broadcasts del equipo.
curl -sf "$DOMAIN/api/cron/poll-avatar-videos?secret=$CRON_SECRET" -o /dev/null
```

## Tareas semanales

```bash
# Lunes 09:00 UTC — Resumen semanal admin (Telegram)
curl -sf "$DOMAIN/api/cron/weekly-summary?secret=$CRON_SECRET" -o /dev/null

# Lunes 10:00 UTC — Email a usuarios inactivos 7+ dias
curl -sf "$DOMAIN/api/cron/weekly-inactive-reminder?secret=$CRON_SECRET" -o /dev/null

# Domingo 20:00 UTC — Resumen semanal por usuario (email + Telegram)
curl -sf "$DOMAIN/api/cron/user-weekly-review?secret=$CRON_SECRET" -o /dev/null
```

## Expresiones cron para Coolify

| Tarea | Expresion cron | Comando |
|-------|---------------|---------|
| Backup BD | `0 3 * * *` | `curl -sf "$DOMAIN/api/admin/backup?secret=$CRON_SECRET" -o /dev/null` |
| Recordatorios | `0 8 * * *` | `curl -sf "$DOMAIN/api/cron/reminders?secret=$CRON_SECRET" -o /dev/null` |
| Revision proactiva | `0 8 * * *` | `curl -sf "$DOMAIN/api/cron/proactive-review?secret=$CRON_SECRET" -o /dev/null` |
| Action reminders | `0 9 * * *` | `curl -sf "$DOMAIN/api/cron/action-reminders?secret=$CRON_SECRET" -o /dev/null` |
| Check-in manana | `0 9 * * *` | `curl -sf "$DOMAIN/api/cron/telegram-checkin?secret=$CRON_SECRET&period=morning" -o /dev/null` |
| Inactividad | `0 10 * * *` | `curl -sf "$DOMAIN/api/cron/inactivity-check?secret=$CRON_SECRET" -o /dev/null` |
| Check-in noche | `0 21 * * *` | `curl -sf "$DOMAIN/api/cron/telegram-checkin?secret=$CRON_SECRET&period=evening" -o /dev/null` |
| Resumen admin | `0 9 * * 1` | `curl -sf "$DOMAIN/api/cron/weekly-summary?secret=$CRON_SECRET" -o /dev/null` |
| Inactivos semanal | `0 10 * * 1` | `curl -sf "$DOMAIN/api/cron/weekly-inactive-reminder?secret=$CRON_SECRET" -o /dev/null` |
| Review usuario | `0 20 * * 0` | `curl -sf "$DOMAIN/api/cron/user-weekly-review?secret=$CRON_SECRET" -o /dev/null` |
| Avatar midpoint scan | `0 4 * * *` | `curl -sf "$DOMAIN/api/cron/goal-avatar-midpoint?secret=$CRON_SECRET" -o /dev/null` |
| Avatar poll (HeyGen) | `*/10 * * * *` | `curl -sf "$DOMAIN/api/cron/poll-avatar-videos?secret=$CRON_SECRET" -o /dev/null` |
| Backfill activacion | `15 3 * * *` | `curl -sf "$DOMAIN/api/cron/backfill-activation?secret=$CRON_SECRET&limit=500" -o /dev/null` |
| 24h nudge | `0 10 * * *` | `curl -sf "$DOMAIN/api/cron/24h-nudge?secret=$CRON_SECRET" -o /dev/null` |
| Scheduled emails | `0 */2 * * *` | `curl -sf "$DOMAIN/api/cron/scheduled-emails?secret=$CRON_SECRET" -o /dev/null` |
| Purge logs | `0 2 * * *` | `curl -sf "$DOMAIN/api/cron/purge-logs?secret=$CRON_SECRET" -o /dev/null` |
| Daily round create | `5 23 * * *` | `curl -sf "$DOMAIN/api/cron/daily-round-create?secret=$CRON_SECRET" -o /dev/null` |

## Aparcados (no programar hasta activar dependencia)

| Endpoint | Bloqueado por | Desbloquear cuando |
|----------|---------------|---------------------|
| `/api/cron/circle-sync-scheduler` | `CircleSyncBanner` no se renderiza en ninguna pagina (UI huerfana) | Se decida lanzar la comunidad Circle Sync |

> Los crons de avatar video ya estan en la tabla porque son no-op silenciosos si `AvatarVideoConfig.enabled=false`. Son seguros de dejar programados aunque HeyGen aun no este activo.

## Disparos manuales desde el admin

Para no depender del scheduler cuando quieres forzar una ejecucion puntual:

| Accion | Donde | Endpoint subyacente |
|--------|-------|---------------------|
| Backfill retroactivo de activacion | `/admin/analytics/activacion` → boton "Backfill retroactivo" | `POST /api/admin/backfill-activation` (permiso `operations`) |
| Backup BD ad-hoc | `$DOMAIN/api/admin/backup?secret=$CRON_SECRET` en navegador (descarga SQL comprimido) | `GET /api/admin/backup` |

## Notas

- Todos los endpoints devuelven `{ ok: true, ... }` en exito y `{ error: "..." }` en fallo.
- Si un cron falla, se envia alerta automatica a Telegram y email (deduplicacion de 30 min).
- El backup genera un SQL comprimido y notifica por Telegram con tamano y numero de tablas.
- Los flags `cronDailyCheckin`, `cronWeeklyReview`, `cronWeeklyInactiveReminder` se pueden desactivar desde la tabla `NotificationConfig` sin necesidad de tocar los crons.
- Los crons de avatar video (`goal-avatar-midpoint`, `poll-avatar-videos`) son no-op silenciosos si `AvatarVideoConfig.enabled=false`. El kill switch global esta en `/admin/marketing/avatar-videos`.
- `backfill-activation` es idempotente: programarlo a diario es seguro (no-op si no hay usuarios con campos vacios). El boton del admin sirve para pasadas puntuales despues de migraciones o imports.
