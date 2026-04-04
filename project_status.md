# Luciérnaga — Estado del Proyecto

Última actualización: 2026-03-30

---

## CRÍTICO

- [ ] Validar migraciones en producción
  - `20260330220000_add_telegram_consent_fields` — pendiente `prisma migrate deploy`
  - `20260330230000_add_user_activity_fields` — pendiente `prisma migrate deploy`
  - Sin esto: bot de Telegram falla silenciosamente en `touchTelegramUser`
- [x] Unificar variables de contexto en chat route
  - `progressTrend` → `continuity.trend` en coach prompt
  - Cálculo doble de `transformationPhase`/`mentorMode` eliminado
  - `avoidanceCount` se pre-carga al inicio y se resetea al completar acción
- [ ] Revisar flujo de crisis
  - Crisis se activa por keywords pero se desactiva solo por tiempo (`crisisActiveUntil`)
  - Ya existe salida explícita de crisis vía endpoint `POST /api/user/crisis-exit`
  - Falta validar el flujo completo en producción con usuarios reales
  - `sendAdminUserAlert` en Telegram falla silenciosamente si `ADMIN_TELEGRAM_ID` no está configurado

---

## IMPORTANTE

- [ ] Ajustar tono del coach
  - El modo `confrontation` se activa si `avoidanceCount >= 2` histórico (nunca se limpia)
  - El modo `supportive` con `pushAction: true` desde el mensaje 2 puede ser agresivo
  - Ya se añadió calibración por `progressTrend` y `avoidanceStreak` para evitar confrontación prematura
  - Falta validación con datos reales para ajustar umbrales
- [ ] Test con usuarios reales
  - Onboarding guiado (3 pasos) no ha sido validado con nadie aún
  - Flujo de consentimiento Telegram no ha sido testeado en producción
  - Rate limiting (5/min, 30/h) puede ser demasiado restrictivo para sesiones largas
- [x] Añadir `lastMessageAt` al schema
  - Campo en `User`, migración creada, recordatorios usan `lastMessageAt` con fallback a `lastSeen`
- [ ] Configurar `CRON_SECRET` y programar cron de recordatorios
  - El endpoint `/api/cron/reminders` existe pero no hay cron activo

---

## MEJORAS

- [x] `engagementScore` para el panel admin
  - Actualmente el panel usa 6+ columnas para inferir engagement
  - Score 0–100 implementado y visible en lista de usuarios admin
- [x] Racha de evasión (`avoidanceStreak`)
  - Solo existe `avoidanceCount` total; no hay "turnos consecutivos evadiendo"
  - Implementado en servicios y conectado al protocolo del mentor
- [ ] Optimizar `searchWeb`
  - Se llama en cada mensaje donde `needsExternalInfo` es true
  - Sin caché: si el mismo usuario hace la misma pregunta, se vuelve a buscar
- [x] Mejorar UI sidebar
  - El sidebar no muestra estado emocional actual ni racha
  - Conversaciones sin título muestran "Nueva conversación" — falta auto-título
- [x] Onboarding web — consentimiento GDPR
  - El onboarding guiado (3 pasos) existe pero no incluye un gate de consentimiento
  - Gate implementado en web + persistencia vía `POST /api/user/consent`
- [ ] Modo Impulso en Telegram
  - El diagnóstico, retos y racha solo son accesibles por web
  - Un flujo conversacional `/diagnostico` en Telegram sería alcance significativo

---

## HECHO

- [x] SSE streaming en chat web (tokens en tiempo real)
- [x] Rate limiting en `/api/chat` — burst 5/min + hourly 30/h + IP 100/h
- [x] Email reminders para usuarios web (`src/lib/email.ts`, SendGrid)
- [x] Cron endpoint `/api/cron/reminders` con auth por `CRON_SECRET`
- [x] Bot de Telegram — webhook, consentimiento, persistencia, crisis
- [x] Comandos Telegram: `/start`, `/borrar_datos`, `/privacidad`, `/salir`, `/estado`
- [x] Safety gate Telegram — keywords de riesgo vital → respuesta de crisis + alerta admin
- [x] Modo Acompañamiento — `src/services/accompaniment.ts` + `/api/admin/accompaniment`
- [x] Intervención directa desde admin (POST → Telegram o mensaje web)
- [x] Recordatorios 24h — Telegram y email unificados en `runReminderJob`
- [x] Onboarding guiado web — flujo 3 pasos antes del primer chat
- [x] Emotional model — perfil emocional persistente por usuario
- [x] Decision engine — `UserState`, `DailyLog`, crisis, avoidance
- [x] Modo Impulso — diagnóstico, perfiles, retos, racha, insights
- [x] Panel admin — usuarios, detalle, insights operativos
- [x] Dashboard usuario — objetivo, acciones, estado emocional, insights
- [x] Auditoría de variables — gaps documentados en variables de contexto
- [x] Flujo explícito de salida de crisis (usuario) — `POST /api/user/crisis-exit`
- [x] Consentimiento GDPR en onboarding web + pruebas focalizadas
- [x] Unificación de rutas para evitar colisión entre `/` y catch-all

---

## Variables de entorno pendientes de configurar

```env
# Email (recordatorios web)
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG.xxx
EMAIL_FROM=Luciérnaga <noreply@tudominio.com>

# Cron
CRON_SECRET=<openssl rand -hex 32>

# Alertas admin (opcional pero recomendado)
ADMIN_TELEGRAM_ID=<tu chat_id>
```

---

## Próximos pasos recomendados (por impacto)

1. Aplicar migraciones en producción (`prisma migrate deploy`) — 3 migraciones pendientes
2. Configurar `CRON_SECRET` + programar cron en cron-job.org
3. Configurar `EMAIL_PROVIDER` + `EMAIL_API_KEY` para activar recordatorios email
4. Validar flujo de crisis con usuarios reales
5. Consentimiento GDPR en onboarding web
