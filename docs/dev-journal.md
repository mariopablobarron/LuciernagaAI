# Dev journal

Registro narrativo del trabajo de desarrollo sobre el proyecto. Se escribe al
cierre de cada sesión — referencia a commits para detalle técnico, aquí solo
va el "qué" y el "por qué". Horas estimadas, no métricas contables.

Formato por entrada:

```
## YYYY-MM-DD — Ventana HH:MM → HH:MM (≈ X h)

### Titulares de la sesión
- Tema 1 (commits a, b, c)
- Tema 2 (commits d, e)

### Decisiones de producto / diseño
- Decisión y porqué (si no está obvio en el commit).

### Deuda abierta / follow-ups
- Lo que quedó sin cerrar.
```

---

## 2026-04-23 — Ventana 00:10 → 03:49 (≈ 4 h)

### Titulares de la sesión

- **Instrumentación — Screen Time interno por usuario.** Fase 1: modelo
  `UsageSession`, endpoint heartbeat, panel en ficha admin (`7d26553`). Fase
  2: columna "Uso 7d" en `/admin/users`, filtro admins server-side, beacon
  de cierre en el cliente (`f80162e`). Fixes: clasificar `/app` como
  superficie `chat` (`1dc9d55`), excluir equipo/test aunque tengan
  `role=user` (`318ac08`), mute del tracking cliente para admins
  (`d3a95dc`).
- **Mensajes directos admin → usuario con ticks tipo WhatsApp** (`99981a2`).
  Modelo `AdminMessage` con `sentAt/deliveredAt/readAt`, endpoint de envío
  (email + in-app notification), pixel tracking, modal de historial en la
  ficha admin. No se mezcla con la voz del mentor — card "Mensaje del
  equipo" aparte.
- **Filtro PII en comunidad.** `src/lib/pii-filters.ts` detecta emails,
  teléfonos, URLs, handles, plataformas, DNI/NIE, IBAN. Aplicado a 5
  endpoints de comunidad (`d59a5ab`). Razón `personal_data` añadida a
  reports. Hint compartido en todos los composers + cron retroactivo +
  tests (31/31 OK) (`0678ffc`).
- **Fix crítico: bootstrap creaba users fantasma por cada bot.** Cada
  crawler/monitoring que abría la app disparaba `notifyAdmin("new_user")` y
  creaba `User` en BD. Filtro de User-Agent para bots; humanos anónimos
  siguen creando User + alertando (propuesta de valor anonymous-first)
  (`c3721ff`, `db6b586`).
- **Color emocional (PoC visible).** Token CSS `--accent-emotion` que se
  sobreescribe con `data-emotion="..."` en `<html>`, aplicado por
  `EmotionalAccentProvider` que lee `/api/user/state`. Botón "Enviar" del
  chat usa el token (`c3e9af5`). Micro-onboarding explica el cambio la
  primera vez (`43d3139`).
- **Fix crítico: modo de acompañamiento leaked al usuario.** El cliente
  prefijaba el mensaje con `[Modo de acompañamiento: "X" — instrucción]` y
  se guardaba como mensaje visible. Ahora se envía `mentorModeId` por
  separado y la instrucción va solo al system prompt (`d7eaa5b`). Endpoint
  one-shot para limpiar la deuda histórica (`8203297`).
- **Chat — mejoras de tono y flujo.** Sí/no cortos cierran el action-lock,
  prompts comerciales se separan del turno del mentor (`f42136d`).
  Selector de modo de acompañamiento con pool ampliado (`56e3d02`). Bajar
  tono autoritario cuando hay hilo abierto (`b4d5b8c`). Salida digna del
  mensaje de retome + no crear goals desde starter-picks (`97a3ece`).
- **Comunidad — reframe como cadena de ayuda mutua.**  Reframe UI
  questions (`116e705`), fase 2 loop de reciprocidad (`aa6c5ed`), fase 3
  banner "alguien te necesita" con matching por estado (`e5433e8`), panel
  métricas de questions (`e502a6a`), tabs 5→4 + social proof + Cafetería
  integrada (`b059968`), CTA "llevar duda a comunidad" desde chat
  (`b9ee90d`, `7596887`, `235fb25`, `41560ce`, `66f196a`). Menú público
  añade Comunidad (`51bac43`).
- **Admin / Users — fases 2-4.** Segmentos predefinidos + filtros
  avanzados + export (`e875ee6`), audit log + tags + bloque GDPR
  (`e978c94`), acciones masivas tag/plan/email (`d694f17`, `da56c44`).
  Retención con soft delete + restore + bloqueo de sesiones inactivas
  (`06158ea`). Filtro equipo/test extendido a activación, retención y CRM
  (`364c51b`). Borra 4 componentes huérfanos y acopla 2 features paradas
  (`098ec01`).
- **Carta semanal** (`WeeklyLetter`). Modelo + opt-out en
  `UserPreferences` (`a955a01`), digest + composer + eligibility
  (`e714045`), cron + endpoints pending/[id] (`98e7e88`), banner + modal +
  toggles (`bac6899`).
- **Health dashboard** con 6 métricas North Star (WAC = Weekly Active
  Contributors como primera) (`f26fa53`).
- **Panel de status más útil.** Check `integration.telegram_webhook`
  usando `getWebhookInfo` reporta URL registrada, backlog y errores
  recientes (`768e92c`). HeyGen y n8n marcados opcionales cuando no están
  configurados (`cb8bed3`).
- **Backup Telegram.** Sube el `.sql.gz` como fichero Telegram al admin
  cuando lo llama el cron (`6a61a50`); el cron propaga el error real de
  Telegram si falla (`ffb9f09`). Pendiente: backup en Coolify real con
  retención.
- **Onboarding: nombre obligatorio antes del 2º mensaje; email pasa a
  opcional** (`e3a7c00`) — alineado con el principio anonymous-first.

### Decisiones de producto / diseño

- **Anonymous-first** como propuesta de valor (registrada en memoria). Los
  anónimos no son ruido: son usuarios reales que no quieren dejar datos.
  Solo los bots ensucian → fix del bootstrap con filtro UA.
- **Color emocional** (vía C) elegido sobre "preset de colores" o "color
  libre": cuenta una historia pedagógica ("el color te acompaña") en vez
  de ser cosmético.
- **Mensajes admin** NO se fusionan con la voz del mentor. Mario (equipo
  humano) y mentor (IA) son vocabulario distinto visualmente. Preserva el
  marco pedagógico.
- **Política PII hard**: se rechaza el post con mensaje pedagógico, no se
  enmascara. Educa en lugar de disimular.
- **Auditoría en `audit()`** para envíos admin → usuario. Libertad total
  de enviar, no anonimato.

### Deuda abierta / follow-ups

- Configurar cron `/api/cron/scan-pii` en cron-job.org (semanal, apply=1).
- Ejecutar una vez `/api/admin/users/purge-anonymous-dormant` para limpiar
  backlog de fantasmas anteriores al filtro de bots.
- Ejecutar una vez `/api/admin/messages/cleanup-mode-prefix` (endpoint
  one-shot) para limpiar mensajes con prefijo del bug del modo.
- Programar iteraciones del color emocional: focus rings, barras de
  progreso, borde de cards activas, transición animada al cambiar estado.
- Scoping por `CoachAssignment` para el rol `coach` (pendiente).
- Email al usuario en `invoice.payment_failed` de Stripe (hoy solo avisa
  al admin).
- Webhook Coolify auto-deploy 404 (sigue abierto desde ~11-abr).
- Branch protection — `staging-check` se bypasea en cada push.

---

## 2026-04-22 — (reconstrucción retrospectiva desde git log)

> Reconstrucción a partir de mensajes de commit. Sin contexto vivido —
> solo titulares derivados del diff.

### Titulares de la sesión
- **Onboarding**: 3 pantallas de activación tras signup; mentor habla
  primero; tarjeta inline de captura de email; badges por tipo en
  `/admin/users` (`9c7e8f2`, `62b7410`, `580aef9`).
- **Auditoría 2026-04-22**: cierre de 11 círculos identificados en la
  revisión (`d9043c9`) — ver `memory/project_open_circles_20260422.md`.
- **Rol `coach`** añadido al RBAC con permisos mínimos (`b8fd04d`).
- **DB**: migración de `onboardingContext` como `Json` en `User`
  (`4df7cd3`).
- **Infra**: Next.js 16 con Turbopack como default (`93019f5`), init lazy
  de VAPID para desbloquear el build (`940d54c`).
- **Push notifications**: panel admin de broadcast (`2b1c1d6`).
- **Build**: envolver root layout con `NextIntlClientProvider`
  (`c081a1b`).

---

## 2026-04-20 — (reconstrucción retrospectiva)

### Titulares de la sesión
- **Activación**: campos de auditoría (`firstMessageSentAt`, `activatedAt`,
  `onboardingCompletedAt`) persistidos en `User` para no recalcular de
  mensajes+acciones cada vez (`4a32dff`).
- **Landing**: `LocaleSwitcher` reutilizable + mejoras de imagen y a11y
  (`0bc5860`).
- **Mobile**: SEO de titulos, tildes, tabla responsive y rebrand `/org`
  (`a206cb7`). Accesibilidad y switcher de idioma desbloqueados en móvil
  (`7d95e36`).

---

## 2026-04-18 — (reconstrucción retrospectiva)

> Día grande. Se materializan comunidad, rebrand y varias secciones nuevas.

### Titulares de la sesión
- **Rebrand** "Luciérnaga" → "Tres Mil Millones de Latidos" y config
  asociada (`1aad287`).
- **Comunidad — Circle Sync Sessions**: ventanas semanales de co-presencia
  dentro de un círculo (`b380c8e`).
- **Comunidad — Q&A con guardarraíles pedagógicos**: preguntas y
  respuestas anónimas + moderación light (`19c8baa`).
- **8 páginas públicas nuevas** + componentes SEO (`3b516ec`).
- **Endpoints + UI**: analytics, alertas, ronda diaria, interventions
  (`e46b099`). Schema + migraciones + libs para logs, alertas y daily
  round (`3fab351`).
- **Timeline unificado de contenido del usuario** en admin + export
  (`401334c`).
- **Programa de referidos** con métricas admin (`cb5cfc7`).
- **`/admin/notas`**: tablero para pendientes y seguimientos (`04fd7b0`).
- Nota operativa: verificar backup Coolify añadida al tablero
  (`8390acc`).
- **Fixes de build** del día (`60dc93b`, `5b0ea2b`, `5b141a3`).

---

## 2026-04-17 — (reconstrucción retrospectiva)

### Titulares de la sesión
- **Seguridad**: rate limiting en forgot-password; docs de env vars para
  HeyGen y VAPID (`0c884d9`).

---

## 2026-04-16 — (reconstrucción retrospectiva)

### Titulares de la sesión
- **Avatar videos (HeyGen)**: feature completa cableada. Refactor del
  pipeline de `processMessage`. Panel `/admin/status` y docs asociadas
  (`6de604a`).
- **Telegram**: notificación de signup enriquecida con detalles del usuario
  (`73f56ca`).
