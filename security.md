# Auditoría de Seguridad — Tres Mil Millones de Latidos
_Generada: 2026-05-12 | Actualizada: 2026-05-12 | Estado: ✅ código limpio_

---

## CRÍTICO

### C-1 · OAuth2 Client Secret hardcodeado en scripts Python
**Archivos:** `~/Documents/grant_ga4_access.py`, `grant_gsc_access.py`, `grant_gsc_v2.py`
**Líneas:** 14-22 en cada archivo
**Problema:** `CLIENT_SECRET = "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"` en texto plano.
Permite a cualquiera iniciar un flujo OAuth2 haciéndose pasar por la app.
**Estado:** ⚠️ Scripts fuera del repo (no comprometidos en Git). Considerar revocar si los archivos fueron compartidos.
**Fix:** Mover a `~/.env.scripts` y leerlos con `python-dotenv`. Añadir `grant_*.py` a `.gitignore` global.

---

## MEDIO

### M-1 · `/api/admin/routines/diag` sin autenticación
**Archivo:** `src/app/api/admin/routines/diag/route.ts`
**Problema:** GET público que devuelve metadatos del `ROUTINES_REGISTER_SECRET` (longitud, si es hex) — reduce espacio de fuerza bruta.
**Estado:** ✅ CORREGIDO — añadido `requireCronSecret`

### M-2 · `/api/health` expone nombres de env vars faltantes sin auth
**Archivo:** `src/app/api/health/route.ts`
**Problema:** Endpoint público devuelve en `missingVars` los nombres de variables de entorno críticas no configuradas.
**Estado:** ✅ CORREGIDO — en producción, detalles solo con `x-health-token` o eliminados

---

## BAJO

### B-1 · Credenciales de admin por defecto en desarrollo
**Archivo:** `src/lib/admin-auth.ts` ~línea 81
**Problema:** Fallback `admin`/`admin123` si las vars no están configuradas. Riesgo en deploys con `NODE_ENV != production`.
**Estado:** ✅ CORREGIDO — lanza error si faltan vars en entorno con DB

### B-2 · IP y app ID de Coolify hardcodeados como fallback
**Archivo:** `src/app/api/admin/check-pending-deploy/route.ts`
**Problema:** `http://72.61.195.108:3000/applications/cmnc4qjph0006p2a3ggmfdflz` visible en código.
**Estado:** ✅ CORREGIDO — fallback hardcodeado eliminado, usa solo `COOLIFY_APP_URL` env var

### B-3 · `TELEGRAM_WEBHOOK_SECRET` opcional en producción
**Archivo:** `src/app/api/telegram/webhook/route.ts`
**Problema:** Si no está configurado, el webhook acepta cualquier POST (solo warning, no reject).
**Estado:** ✅ CORREGIDO — en producción, webhook secret es obligatorio

### B-4 · CRON_SECRET expuesto en query string (`?secret=`)
**Archivo:** `src/lib/cron-auth.ts`
**Problema:** Query params aparecen en access logs. El código también acepta header `x-cron-secret` (preferible).
**Estado:** 📋 PENDIENTE (operacional) — configurar cron-job.org para usar header en vez de query param

### B-5 · `/api/email/unsubscribe` sin token firmado
**Archivo:** `src/app/api/email/unsubscribe/route.ts`
**Problema:** Cualquiera puede desuscribir a cualquier email conociendo la dirección. Sin auth ni token.
**Estado:** ✅ CORREGIDO — unsubscribe requiere token HMAC firmado generado al enviar emails

### B-6 · `/api/contact` — inyección Markdown Telegram
**Archivo:** `src/app/api/contact/route.ts`
**Problema:** `name` interpolado sin escapar en MarkdownV2 de Telegram. Puede romper formato.
**Estado:** ✅ CORREGIDO — escapado de caracteres especiales Telegram

### B-7 · `/api/calculator/email` — validación de email mínima
**Archivo:** `src/app/api/calculator/email/route.ts`
**Problema:** Solo verifica `includes("@")`. Sin Zod ni regex RFC 5322.
**Estado:** ✅ CORREGIDO — validación con Zod

### B-8 · `/api/admin/routines/diag` pixel de tracking sin auth
**Archivo:** `src/app/api/admin-message/[id]/track/route.ts`
**Problema:** Cualquier agente HTTP puede marcar AdminMessage como leído sin autenticación.
**Estado:** ✅ CORREGIDO — tokens de tracking firmados con HMAC

### B-9 · Token de familia como único auth — sin rate limiting
**Archivo:** `src/app/api/family/[token]/ping/route.ts`
**Problema:** Sin validación de formato CUID del pingId, sin rate limiting.
**Estado:** ✅ CORREGIDO — validación de CUID + rate limiting por IP

---

## INFORMATIVO

### I-1 · `$queryRawUnsafe` protegido
Solo en `/api/admin/cleanup-rolled-back-migrations/route.ts`, detrás de `requireCronSecret` con IDs de la propia DB.

### I-2 · IDOR no aplicable en rutas usuario
Las rutas de usuario derivan `userId` del token de sesión autenticado, no de parámetros URL.

### I-3 · `.env` no comprometido
`.gitignore` excluye `.env*` correctamente. `.env.example` solo tiene claves vacías.

---

## Pendiente operacional (sin código)
- [ ] **B-4**: Configurar cron-job.org para usar header `x-cron-secret` en vez de `?secret=`
- [ ] **C-1**: Revocar `CLIENT_SECRET` de OAuth2 en GCP Console si los scripts Python fueron compartidos

---
_Última actualización: 2026-05-12_
