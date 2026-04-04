# Release Report Template

## Release

- Fecha:
- Responsable:
- Entorno: produccion
- Commit/Tag:
- Coolify Service:
- Ventana de despliegue:

## Objetivo del release

-

## Cambios incluidos

-
-
-

## Checklist pre-deploy

- [ ] Tests focalizados en verde
- [ ] Variables criticas cargadas en Coolify
- [ ] Migraciones revisadas (prisma migrate status)
- [ ] Plan de rollback validado

## Variables validadas

- [ ] DATABASE_URL
- [ ] AUTH_TOKEN_SECRET
- [ ] ADMIN_USERNAME
- [ ] ADMIN_PASSWORD
- [ ] OPENROUTER_API_KEY
- [ ] TELEGRAM_BOT_TOKEN
- [ ] ADMIN_TELEGRAM_ID
- [ ] APP_BASE_URL
- [ ] CRON_SECRET
- [ ] EMAIL_PROVIDER
- [ ] EMAIL_API_KEY
- [ ] EMAIL_FROM

## Migraciones

- Comandos ejecutados:
  - npx prisma migrate status
  - npx prisma migrate deploy
- Resultado:
- Evidencia (logs/link):

## Deploy

- Hora inicio:
- Hora fin:
- Resultado:
- Evidencia (Coolify logs/link):

## Validacion post-deploy

- [ ] GET /api/health OK
- [ ] GET /api/ready OK
- [ ] Home carga
- [ ] Onboarding + GDPR gate OK
- [ ] Chat responde
- [ ] Admin login OK
- [ ] Panel admin OK (engagement score visible)
- [ ] POST /api/user/crisis-exit OK
- [ ] Telegram webhook OK (si aplica)
- Evidencia (capturas/logs/URLs):

## Cron

- Endpoint: POST /api/cron/reminders
- Frecuencia:
- Auth header configurado: Bearer CRON_SECRET
- Resultado primer run:

## Monitoreo 30 min

- Errores relevantes:
- Alertas:
- Latencia percibida:
- Estado final:

## Incidencias

- ID/Descripcion:
- Impacto:
- Mitigacion:
- Estado:

## Rollback (si aplica)

- Se ejecuto rollback: Si / No
- Motivo:
- Hora:
- Resultado:

## Conclusion

- Estado final del release: Aprobado / Aprobado con riesgo / Bloqueado
- Proximas acciones:
  1.
  2.
  3.
