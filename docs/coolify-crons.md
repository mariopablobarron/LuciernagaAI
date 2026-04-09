# Cron Jobs — Configuracion para Coolify

Todos los endpoints requieren `CRON_SECRET` como query parameter.
La variable ya debe estar configurada en Coolify como env var del servicio.

Reemplaza `$DOMAIN` por `https://tresmilmillonesdelatidos.es` (o el dominio que corresponda).

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

## Notas

- Todos los endpoints devuelven `{ ok: true, ... }` en exito y `{ error: "..." }` en fallo.
- Si un cron falla, se envia alerta automatica a Telegram y email (deduplicacion de 30 min).
- El backup genera un SQL comprimido y notifica por Telegram con tamano y numero de tablas.
- Los flags `cronDailyCheckin`, `cronWeeklyReview`, `cronWeeklyInactiveReminder` se pueden desactivar desde la tabla `NotificationConfig` sin necesidad de tocar los crons.
