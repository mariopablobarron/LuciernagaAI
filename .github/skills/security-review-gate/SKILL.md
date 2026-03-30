---
name: security-review-gate
description: "Ejecuta revisiones de seguridad aplicadas al SaaS antes de merge o release. Usar para auth, sesiones, rutas admin, validacion de inputs, fuga de secretos y hardening de APIs. Keywords: security, auth, authorization, token, session, owasp, hardening, vulnerability, review."
argument-hint: "Cambio a revisar, superficie de ataque y nivel de severidad esperado"
user-invocable: true
---

# Security Review Gate

## Cuando usar

- Cambios en autenticacion o autorizacion.
- Nuevos endpoints o cambios de contrato en API.
- Antes de release en cambios sensibles de datos o admin.

## Procedimiento

1. Mapear superficies de ataque: endpoints, admin, webhooks, integraciones externas.
2. Revisar authn/authz: sesiones, cookies, headers, privilegios y aislamiento por usuario.
3. Validar entradas/salidas: esquema, sanitizacion, errores y logging de datos sensibles.
4. Verificar secretos: variables de entorno, rastros en logs y configuracion de build/deploy.
5. Confirmar controles anti abuso: rate limit, bloqueo de brute force y deduplicacion de alertas.
6. Emitir hallazgos por severidad con fix rapido y fix robusto.

## Checklist de salida

- Sin bypass evidente de rutas admin.
- Sin exposicion de credenciales, tokens o PII en respuestas/logs.
- Sin validaciones faltantes en request body/query/header.
- Sin regresion de controles de sesion.

## Referencias del repo

- Auth usuario: ../../src/lib/auth.ts
- Auth admin: ../../src/lib/admin-auth.ts
- Proteccion admin: ../../src/proxy.ts
- Rate limiting: ../../src/lib/rate-limit.ts
- Config seguridad app: ../../next.config.ts
