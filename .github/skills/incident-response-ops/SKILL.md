---
name: incident-response-ops
description: "Gestiona incidentes operativos del SaaS con enfoque de contencion, diagnostico y recuperacion. Usar para caidas de chat, errores de proveedor IA, fallas de DB, alertas de crisis y degradaciones post-deploy. Keywords: incident, outage, oncall, production, rollback, healthcheck, ready, alerts, postmortem."
argument-hint: "Sintoma observado, entorno afectado, severidad e impacto de usuarios"
user-invocable: true
---

# Incident Response Ops

## Cuando usar

- Caida o degradacion en produccion/staging.
- Alertas repetidas por crisis, evitacion o servicios externos.
- Fallos en /api/health o /api/ready despues de despliegue.

## Procedimiento

1. Clasificar severidad por impacto de usuario y alcance (chat, auth, admin, datos).
2. Ejecutar triage rapido: health, ready, logs y ultimo cambio desplegado.
3. Contener: rollback, feature flag o degradacion controlada con fallback seguro.
4. Diagnosticar causa raiz probable (DB, proveedor IA, credenciales, migracion, rate limit).
5. Verificar recuperacion extremo a extremo: login admin, chat, persistencia y alertas.
6. Registrar postmortem corto con accion correctiva y accion preventiva.

## Checklist de recuperacion

- Endpoints /api/health y /api/ready en estado correcto.
- Flujo de chat funcional sin errores criticos.
- Integraciones externas estables o en fallback declarado.
- Alertas bajo control sin tormenta de notificaciones.

## Referencias del repo

- Runbook deploy: ../../COOLIFY_DEPLOY_STEPS.md
- Quick ref: ../../COOLIFY_QUICK_REF.md
- Health endpoint: ../../src/app/api/health/route.ts
- Ready endpoint: ../../src/app/api/ready/route.ts
- Alertas: ../../src/lib/alerts.ts
- Logging: ../../src/lib/logger.ts
