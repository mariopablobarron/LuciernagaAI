---
name: coolify-prod-deploy
description: "Prepara y verifica despliegues productivos en Coolify para este SaaS. Usar para release checklist, validacion de variables, health/ready checks y troubleshooting post-deploy. Keywords: coolify, deploy, docker, production, healthcheck, ready, release."
argument-hint: "Entorno objetivo, version a desplegar y incidente o objetivo"
user-invocable: true
---

# Coolify Production Deploy

## Cuando usar

- Preparar salida a produccion.
- Verificar que un despliegue quedo estable.
- Resolver fallas de arranque, healthcheck o variables.

## Procedimiento

1. Verificar variables criticas y secretos requeridos.
2. Confirmar build y pruebas minimas antes de deploy.
3. Validar Dockerfile y configuracion de servicio en Coolify.
4. Tras desplegar, comprobar endpoints de health y ready.
5. Probar flujo minimo funcional: login admin y chat.
6. Revisar logs y alertas para detectar degradaciones tempranas.

## Checklist rapido

- OPENROUTER_API_KEY, DATABASE_URL, AUTH_TOKEN_SECRET definidos.
- Credenciales admin seguras y no hardcodeadas.
- Migraciones aplicadas.
- /api/health y /api/ready operativos.

## Referencias del repo

- Guia detallada: ../../COOLIFY_DEPLOY_STEPS.md
- Guia rapida: ../../COOLIFY_QUICK_REF.md
- Contenedor: ../../Dockerfile
