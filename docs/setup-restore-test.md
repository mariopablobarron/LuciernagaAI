# Backup restore test — runbook

## Por qué

Un backup no probado es esperanza, no estrategia. Hasta hoy, no había forma automatizada de verificar que los backups generados realmente restauran. Este endpoint cubre ese hueco.

## Cómo funciona — sin necesidad de DB de staging

El endpoint corre dentro del propio contenedor de la app y usa la misma `DATABASE_URL` de producción, pero todo el restore ocurre en una **transacción que SIEMPRE termina con ROLLBACK** sobre un schema temporal aleatorio.

Pasos del restore real:

1. `BEGIN`
2. `CREATE SCHEMA "restore_test_<timestamp>_<rand>"`
3. `SET LOCAL search_path TO "<schema_temp>"`
4. Ejecuta el SQL del dump (CREATE TABLE + INSERT van al schema temp)
5. Cuenta tablas restauradas en el schema temp
6. Cuenta filas en `User`, `Message`, `Conversation` (smoke)
7. `ROLLBACK` (siempre, incluso si algo falla — el schema desaparece)

**Garantías:**
- Nada se commitea a producción.
- Schema temp se descarta automáticamente al rollback.
- Si falla a mitad, transacción aborta limpiamente.

## Endpoint

```
GET /api/cron/test-backup-restore?secret=$CRON_SECRET[&skipRestore=1]
```

| Param | Descripción |
|-------|-------------|
| `secret` | CRON_SECRET (obligatorio) |
| `skipRestore=1` | Solo validación estática (rápida ~1s, sin tocar DB) |

Lee el último `.sql.gz` de `BACKUP_DIR` (default `./backups`). Sin archivos → 404. Sin BACKUP_DIR accesible → 500.

## Programación recomendada

Mensual el 1er domingo a las 05:00 UTC en cron-job.org:

| Campo | Valor |
|-------|-------|
| Schedule | `0 5 1-7 * 0` |
| URL | `https://tresmilmillonesdelatidos.es/api/cron/test-backup-restore?secret=$CRON_SECRET` |
| Timeout | 300s |

Cada ejecución manda un mensaje a Telegram con el resultado (OK con métricas, o fallo con stage).

## Validación manual

```bash
# Test rápido (solo validación estática, no toca DB)
curl -s "https://tresmilmillonesdelatidos.es/api/cron/test-backup-restore?secret=$CRON_SECRET&skipRestore=1" | jq

# Test completo (incluye restore real al schema temp ~10-60s según tamaño)
curl -s "https://tresmilmillonesdelatidos.es/api/cron/test-backup-restore?secret=$CRON_SECRET" | jq
```

Respuesta exitosa:

```json
{
  "ok": true,
  "file": "backup_2026-05-05T03-00-00.sql.gz",
  "staticValidation": {
    "ok": true,
    "sqlBytes": 4523451,
    "hasHeader": true,
    "createTableCount": 105,
    "insertCount": 12345,
    "tablesDetected": ["User", "Message", "Conversation", ...],
    "reasons": []
  },
  "restoreTest": {
    "ok": true,
    "durationMs": 8421,
    "schemaName": "restore_test_1715059200_abc123",
    "tablesRestored": 105,
    "sampleCounts": { "User": 120, "Message": 4521, "Conversation": 234 }
  }
}
```

## Qué hacer si falla

| Stage | Causa probable | Acción |
|-------|----------------|--------|
| `connect` | DATABASE_URL mal o DB caída | Reiniciar `mentor-db`, revisar env |
| `create_schema` | Rol sin permiso CREATE | Verificar rol Postgres tiene CREATE on database |
| `execute_dump` | Dump corrupto / SQL inválido | Mirar dump manualmente, regenerar |
| `count` | Schema raro / búsqueda fallida | Bug del endpoint, abrir issue |

Si el `restoreResult.error` menciona `out of memory` o `statement timeout`: el dump es demasiado grande para hacer restore en una sola tx. En ese punto, mover a una DB de staging real (no schema temp) es el siguiente paso.

## Limitación conocida

El restore en schema temp **no valida tipos custom de Postgres** (enums, extensions). El dump generado por `/api/admin/backup` tampoco los incluye, así que no es problema con esos backups.

Si en el futuro generas backups con `pg_dump --create` que incluyen `CREATE EXTENSION` o `CREATE TYPE`, esos statements pueden fallar fuera del schema `public`. En ese momento, ajustar el restore para crear una DB efímera entera en lugar de un schema.
