# Luciérnaga AI — Plataforma de Mentoría Conversacional

**Stack:** Next.js 15 (App Router) · TypeScript · Prisma · PostgreSQL · OpenRouter
**Deploy:** Docker + Coolify · Auto-deploy desde `main`
**Estado:** Producción ✅

---

## Inicio rápido

```bash
cp .env.example .env
# Rellena las variables (ver sección Entorno)
npm install
npm run dev
# http://localhost:3000
```

---

## Entorno

### Obligatorias

```env
DATABASE_URL=postgresql://user:pass@host:5432/mentor_web
OPENROUTER_API_KEY=sk-or-...
AUTH_TOKEN_SECRET=cadena-aleatoria-larga
ADMIN_USERNAME=admin
ADMIN_PASSWORD=contraseña-segura
ADMIN_AUTH_SECRET=otra-cadena-aleatoria
APP_BASE_URL=https://tu-dominio.com
TELEGRAM_BOT_TOKEN=<token del BotFather>
```

### Opcionales

```env
ADMIN_TELEGRAM_ID=<tu chat_id de Telegram para alertas>
SESSION_SECRET=<secreto extra para sesiones>
```

---

## Arquitectura

```text
src/
├── app/
│   ├── page.tsx                  # Chat principal (SSE streaming)
│   ├── editor/page.tsx           # Editor de contenido
│   ├── admin/                    # Panel admin protegido
│   ├── dashboard/                # Dashboard de usuario
│   ├── impulso/                  # Modo Impulso (gamificación)
│   │   ├── page.tsx
│   │   ├── diagnostico/
│   │   ├── perfil/
│   │   ├── retos/
│   │   └── checkin/
│   └── api/                      # Rutas API (ver tabla abajo)
├── components/                   # UI compartida
├── services/                     # Lógica de negocio
├── lib/                          # Utilidades y helpers
└── types/                        # TypeScript types
prisma/
├── schema.prisma                 # Modelos de BD
└── migrations/                   # Historial de migraciones
```

---

## API — Referencia completa

### Chat

- `POST /api/chat`: chat principal, responde con SSE streaming o JSON.
- `POST /api/chat-direct`: chat sin DB (legacy, sin sesión).
- `POST /api/mock-chat`: respuesta mock para tests.

### Conversaciones y mensajes

- `GET /api/conversations`: lista conversaciones del usuario.
- `GET /api/messages`: mensajes de una conversación.
- `GET/POST /api/goals`: objetivo activo / crear objetivo.
- `PATCH /api/actions`: marcar acción completada.
- `POST /api/checkin`: check-in diario con estado emocional.

### Modo Impulso (API)

- `GET/POST /api/diagnostic`: test diagnóstico + guardar resultado.
- `GET/POST /api/challenge/assign`: asignar retos personalizados.
- `GET /api/insights`: insights de comportamiento (14 días).
- `GET/POST /api/future-message`: mensajes programados.

### Auth

- `POST /api/auth/bootstrap`: iniciar sesión anónima.
- `POST /api/auth/login`: login con email.
- `GET /api/auth/token`: validar token.
- `POST /api/auth/capture-email`: capturar email de usuario anónimo.

### Admin (panel)

- `GET /api/admin/insights`: métricas e insights operativos.
- `POST /api/admin/login`: login admin.
- `POST /api/admin/logout`: logout admin.
- `GET /api/admin/users`: listado de usuarios.
- `GET /api/admin/users/[id]`: detalle de usuario.

### Telegram

- `POST /api/telegram/webhook`: webhook del bot de Telegram.

### Sistema

- `GET /api/health`: health check.
- `GET /api/ready`: readiness check.
- `GET /api/legal`: aviso legal.
- `GET /api/alerts`: disparar alertas manuales.

---

## Base de datos — Modelos principales

- `User`: usuarios (web + Telegram). Incluye `telegramId`, `consentGiven`, `source`, `isActive`, `messageCount`.
- `Conversation`: conversaciones asociadas a un usuario.
- `Message`: mensajes individuales (`role`: user / assistant).
- `Goal`: objetivo activo del usuario.
- `Action`: acciones dentro de un objetivo.
- `UserState`: estado emocional actual (`state`, `crisisActive`, `primaryEmotion`).
- `DailyLog`: log diario con `emotionalState`, `mood`, `momentum`.
- `CrisisEvent`: eventos de crisis con `level` y `response`.
- `UserProfile`: perfil de Modo Impulso (scores por categoría).
- `UserChallenge`: retos activos del usuario.
- `Streak`: racha diaria de check-ins.
- `Subscription`: plan del usuario (`free` / `pro`).

---

## Funcionalidades

### Chat con streaming

- Respuestas token a token vía SSE (`text/event-stream`)
- Detección de estado emocional (`neutral`, `duda`, `bloqueo`, `ansiedad`, `claridad`)
- Sistema de metas y acciones con presión progresiva
- Perfil emocional persistente por usuario
- Detección de crisis y escalada automática

### Modo Impulso

- Diagnóstico psicológico-operativo (12 preguntas)
- 5 perfiles: `BLOQUEADO`, `ANSIOSO`, `DESMOTIVADO`, `PERDIDO`, `POTENCIAL_ALTO`
- Retos personalizados de 3-7 días
- Racha diaria con check-in
- Insights de comportamiento (14 días)
- Mensajes programados con fecha de desbloqueo

### Telegram Bot

- Flujo de consentimiento obligatorio (`ACEPTO`)
- Conversaciones persistidas en DB
- Comandos: `/start`, `/estado`, `/privacidad`, `/salir`, `/borrar_datos`
- Detección de crisis y alerta al admin
- Recordatorios automáticos (cron) para usuarios inactivos

### Admin

- Panel web en `/admin` (auth por cookie)
- Dashboard Appsmith con: lista de usuarios, detalle, distribución emocional, acciones, crisis
- Modo Acompañamiento: priorización de usuarios, score 7 días, recomendación de intervención
- Alertas a Telegram admin vía `ADMIN_TELEGRAM_ID`

---

## Scripts

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # ESLint
npm run test         # Jest
npm run test:telegram # Prueba envio Telegram
npm run backup:daily # Copia de seguridad DB
npm run backup:restore:latest # Restaurar ultimo backup

npx prisma migrate deploy   # Aplicar migraciones (producción)
npx prisma generate         # Regenerar cliente Prisma
npx prisma studio           # Explorador de BD visual
```

Ver `docs/daily-backup.md` para configuracion diaria con cron y retencion.

---

## Despliegue

Ver [COOLIFY_DEPLOY_STEPS.md](COOLIFY_DEPLOY_STEPS.md) para guía completa.

**Resumen:**

1. Push a `main` → GitHub Action dispara webhook de Coolify
2. Coolify: build Docker → `prisma migrate deploy` → start
3. Health check en `/api/health`

### Registrar webhook de Telegram (una sola vez)

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://TU_DOMINIO/api/telegram/webhook"
```

---

## Seguridad

- Sesiones via cookie `httpOnly` + HMAC firmado
- Admin protegido por sesión separada
- Tokens de Telegram y API keys solo en variables de entorno
- Sin secretos en código fuente ni en git
- Rate limiting en `/api/chat`
- Validación de entrada en todos los endpoints

---

## Monitoreo

```bash
# Health
curl https://tu-dominio.com/api/health

# Logs en Coolify → Service → Logs
# Prefijos: [CHAT] [AI] [DB] [TELEGRAM] [REMINDERS] [RISK]
```

---

**Repo:** mariopablobarron/LuciernagaAI
**Rama principal:** `main`
**Última actualización:** 2026-03-30
