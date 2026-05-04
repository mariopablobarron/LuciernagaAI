# Backup storage — fallback local cuando Telegram rechaza

## Problema que resuelve

Hasta hoy, cuando el dump comprimido superaba el límite de Telegram (49 MB), `sendAdminDocument` devolvía `size_exceeds_limit` y el backup **se descartaba en memoria sin guardarse en ningún sitio**. Aviso al admin, sí, pero pérdida real del backup.

## Solución actual

Cuando Telegram rechaza por tamaño, el endpoint `/api/admin/backup` ahora:

1. Persiste el `.sql.gz` en disco local (`BACKUP_DIR` env, default `./backups`).
2. Avisa al admin con el path completo.
3. Devuelve HTTP 200 con `persistedPath` en la respuesta — el cron lo registra como éxito (no como fallo).

Si el filesystem también falla (permisos, disco lleno), se devuelve 500 y se manda alerta crítica.

## ⚠️ Para que el backup sobreviva al recreo del contenedor

**El path debe ser un volumen Docker mapeado.** Si `BACKUP_DIR` apunta a `./backups` dentro del contenedor sin volume, el backup se pierde la próxima vez que Coolify recrea la imagen.

Edita `/docker/luciernaga-ai-traefik/docker-compose.yml` y añade:

```yaml
services:
  luciernaga-ai:
    image: cmnc4qjph0006p2a3ggmfdflz:c9c5c79
    container_name: luciernaga-ai
    restart: unless-stopped
    env_file:
      - .env-vars
    networks:
      - coolify
    volumes:                                    # ← añadir
      - /docker/luciernaga-ai-backups:/app/backups
    environment:                                # ← añadir
      - BACKUP_DIR=/app/backups
    labels:
      # ... (igual que antes)
```

Y antes del próximo `docker compose up -d`:

```bash
mkdir -p /docker/luciernaga-ai-backups
chmod 700 /docker/luciernaga-ai-backups
docker compose down && docker compose up -d
```

A partir de ahí, los backups grandes se guardan en `/docker/luciernaga-ai-backups/` del **host** y sobreviven a cualquier reboot/recreo del contenedor.

## Política de retención

El módulo `src/lib/backup-storage.ts` NO borra archivos antiguos automáticamente. Esto es intencional — la pérdida de un backup por borrado accidental es peor que pasarse de espacio.

Si quieres rotación, añade un cron simple en el host:

```bash
# /etc/cron.d/luciernaga-backup-rotate
0 5 * * * root find /docker/luciernaga-ai-backups -name "*.sql.gz" -mtime +30 -delete
```

(Borra los .sql.gz de hace más de 30 días. Ajusta según tu disco.)

## Migración a S3/R2 cuando llegue

Cuando decidas mover a S3/R2, el patrón es:

1. Añadir env vars `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.
2. Crear `src/lib/backup-storage-s3.ts` con la misma firma que `persistBackupLocally`.
3. En `route.ts`, intentar S3 primero, fallback a local, fallback a alerta.

No urgente — el filesystem local es suficiente hasta que el dump cruce de forma sostenida los 49 MB y empiezas a generar muchos archivos grandes.

## Verificación manual

```bash
# Disparar backup desde admin (cron-secret)
curl -s "https://tresmilmillonesdelatidos.es/api/admin/backup?secret=$CRON_SECRET" | jq

# Si responde con persistedPath, está en disco
ls -lh /docker/luciernaga-ai-backups/
```
