# Release Checklist (Slack)

Copia y pega este bloque en Slack para ejecucion rapida.

## Pre-deploy

- [ ] Tests focalizados en verde
- [ ] Variables criticas en Coolify
- [ ] Migraciones OK (status + deploy)

## Deploy

- [ ] Deploy ejecutado en Coolify
- [ ] Build/Start en verde

## Post-deploy

- [ ] /api/health OK
- [ ] /api/ready OK
- [ ] Home + onboarding GDPR OK
- [ ] Chat OK
- [ ] Admin login + users panel OK
- [ ] /api/user/crisis-exit OK
- [ ] Telegram webhook OK (si aplica)

## Cron

- [ ] /api/cron/reminders activo con Bearer CRON_SECRET

## Monitoreo 30 min

- [ ] Sin errores criticos en logs
- [ ] Sin degradacion visible

## Cierre

- [ ] Release aprobado
- [ ] Riesgos/remanentes documentados
