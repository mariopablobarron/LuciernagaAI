# Release Report Template (Hotfix / Incident-Aware)

## Release

- Fecha:
- Responsable:
- Entorno: produccion
- Tipo: hotfix
- Commit/Tag:
- Coolify Service:
- Ventana de despliegue:
- Severidad incidente: SEV-1 / SEV-2 / SEV-3

## Resumen ejecutivo

- Que se rompio:
- Impacto al usuario:
- Mitigacion aplicada:
- Estado actual:

## Timeline (UTC)

- Deteccion:
- Inicio mitigacion:
- Deploy hotfix:
- Recuperacion servicio:
- Cierre incidente:

## Scope del hotfix

- Cambio 1:
- Cambio 2:
- Cambio 3:

## Riesgo y rollback

- Riesgo principal del hotfix:
- Criterio de rollback:
- Paso de rollback:
- Responsable de rollback:

## Checklist pre-deploy (hotfix)

- [ ] Tests minimos de superficie afectada en verde
- [ ] Variables criticas validadas
- [ ] Migraciones validadas (si aplica)
- [ ] Rollback validado y ensayado

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

## Deploy

- Hora inicio:
- Hora fin:
- Resultado:
- Evidencia (Coolify logs/link):

## Validacion post-deploy (SLO critico)

- [ ] GET /api/health OK
- [ ] GET /api/ready OK
- [ ] Flujo primario recuperado
- [ ] Error rate normalizado
- [ ] Latencia dentro de umbral
- [ ] Alertas criticas apagadas
- Evidencia (capturas/logs/URLs):

## Monitoreo intensivo (30-60 min)

- [ ] Sin nuevos 5xx relevantes
- [ ] Sin reinicios del contenedor
- [ ] Sin degradacion en rutas criticas
- [ ] Sin backlog de jobs/colas

## Causa raiz (preliminar)

- Hipotesis principal:
- Evidencia:
- Confirmada: Si / No

## Acciones posteriores

- [ ] Postmortem completo (24h)
- [ ] Test de regresion agregado
- [ ] Alertas/observabilidad mejoradas
- [ ] Actualizacion de runbook

## Conclusion

- Estado final del hotfix: Aprobado / Aprobado con riesgo / Bloqueado
- Owner seguimiento:
- Fecha de cierre total:
