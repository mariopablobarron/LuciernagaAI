# Release Report - 2026-04-04

## Release

- Fecha: 2026-04-04
- Responsable: <completar>
- Entorno: produccion
- Commit/Tag: e15c3a5
- Coolify Service: mentor-web
- Ventana de despliegue: <completar>

## Objetivo del release

- Cerrar pendientes criticos de estabilidad y entrega continua: onboarding GDPR web, salida explicita de crisis, mejoras de engagement/admin, calibracion de coaching y compatibilidad de rutas/build en Next 16.

## Cambios incluidos

- Consentimiento web en onboarding (gate + persistencia API + pruebas focalizadas).
- Flujo explicito de salida de crisis por API para cierre consciente de estado.
- Ajustes de mentor protocol (avoidance streak + progress trend) y mejoras en sidebar/admin engagement.

## Checklist pre-deploy

- [x] Tests focalizados en verde
- [x] Variables criticas identificadas para Coolify
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
- Resultado: pendiente en produccion
- Evidencia (logs/link): <completar>

## Deploy

- Hora inicio: <completar>
- Hora fin: <completar>
- Resultado: pendiente
- Evidencia (Coolify logs/link): <completar>

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
- Evidencia (capturas/logs/URLs): <completar>

## Cron

- Endpoint: POST /api/cron/reminders
- Frecuencia: <completar>
- Auth header configurado: Bearer CRON_SECRET
- Resultado primer run: <completar>

## Monitoreo 30 min

- Errores relevantes: <completar>
- Alertas: <completar>
- Latencia percibida: <completar>
- Estado final: <completar>

## Incidencias

- ID/Descripcion: <completar>
- Impacto: <completar>
- Mitigacion: <completar>
- Estado: <completar>

## Rollback (si aplica)

- Se ejecuto rollback: Si / No
- Motivo: <completar>
- Hora: <completar>
- Resultado: <completar>

## Conclusion

- Estado final del release: Aprobado / Aprobado con riesgo / Bloqueado
- Proximas acciones:
  1. Aplicar migraciones en produccion.
  2. Activar cron de recordatorios con CRON_SECRET.
  3. Ejecutar validacion funcional con usuarios reales.
