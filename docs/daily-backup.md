# Copia de seguridad diaria (PostgreSQL)

Este proyecto incluye un script para generar respaldos diarios comprimidos de la base de datos.

## 1) Requisitos

- Variable `DATABASE_URL` configurada
- Binarios disponibles en el host:
  - `pg_dump`
  - `psql` (solo para restaurar)
  - `gzip`

## 2) Ejecucion manual

```bash
npm run backup:daily
```

Salida esperada:

- Archivo en `./backups/db/luciernaga_YYYY-MM-DD_HHMMSS.sql.gz`
- Enlace simbolico en `./backups/db/latest.sql.gz`

## 3) Configuracion cron (diario 02:30)

```bash
crontab -e
```

Agregar:

```cron
30 2 * * * cd /Users/STARTIDEA/luciernaga-ai && /bin/bash -lc 'export DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB" BACKUP_RETENTION_DAYS=14; npm run backup:daily >> logs/db-backup.log 2>&1'
```

## 4) Retencion

Por defecto mantiene 14 dias. Se controla con:

- `BACKUP_RETENTION_DAYS` (entero > 0)

## 5) Restaurar ultimo backup

```bash
npm run backup:restore:latest
```

## 6) Restaurar backup especifico

```bash
gunzip -c ./backups/db/luciernaga_YYYY-MM-DD_HHMMSS.sql.gz | psql "$DATABASE_URL"
```

## 7) Recomendaciones operativas

- Guardar copias tambien fuera del servidor (S3, R2, o almacenamiento externo).
- Probar restauracion al menos 1 vez por semana.
- Monitorizar tamano de `./backups/db` y el log `logs/db-backup.log`.
