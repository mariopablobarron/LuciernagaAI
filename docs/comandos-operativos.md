# Comandos del proyecto

Este documento se genera automaticamente. Solo se actualiza cuando detecta cambios reales.

## Comandos npm

| Comando | Accion |
| --- | --- |
| npm run postinstall | Ejecuta prisma generate despues de instalar dependencias. |
| npm run dev | Inicia Next.js en modo desarrollo. |
| npm run build | Genera el build de produccion de Next.js. |
| npm run start | Levanta el servidor en modo produccion. |
| npm run lint | Ejecuta ESLint. |
| npm run test | Ejecuta Jest una vez, en modo secuencial (--runInBand). |
| npm run test:watch | Ejecuta Jest en modo watch. |
| npm run test:coverage | Ejecuta Jest y genera cobertura. |
| npm run system-check | Ejecuta scripts/system-check.sh (health + chat baseline). |
| npm run hardening:auto | Ejecuta scripts/auto-update-hardening-board.mjs. |
| npm run format | Ejecuta Prettier en modo escritura (--write .). |
| npm run format:check | Ejecuta Prettier en modo verificacion (--check .). |
| npm run agent | Ejecuta scripts/testing-agent.sh (modo por defecto). |
| npm run agent:run | Testing agent en modo run (tests una vez). |
| npm run agent:watch | Testing agent en modo watch. |
| npm run agent:health | Testing agent en modo health. |
| npm run agent:monitor | Testing agent en modo monitor (watch + health periodico). |
| npm run agent:ci | Testing agent en modo ci. |
| npm run agent:audit | Testing agent en modo audit. |
| npm run agent:hooks | Testing agent en modo hooks. |
| npm run test:telegram | Prueba envio Telegram (usa ADMIN_TELEGRAM_ID/TELEGRAM_CHAT_ID o getUpdates). |
| npm run docs:commands:update | Ejecuta: node scripts/auto-update-commands-doc.mjs |
| npm run docs:commands:check | Ejecuta: node scripts/auto-update-commands-doc.mjs --check |
| npm run backup:daily | Backup diario PostgreSQL con compresion, checksum, retencion y latest.sql.gz. |
| npm run backup:restore:latest | Restaura el ultimo backup en DATABASE_URL via psql. |

## Comandos operativos (no npm)

| Comando | Accion |
| --- | --- |
| npx prisma migrate deploy | Aplica migraciones pendientes en DB de produccion. |
| npx prisma generate | Regenera Prisma Client desde schema.prisma. |
| npx prisma studio | Abre interfaz visual para explorar y editar datos. |
| curl https://TU_DOMINIO/api/health | Health check general del servicio. |
| curl https://TU_DOMINIO/api/ready | Readiness check para trafico real. |
| curl -X POST https://TU_DOMINIO/api/cron/reminders -H "x-cron-secret: TU_SECRETO" | Ejecuta manualmente el job de recordatorios. |
| curl -X GET https://api.telegram.org/bot<TOKEN>/getUpdates | Consulta updates recientes del bot. |
| curl -X POST https://api.telegram.org/bot<TOKEN>/sendMessage -d "chat_id=<ID>" --data-urlencode "text=..." | Envia un mensaje manual por Telegram. |
| curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=https://TU_DOMINIO/api/telegram/webhook" | Registra o actualiza webhook de Telegram. |
| crontab -e | Edita tareas programadas del servidor. |
| docker build -t luciernaga-ai . | Construye imagen Docker local. |
| docker run --env-file .env -p 3000:3000 luciernaga-ai | Levanta contenedor local con variables de entorno. |
| git rev-parse --short HEAD | Muestra hash corto del commit actual. |
| git status --short | Muestra estado resumido de cambios locales. |
| git diff | Muestra diff de cambios no committeados. |

## Variables clave

| Variable | Uso |
| --- | --- |
| DATABASE_URL | Backup/restore y Prisma. |
| TELEGRAM_BOT_TOKEN | Envio de mensajes Telegram. |
| ADMIN_TELEGRAM_ID / TELEGRAM_CHAT_ID | Destino de alertas o pruebas Telegram. |
| CRON_SECRET | Seguridad para /api/cron/reminders. |
