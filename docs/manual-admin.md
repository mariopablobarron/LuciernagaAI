# Manual de administracion — Tres Mil Millones de Latidos

**Version:** 3.0
**Fecha:** 10 de abril de 2026
**Audiencia:** Administradores del sistema, equipo clinico y responsables B2B
**Referencia conceptual:** Para la vision general de la plataforma, roles y argumentario, consulta la [Guia de Tres Mil Millones de Latidos](GUIA-TRES-MIL-MILLONES.md). Para el detalle clinico completo, la Parte V de la guia.

---

## Indice

0. [URLs y accesos rapidos](#0-urls-y-accesos-rapidos)
1. [Mapa de accesos y roles](#1-mapa-de-accesos-y-roles)
2. [Roles de administracion (RBAC)](#2-roles-de-administracion-rbac)
3. [Panel admin — acceso y secciones](#3-panel-admin--acceso-y-secciones)
4. [Panel clinico — lista de usuarios](#4-panel-clinico--lista-de-usuarios)
5. [Panel clinico — detalle de usuario](#5-panel-clinico--detalle-de-usuario)
6. [Enviar intervenciones](#6-enviar-intervenciones)
7. [Marketing y campanas](#7-marketing-y-campanas)
8. [Gestion de equipos](#8-gestion-de-equipos)
9. [Organizaciones B2B](#9-organizaciones-b2b)
10. [Portal organizacional B2B](#10-portal-organizacional-b2b)
11. [Portal familia / contacto de confianza](#11-portal-familia--contacto-de-confianza)
12. [Notificaciones Telegram](#12-notificaciones-telegram)
13. [Comandos Telegram como administrador](#13-comandos-telegram-como-administrador)
14. [Planes y billing (Stripe)](#14-planes-y-billing-stripe)
15. [Cron jobs automaticos](#15-cron-jobs-automaticos)
16. [Variables de entorno clave](#16-variables-de-entorno-clave)
17. [Referencia rapida de endpoints](#17-referencia-rapida-de-endpoints)

---

## 0. URLs y accesos rapidos

### Aplicacion web

| Entorno | URL |
|---|---|
| Produccion principal | `https://tresmilmillonesdelatidos.es` |
| Desarrollo local | `http://localhost:3000` |

### Panel de administracion

| Seccion | URL de produccion |
|---|---|
| Login admin | `https://tresmilmillonesdelatidos.es/admin/login` |
| Dashboard | `https://tresmilmillonesdelatidos.es/admin` |
| Usuarios | `https://tresmilmillonesdelatidos.es/admin/users` |
| Panel clinico | `https://tresmilmillonesdelatidos.es/admin-clinical` |
| Crisis | `https://tresmilmillonesdelatidos.es/admin/crisis` |
| Analytics | `https://tresmilmillonesdelatidos.es/admin/analytics` |
| Retencion | `https://tresmilmillonesdelatidos.es/admin/retention` |
| Marketing | `https://tresmilmillonesdelatidos.es/admin/marketing` |
| CRM | `https://tresmilmillonesdelatidos.es/admin/crm` |
| Equipo | `https://tresmilmillonesdelatidos.es/admin/team` |
| Organizaciones | `https://tresmilmillonesdelatidos.es/admin/organizations` |
| Guia/Contenido | `https://tresmilmillonesdelatidos.es/admin/guia` |
| Investigacion | `https://tresmilmillonesdelatidos.es/admin/research` |
| Auditoria | `https://tresmilmillonesdelatidos.es/admin/audit` |
| LLM Usage | `https://tresmilmillonesdelatidos.es/admin/llm-usage` |
| Operaciones | `https://tresmilmillonesdelatidos.es/admin/operaciones` |
| Configuracion | `https://tresmilmillonesdelatidos.es/admin/settings` |

### Portal organizacional B2B

| Seccion | URL |
|---|---|
| Registro organizacion | `https://tresmilmillonesdelatidos.es/org/registro` |
| Login organizacion | `https://tresmilmillonesdelatidos.es/org/login` |
| Dashboard org (HR) | `https://tresmilmillonesdelatidos.es/org/dashboard` |
| Pacientes (terapeuta) | `https://tresmilmillonesdelatidos.es/org/patients` |
| Guia del portal | `https://tresmilmillonesdelatidos.es/org/guia` |

### Bot de Telegram

| Canal | Referencia |
|---|---|
| Bot de usuarios | Configurado en `TELEGRAM_BOT_USERNAME` |
| Para usar el bot | Busca el bot en Telegram y envia `/start` |
| Chat admin (alertas) | Tu ID numerico configurado en `ADMIN_TELEGRAM_ID` |
| Obtener tu ID | Escribe a `@userinfobot` en Telegram |

### APIs — salud del sistema

| Endpoint | Proposito |
|---|---|
| `GET /api/health` | Health check general |
| `GET /api/ready` | Readiness — confirma que acepta trafico |

```bash
# Verificar que el sistema esta activo
curl https://tresmilmillonesdelatidos.es/api/health

# Verificar estado del webhook de Telegram
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

---

## 1. Mapa de accesos y autenticacion

Hay 4 sistemas de autenticacion independientes:

### 1.1 Admin principal y clinico

| Campo | Valor |
|---|---|
| Login | `/admin/login` |
| Credenciales | Variables de entorno `ADMIN_USERNAME` y `ADMIN_PASSWORD` |
| Sesion | Cookie `mw_admin_session`, dura 24 horas |
| Alcance | Todo el panel admin + panel clinico |

> Las credenciales se configuran en Coolify (produccion) o `.env` (desarrollo). No se almacenan en el repositorio.

### 1.2 Portal organizacional (B2B)

| Campo | Valor |
|---|---|
| Login | `/org/login` |
| Credenciales | Slug de organizacion + email + contrasena (almacenados en BD, tabla `OrgAdmin`) |
| Sesion | Token en sessionStorage del navegador |

Roles disponibles:

| Rol | Acceso | Descripcion |
|---|---|---|
| `admin` (HR) | `/org/dashboard` | Dashboard con metricas anonimizadas de bienestar |
| `therapist` | `/org/patients` | Lista de pacientes con flags de riesgo |

Cuentas demo (si se ejecuto el seed):

| Rol | Org slug | Email | Contrasena |
|---|---|---|---|
| HR | `demo-corp` | `hr@demo-corp.com` | `demo1234` |
| Terapeuta | `demo-corp` | `psico@demo-corp.com` | `demo1234` |

Para crear el seed: `node scripts/seed-org-demo.mjs`

### 1.3 Portal familia

| Campo | Valor |
|---|---|
| Acceso | `/family/[token]` |
| Credenciales | Token unico generado por el usuario, sin login tradicional |
| Alcance | Solo lectura: progreso, logros, racha. Puede enviar mensajes de apoyo y pings |

### 1.4 Usuarios finales

| Campo | Valor |
|---|---|
| Login | `/login` |
| Registro | `/signup` |
| Credenciales | Email + contrasena (bcrypt) |
| Sesion | Cookie `mw_session`, firmada con HMAC |
| Alternativa | Sesion anonima via `/api/auth/bootstrap` + captura de email posterior |
| Alternativa | Telegram bot (consentimiento via `ACEPTO`) |

---

## 2. Roles de administracion (RBAC)

El sistema de administracion usa control de acceso basado en roles (RBAC). Cada miembro del equipo tiene un rol que determina que puede ver y hacer.

### Roles disponibles

| Rol | Permisos principales |
|---|---|
| **superadmin** | Acceso total a todas las funciones (`*`) |
| **admin** | Dashboard, analitica, auditoria, CRM, gestion de usuarios (lectura, edicion, cambio de plan, reset contrasena, envio de email), conversaciones, insights, notificaciones, Telegram |
| **clinical** | Crisis, investigacion, datos de usuario, notas clinicas, intervenciones, evaluaciones |
| **marketing** | Analitica, CRM, retencion, campanas broadcast, segmentos de email, notificaciones |
| **support** | Respuesta a crisis, soporte a usuarios, reset de contrasenas, envio de emails |
| **content** | Gestion de Journeys, ejercicios, retos y recursos educativos |
| **ops** | Dashboard, analitica, auditoria, operaciones, uso de LLM, backups, tareas del sistema |

### Como asignar roles

Los roles se gestionan desde `/admin/team` (ver seccion 8). Solo un superadmin puede crear o modificar roles de otros administradores.

### Permisos granulares

Cada rol tiene una lista de permisos especificos (ej. `users:read`, `users:update`, `clinical-notes`, `marketing:broadcast`). El sistema verifica el permiso en cada endpoint antes de permitir la accion. Si un admin intenta acceder a una seccion sin permiso, recibe un error 403.

---

## 3. Panel admin — acceso y secciones

### Pasos de acceso

1. Navega a `/admin/login`
2. Introduce usuario y contrasena
3. La sesion dura 24 horas (cookie `mw_admin_session`)
4. Para cerrar sesion, usa el boton "Cerrar sesion" en la cabecera

### Secciones disponibles

| Seccion | Ruta | Descripcion | Roles con acceso |
|---|---|---|---|
| Dashboard | `/admin` | Metricas generales, insights, alertas, retencion, distribucion emocional, crisis, evitacion | superadmin, admin, ops |
| Usuarios | `/admin/users` | Listado completo con filtros, engagement score, detalle por usuario | superadmin, admin, support |
| Detalle usuario | `/admin/users/[id]` | Conversaciones, timeline emocional, objetivos, notas clinicas, export PDF | superadmin, admin |
| Conversacion | `/admin/users/[id]/conversations/[convId]` | Visualizador de conversacion individual | superadmin, admin |
| Panel clinico | `/admin-clinical` | Monitorizacion clinica, estados emocionales, riesgo, intervenciones | superadmin, clinical |
| Analytics | `/admin/analytics` | Retencion por cohortes, funnels, actividad | superadmin, admin, marketing, ops |
| Retencion | `/admin/retention` | Analisis de cohortes, hitos de retencion (D1/D3/D7/D14/D30) | superadmin, admin, marketing |
| Crisis | `/admin/crisis` | Eventos de crisis activos e historico (24h/7d/30d) | superadmin, admin, clinical, support |
| Marketing | `/admin/marketing` | Campanas broadcast, segmentos, metricas, historial | superadmin, marketing |
| CRM | `/admin/crm` | Gestion de relaciones con usuarios | superadmin, admin, marketing |
| Equipo | `/admin/team` | Gestion de admins, asignacion de roles | superadmin |
| Organizaciones | `/admin/organizations` | Gestion de organizaciones B2B, OrgAdmins, limites | superadmin, admin |
| Guia/Contenido | `/admin/guia` | Gestion de Journeys, modulos, ejercicios, retos | superadmin, content |
| Investigacion | `/admin/research` | Datos anonimizados, analisis de patrones | superadmin, clinical |
| Auditoria | `/admin/audit` | Log de eventos del sistema | superadmin, admin, ops |
| LLM Usage | `/admin/llm-usage` | Consumo de tokens y costes IA | superadmin, ops |
| Operaciones | `/admin/operaciones` | Estado del sistema, cron jobs, backups | superadmin, ops |
| Configuracion | `/admin/settings` | Configuracion general del sistema | superadmin |

> El panel clinico (`/admin-clinical`) usa la misma sesion que el resto del admin — no requiere login separado.

---

## 4. Panel clinico — lista de usuarios

**Ruta:** `/admin-clinical`

Muestra todos los usuarios con informacion clinica relevante.

### Columnas de la tabla

| Columna | Descripcion |
|---|---|
| Usuario | Nombre o email. Icono de escudo si tiene crisis activa |
| Estado | Estado emocional actual: neutral / duda / bloqueo / ansiedad / claridad |
| Riesgo | Nivel de riesgo: low / medium / high / critical |
| Crisis 7d | Numero de eventos de crisis en los ultimos 7 dias (en rojo si > 0) |
| Racha | Dias consecutivos de check-in |
| Intervenciones | Total de intervenciones recibidas del equipo clinico |
| Ultima actividad | Tiempo relativo desde la ultima sesion (ej. "hace 3h") |

### Filtros disponibles

- **Por estado:** Todos / Ansiedad / Bloqueo / Duda / Claridad / Neutral
- **Solo riesgo alto/critico:** filtra usuarios con `riskLevel = high|critical` o `crisisActive = true`
- **Paginacion:** 50 usuarios por pagina

### Como interpretar el riesgo

| Nivel | Significado | Accion recomendada |
|---|---|---|
| `low` | Sin senales de alarma | Seguimiento rutinario |
| `medium` | Patron de evitacion o estado negativo sostenido | Revisar historial |
| `high` | Crisis recientes o estado de ansiedad persistente | Contactar en 24h |
| `critical` | Crisis activa en este momento | Intervencion inmediata |

---

## 5. Panel clinico — detalle de usuario

**Ruta:** `/admin-clinical/user/[id]`

Accede haciendo clic en "Ver" en la fila de cualquier usuario.

### Secciones del detalle

**Cabecera**
- Nombre, email e ID del usuario
- Badge de crisis activa (si aplica)
- Badge de nivel de riesgo
- Fecha de registro, origen (web / telegram) y ultima actividad

**Estado emocional**

| Campo | Descripcion |
|---|---|
| Estado | Estado actual del sistema de estados |
| Emocion primaria | Emocion dominante detectada |
| Patron dominante | Patron comportamental recurrente |
| Foco | Area de vida en la que esta centrado |
| Energia | Nivel de energia reportado |
| Tendencia | Evolucion reciente (mejorando / estable / empeorando) |
| Mood | Estado de animo general |

**Perfil emocional**
Barras de progreso con puntuaciones del 0 al 10 en: Claridad, Autoestima, Energia, Disciplina y Social. Puntuacion total al pie.

**Objetivos**
Lista de goals activos e inactivos con sus acciones asociadas. Las acciones completadas aparecen tachadas.

**Eventos de crisis** *(colapsable, visible por defecto)*
Historial de crisis ordenado del mas reciente al mas antiguo. Cada evento muestra nivel, fecha y fragmento del mensaje que lo desencadeno.

**Historial de mensajes** *(colapsable, oculto por defecto)*
Ultimos 50 mensajes de la conversacion del usuario, formato de burbuja. Los mensajes del usuario aparecen a la derecha (azul), las respuestas del asistente a la izquierda (gris).

---

## 6. Enviar intervenciones

El panel de intervencion esta en la columna derecha del detalle de usuario. Es sticky — permanece visible mientras navegas la pagina.

### Tipos de intervencion

| Tipo | Cuando usarlo |
|---|---|
| `Mensaje` | Comunicacion directa o acompanamiento |
| `Recomendacion` | Sugerencia de accion concreta (ejercicio, recurso, pauta) |
| `Recurso` | Enlace o material de apoyo |
| `Evaluacion` | Solicitud de completar una escala (PHQ-9, GAD-7, etc.) |

### Pasos para enviar

1. Selecciona el tipo de intervencion (cuatro botones en la parte superior del panel)
2. Escribe el contenido en el area de texto
3. Marca o desmarca "Notificar por Telegram" segun si el usuario tiene el bot vinculado
4. Haz clic en **Enviar intervencion**

### Que ocurre tras enviar

1. La intervencion se persiste en base de datos (modelo `Intervention`) con estado `sent`
2. Si el usuario tiene `telegramId` y la notificacion esta activada, recibe el mensaje en el bot
3. El administrador recibe confirmacion en su propio Telegram
4. La intervencion aparece inmediatamente en la seccion "Intervenciones previas" del mismo panel

### Historial de intervenciones previas

Debajo del panel de envio aparecen las intervenciones anteriores, ordenadas de mas reciente a mas antigua. Cada tarjeta muestra tipo, fecha, contenido y estado actual (`sent` / `read` / `resolved`).

---

## 7. Marketing y campanas

**Ruta:** `/admin/marketing`
**Roles:** superadmin, marketing

### Funcionalidades

#### Campanas broadcast
- Envio de mensajes masivos a segmentos de usuarios.
- Seleccion de segmento destino.
- Programacion de envio.
- Tracking de metricas.

#### Segmentos
- Creacion y gestion de segmentos de usuarios basados en comportamiento, estado emocional, plan, engagement, etc.
- Endpoint: `GET /api/admin/marketing/segments`

#### Metricas de campana
- Tasa de apertura, clics, conversiones.
- Endpoint: `GET /api/admin/marketing/metrics`

#### Historial
- Registro completo de todas las campanas enviadas.
- Endpoint: `GET /api/admin/marketing/history`

### Emails programados

El sistema tiene emails automaticos que se gestionan via cron jobs:

| Email | Cuando se envia |
|---|---|
| Bienvenida personalizada | Tras el registro |
| Nudge 24h | 24 horas despues del registro si el usuario no ha vuelto |
| Recordatorio semanal | Cada semana para usuarios inactivos |
| Resumen semanal | Cada semana para usuarios activos |

---

## 7B. Videos avatar con HeyGen

**Ruta:** `/admin/marketing/avatar-videos`
**Roles:** superadmin, marketing (permiso `marketing:avatar_videos`)
**Env vars requeridas:** `HEYGEN_API_KEY`, `HEYGEN_VOICE_ID`

Sistema de videos cortos (≈20 segundos) del fundador como mentor, generados via HeyGen. El usuario los ve una sola vez en un modal al abrir `/app`. Pensado para tener **presencia rara y valiosa**, no para ser un canal de engagement de alta frecuencia.

### Tres fuentes de videos

**1. Arco del objetivo (automatico)** — Tres momentos por cada Goal del usuario:

| Fase | Disparador | Trigger en codigo |
|---|---|---|
| **START** (umbral) | Usuario crea un goal | Hook en `POST /api/goals` |
| **MIDPOINT** (prueba) | Usuario en estado emocional bajo **y** goal tiene ≥ `midpointMinDays` dias | Cron diario `/api/cron/goal-avatar-midpoint` |
| **END** (retorno) | Goal pasa a `status=completed` | Hook en `services/goals.ts` al completar la ultima accion |

Cada goal recibe como maximo un video por fase (`UNIQUE(goalId, phase)` en BD). Si el usuario nunca completa el goal, nunca vera el END. Si nunca entra en estado bajo, nunca vera el MIDPOINT. El sistema respeta el ritmo del usuario.

**2. Broadcast manual desde marketing** — Admin envia un video a un usuario concreto o a un segmento, en cualquier momento.

Dos modos de contenido:

- **Literal**: el admin escribe exactamente lo que dira el avatar (maximo control).
- **Briefing**: el admin escribe un brief ("agradecele su constancia esta semana") y el LLM genera el guion con la voz de Tres Mil Millones de Latidos.

Dos modos de generacion:

- **Compartido** (`isShared=true`): una sola generacion HeyGen reutilizada para todos los destinatarios. Coste fijo (~$0.10 total).
- **Personalizado** (`isShared=false`): una generacion por destinatario, con contexto individual del usuario. Coste lineal (~$0.10 × N).

**3. Video de bienvenida automatico** — Disparado en cada nuevo registro (email/password, Google, codigo de aula, conversion anonimo→real). Reutiliza el sistema de broadcast: el admin marca una campaign existente como "welcome template" y a partir de ese momento cada signup recibe automaticamente una `BroadcastAvatarDelivery` apuntando al mismo video ya generado. **Cero coste marginal** por nuevo usuario.

### Guardrails de disciplina

El sistema tiene limites duros en codigo para que el canal broadcast no se degrade a "newsletter con cara":

| Guardrail | Default | Accion |
|---|---|---|
| `maxVideosPerDay` | 30 | Cap global diario. El cron midpoint y los triggers se detienen al llegar. |
| `maxBroadcastsPerMonth` | 4 | Cap rolling 30 dias sobre broadcasts. El endpoint devuelve HTTP 429. |
| `broadcastUserCooldownDays` | 7 | Usuarios que recibieron cualquier broadcast en los ultimos N dias quedan excluidos del siguiente. |
| `midpointMinDays` | 3 | Un goal debe tener al menos N dias antes de disparar MIDPOINT. |
| `enabled` | `false` | Kill switch global. Nada funciona hasta que se activa explicitamente. |
| `UserPreferences.avatarVideosEnabled` | `true` | Opt-out por usuario. El modal tiene un boton "No quiero recibir mas videos". |

Todos los limites se editan desde `/admin/marketing/avatar-videos` → panel "Configuracion".

### Panel admin — que veras

**Cabecera:** 5 contadores — videos de hoy, startts totales, midpoints totales, ends totales, opt-outs.

**Configuracion:** toggle enabled, limites diarios/mensuales/cooldown, tono, avatar ID (default `e2ff51edb1154b0dbe2c8f0df59818cf`), 3 plantillas editables (una por fase) con variables `{userName}`, `{goalTitle}`, `{currentState}`, `{recentContext}`.

**Acciones manuales:**

- *Ejecutar scan midpoint* — dispara el cron manualmente.
- *Polling de estados* — dispara el poller de HeyGen manualmente.

**Enviar broadcast:** formulario con contador del mes en la cabecera (verde/ambar/rojo), estimacion de coste en $, boton bloqueado cuando se alcanza el cap mensual.

**Broadcasts enviados:** historial con status, destinatarios, script, y boton "Marcar como bienvenida" en las campanas elegibles (shared + READY).

**Historial de videos:** ultimos 100 videos individuales con filtro visual por fase (START/MIDPOINT/END) y status.

### Flujo tipico de activacion (primera vez)

1. **Setear env vars** en Coolify: `HEYGEN_API_KEY`, `HEYGEN_VOICE_ID`.
2. **Aplicar migracion** (`npx prisma migrate deploy`).
3. **Montar volumen persistente** en `/app/public/avatars` para que los videos sobrevivan deploys.
4. **Anadir crons en Coolify** (ver `docs/coolify-crons.md`).
5. **Entrar a `/admin/marketing/avatar-videos`** y activar el toggle.
6. **Probar con un usuario solo**: crear un goal propio, esperar 1-2 min, dar a "Polling", abrir `/app` — el modal START deberia aparecer.
7. **Crear video de bienvenida**: enviar un broadcast a tu email con contenido literal, esperar a que este READY, marcarlo como "bienvenida" desde el historial.

### Endpoints expuestos

| Ruta | Metodo | Permiso | Proposito |
| --- | --- | --- | --- |
| `/api/admin/marketing/avatar-videos/config` | GET, PUT | `marketing:avatar_videos` | Leer/editar config |
| `/api/admin/marketing/avatar-videos/history` | GET | `marketing:avatar_videos` | Listar videos generados |
| `/api/admin/marketing/avatar-videos/trigger` | POST | `marketing:avatar_videos` | Disparar cron manual (`midpoint-scan`, `poll`, `manual`) |
| `/api/admin/marketing/avatar-videos/broadcast` | POST, GET | `marketing:avatar_videos` | Crear / listar broadcasts |
| `/api/admin/marketing/avatar-videos/broadcast/limits` | GET | `marketing:avatar_videos` | Contador mensual + cooldown |
| `/api/admin/marketing/avatar-videos/broadcast/mark-welcome` | POST | `marketing:avatar_videos` | Marcar una campaign como welcome template |
| `/api/avatar/weekly` | GET, PATCH | usuario autenticado | Proximo video pendiente / marcar visto |
| `/api/avatar/weekly/opt-out` | POST | usuario autenticado | Togglear `avatarVideosEnabled` |
| `/api/cron/goal-avatar-midpoint` | GET, POST | `CRON_SECRET` | Scan diario |
| `/api/cron/poll-avatar-videos` | GET, POST | `CRON_SECRET` | Polling continuo HeyGen |

### Principios pedagogicos (no negociables)

Tres reglas que estan **hardcoded** en las plantillas del prompt y en la validacion del guion:

1. **Prohibidos los imperativos huecos** — "deberias", "tienes que", "sigue asi", "tu puedes". El validador registra cualquier guion que los contenga.
2. **Terminar siempre en pregunta** — cada fase tiene su pregunta obligatoria (START: que cambia desde hoy; MIDPOINT: sigue siendo tuyo este objetivo; END: quien eres ahora que lo tienes).
3. **Prohibido celebrar rapido** — especialmente en END. El silencio despues del logro tambien es parte del trabajo.

Si el equipo de marketing quiere sobreescribir estas reglas, tiene que editar las plantillas del prompt en el panel de config. Queda en el audit (`updatedBy`). **No es un cambio trivial** — se discute antes, no despues.

### Tension conocida (lee esto si eres CMO futuro)

El canal broadcast puede degradarse facilmente. Si lo usas para:

- Recordatorios de eventos → bien.
- Avisos importantes de producto → bien.
- Engagement general, "hola, te extranamos" → mal. Ya hay Telegram y email para eso.
- Felicitaciones en dias de fecha (cumple, navidad, etc.) → mal. Cliche que devalua el resto.

El test mental antes de cada envio: **¿justifica esto que aparezca la cara del fundador en el modal del usuario?** Si dudas, no lo envies. Un uso al mes bien aprovechado vale mas que cuatro al mes diluidos.

---

## 7C. Atribucion por fuente

**Ruta:** `/admin/marketing` → pestana "Atribucion"
**Permiso:** `marketing:metrics`
**Endpoint:** `GET /api/admin/marketing/attribution?range=7d|30d|90d|all`

Dashboard que agrupa los signups por su fuente de trafico real (`utm_source`) y muestra la tasa de conversion a Pro de cada canal.

### De donde saca los datos

El campo `User.source` guarda un JSON stringificado con los UTM params al momento del signup (capturado por `UtmCapture.tsx` desde la URL). Este endpoint parsea ese JSON en servidor, agrupa por `utm_source`, y para cada fuente busca el `utm_medium` y `utm_campaign` mas frecuentes.

### Rangos disponibles

7 dias, 30 dias, 90 dias, o todo el historico. El rango filtra solo signups dentro de la ventana — los usuarios Pro contabilizados son los que se registraron en ese rango y siguen activos como Pro hoy.

### Que mostrar al equipo

- **3 KPI cards**: signups en rango, conversiones a Pro, tasa Pro global.
- **Tabla por fuente**: source, medium, campaign, signups, Pro users, tasa Pro (codificada por color: verde ≥10%, ambar 3-10%, gris <3%), y % del total con barra visual.

### Fuentes especiales

- `(direct)` — signups sin UTMs en la URL. Trafico organico, bookmarks, email typed, dark social.
- `(unknown)` — JSON UTM presente pero sin `utm_source` completado.
- `(malformed)` — el JSON de `User.source` no se pudo parsear (usuarios legacy).

### Decisiones que habilita

1. **Alta tasa Pro pero bajo volumen** → invertir mas en ese canal.
2. **Alto volumen pero tasa Pro cero** → pausar o cualificar mejor.
3. **`(direct)` >60% del total** → tu estrategia de UTMs no esta bien implementada. Arreglalo antes de sacar conclusiones de los demas canales.

---

## 7D. Tagging manual de usuarios

**Ruta:** `/admin/marketing` → pestana "Tags"
**Permiso:** `users:tag` (heredado por admin y marketing)
**Endpoints:** `GET` / `PUT /api/admin/users/[id]/tags`

Permite asignar etiquetas manuales a cualquier usuario para crear segmentos que los filtros automaticos no capturan (ej: "beta", "vip", "churning", "caso_clinico", "hermano_del_fundador"). Una vez asignado un tag, se puede usar como segmento escribiendo `tag:nombre` en cualquier broadcast (Telegram, email, avatar).

### Como se usa

1. Entrar a la pestana Tags, introducir el email del usuario y pulsar "Buscar".
2. Se muestran los tags actuales como chips con X para borrar.
3. Escribir un nuevo tag en el input y pulsar Enter para anadirlo.
4. Desde cualquier panel de broadcast, seleccionar o escribir `tag:<nombre>` como segmento.

### Validacion automatica

- Solo letras, numeros, guion y guion bajo.
- Maximo 20 tags por usuario.
- Maximo 40 caracteres por tag.
- Se normalizan a minusculas.
- Tags duplicados o invalidos se descartan silenciosamente al guardar.

### Casos de uso reales

- Marcar usuarios que forman parte de un programa beta cerrado y enviarles actualizaciones exclusivas.
- Tagging de usuarios en crisis que ya han sido atendidos por el equipo clinico, para excluirles de campanas de retencion agresivas.
- Etiquetar cuentas VIP (prensa, inversores, amigos) para que NO aparezcan en pruebas de broadcast ni metricas generales.

---

## 7E. Testimonials publicos

**Ruta:** `/admin/marketing` → pestana "Testimonials"
**Permiso:** `marketing:site_content`
**Endpoints:**
- `GET / PATCH /api/admin/marketing/testimonials` (admin)
- `GET /api/testimonials` (publico, sin auth, cache 5 min)

Convierte feedbacks con rating alto en testimonios publicos consumibles por la landing. No hay texto escrito manualmente por marketing — todos los testimonials salen de feedback real de usuarios.

### Criterio de elegibilidad

El panel admin lista feedbacks que cumplen al menos uno de estos:
- Rating >= 4 estrellas.
- Ya estan marcados como publicos (por si bajaron despues del toggle).

### Como se publica un testimonial

Un click en el boton "Publicar" togglea el flag `isPublicTestimonial`. Sin paso de confirmacion — es reversible y no dispara nada externo.

### Privacidad

El endpoint publico (`/api/testimonials`) expone solo:
- El primer nombre del autor (nunca apellido, nunca email).
- El mensaje de texto.
- El rating.
- La fecha de creacion.

### Consumo desde la landing

```tsx
const res = await fetch(`${process.env.APP_BASE_URL}/api/testimonials`, {
  next: { revalidate: 300 },
});
const { testimonials } = await res.json();
```

No requiere auth. El cache de 5 minutos reduce la carga si la landing tiene mucho trafico.

### Orden personalizado

El campo `testimonialOrder` (nullable integer) permite forzar un orden en la landing. Los NULL se ordenan al final por fecha descendente. Utilidad: poner los testimonios mas fuertes arriba.

---

## 7F. Programa de referidos (dashboard)

**Ruta:** `/admin/marketing` → pestana "Referidos"
**Permiso:** `marketing:referrals`
**Endpoint:** `GET /api/admin/marketing/referrals`

Dashboard de metricas del sistema existente de invitaciones. **No crea nuevas invitaciones** — solo agrega datos de la tabla `Invitation` que ya se genera cuando un usuario alcanza hitos de gamificacion (racha 7d, primer objetivo completado, 30 dias activo, etc.).

### KPIs en cabecera

- Invitaciones creadas totales.
- Invitaciones usadas totales.
- Tasa de conversion global (usadas / creadas).
- Inviters unicos (usuarios distintos que han generado al menos una invitacion).

### Metricas extendidas

- **Pending**: invitaciones creadas pero aun no usadas.
- **Ventana 7 dias y 30 dias**: generadas y usadas dentro del rango.
- **Distribucion por razon**: agrupa por el motivo por el que se gano la invitacion (`streak_7d`, `streak_30d`, `goal_complete`, `active_30d`, `manual`). Util para saber que hitos de gamificacion estan generando mas referidos.
- **Retencion referred vs non-referred**: compara el porcentaje de usuarios que siguen activos a los 7 y 30 dias, separando los que llegaron por referido de los que no. Si los referred tienen retencion >20% mayor, tu programa esta funcionando bien.
- **Timeline diario (30 dias)**: grafico de generadas y usadas por dia.

### Top inviters

Tabla ordenada por invitaciones usadas (no por creadas), con:
- Usuario (nombre + email).
- Invitaciones creadas.
- Invitaciones usadas.
- Tasa de conversion individual.
- `invitesEarned` — el contador interno de gamificacion que suma cuando el usuario gana invitaciones.

### Que mirar

1. Si la tasa de conversion global esta por debajo del 5%, el mensaje de invitacion o el flow del invitado fallan. No es problema de volumen.
2. Si una razon concreta (ej: `streak_7d`) genera el 80% de las invitaciones pero solo el 10% de las usadas, quiza esa mecanica debe apagarse o rebalancearse.
3. Si hay 2-3 super-inviters concentrando el volumen, considera un programa VIP para ellos. Si el volumen esta repartido, el sistema es sano organicamente.

### Limitacion actual

No existe todavia UI para que el usuario final vea y comparta su propio codigo de referido. Eso vendria en un proximo sprint (ruta tipo `/account/referral`). Por ahora las invitaciones solo se generan automaticamente por hitos internos.

---

## 8. Gestion de equipos

**Ruta:** `/admin/team`
**Roles:** superadmin

### Operaciones disponibles

- **Listar** todos los miembros del equipo admin con su rol.
- **Crear** un nuevo admin: nombre, email, contrasena y rol.
- **Editar** rol de un admin existente.
- **Eliminar** un admin del equipo.

### Endpoints

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/admin/team` | Lista de todos los admins |
| `POST` | `/api/admin/team` | Crear nuevo admin |
| `PUT` | `/api/admin/team/[id]` | Editar admin |
| `DELETE` | `/api/admin/team/[id]` | Eliminar admin |

---

## 9. Organizaciones B2B (gestion admin)

**Ruta:** `/admin/organizations`
**Roles:** superadmin, admin

### Que puedes hacer

- **Listar** todas las organizaciones registradas.
- **Crear** una nueva organizacion: nombre, slug, tipo (empresa/clinica/centro educativo).
- **Asignar OrgAdmins**: crear cuentas de HR o terapeuta para la organizacion.
- **Gestionar invitaciones**: asignar usuarios a la organizacion.
- **Configurar limites**: numero maximo de usuarios por plan.
- **Ver metricas** por organizacion.

### Endpoints

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/admin/organizations` | Lista de organizaciones |
| `POST` | `/api/admin/organizations` | Crear organizacion |
| `GET` | `/api/admin/organizations/[id]/users` | Usuarios de la organizacion |

---

## 10. Portal organizacional B2B

### Que es

Portal separado para organizaciones (empresas, clinicas) que contratan el servicio para sus empleados o pacientes.

### Dashboard HR (`/org/dashboard`)

Metricas anonimizadas de bienestar:

- Estadisticas agregadas de la organizacion
- Distribucion de estados emocionales
- Tasas de retencion
- Rachas de check-in
- Tasas de cumplimiento de objetivos

### Vista terapeuta (`/org/patients`)

Lista de pacientes/empleados asignados a la organizacion:

- Flag de riesgo por colores (verde/amarillo/rojo)
- Estado emocional actual
- Racha de dias consecutivos
- Objetivos activos
- Patrones de evitacion

### Privacidad

Todos los datos estan anonimizados — no se expone informacion personal identificable (PII) excepto nombre mostrado.

### Administrar organizaciones

Las organizaciones se gestionan directamente en la base de datos (tabla `Organization`). Para crear una nueva organizacion con sus administradores, usa como referencia el script `scripts/seed-org-demo.mjs`.

---

## 11. Portal familia / contacto de confianza

### Que es

Portal de solo lectura para personas de confianza del usuario (madre, padre, pareja, amigo/a, terapeuta).

### Acceso

Cada persona de confianza recibe un token unico. Accede a `/family/[token]` sin login tradicional.

### Que puede ver

- Progreso general del usuario
- Logros y racha de dias consecutivos
- Estado de actividad

### Que puede hacer

- Enviar mensajes de apoyo al usuario
- Enviar un "ping" si esta preocupada por la inactividad del usuario

### Alertas automaticas

- Si el usuario lleva mas de 3 dias sin actividad, el contacto de confianza recibe una notificacion
- Si se detecta una crisis, el contacto puede ser alertado automaticamente

---

## 12. Notificaciones Telegram

El bot envia notificaciones automaticas al administrador configurado en `ADMIN_TELEGRAM_ID`.

### Catalogo completo de notificaciones

#### Actividad de usuarios

| Cuando se dispara | Formato |
|---|---|
| Usuario nuevo creado (web o Telegram) | `Nuevo usuario` |
| Usuario proporciona su email | `Usuario identificado` |

#### Cambios de estado emocional

Se dispara cuando un usuario completa una accion y su estado emocional transiciona a `bloqueo`, `claridad` o `ansiedad` con crisis activa.

#### Crisis

Se envia cuando se detectan palabras clave de riesgo vital en la app web o en Telegram.

#### Rachas (check-in diario)

Se envia cuando un usuario alcanza 3, 7, 14, 21 o 30 dias consecutivos de check-in.

#### Pagos y suscripciones (Stripe)

- Prueba gratuita iniciada (7 dias)
- Pago confirmado
- Suscripcion cancelada

#### Test diagnostico (quiz)

Se envia cuando un usuario completa el test de estado emocional.

#### Formulario de contacto

Se envia cuando alguien envia un mensaje a traves del formulario de contacto de la web.

#### Resumen semanal (cron)

Se envia automaticamente cada semana. Tambien puede dispararse manualmente desde `/api/admin/telegram-report`.

#### Intervencion enviada

Se envia cuando se crea una intervencion desde el panel clinico.

### Origen de los mensajes — donde esta el codigo

| Notificacion | Archivo |
|---|---|
| Nuevo usuario | src/app/api/auth/bootstrap/route.ts |
| Email capturado | src/app/api/auth/capture-email/route.ts |
| Cambio de estado | src/app/api/actions/trigger/route.ts |
| Crisis (app web) | src/app/api/actions/trigger/route.ts |
| Crisis (Telegram) | src/app/api/telegram/webhook/route.ts |
| Usuario en riesgo | src/lib/alerts.ts — `sendAdminUserAlert` |
| Racha destacada | src/app/api/checkin/route.ts |
| Pago confirmado | src/app/api/billing/webhook/route.ts |
| Cancelacion | src/app/api/billing/webhook/route.ts |
| Test diagnostico | src/app/api/quiz/result/route.ts |
| Contacto | src/app/api/contact/route.ts |
| Resumen semanal | src/app/api/cron/weekly-summary/route.ts |
| Intervencion clinica | src/features/admin-clinical/send-intervention.ts |

El constructor de mensajes admin esta centralizado en src/services/telegram.ts — funcion `buildAdminAlert`.

---

## 13. Comandos Telegram como administrador

Cuando escribes al bot desde el chat configurado como `ADMIN_TELEGRAM_ID`, tienes acceso a comandos exclusivos.

### Comandos admin

| Comando | Que muestra |
|---|---|
| `/ayuda` | Lista todos los comandos admin disponibles |
| `/stats` | Activos hoy, nuevos hoy, mensajes totales y distribucion de estados |
| `/usuarios` | Ultimos 20 usuarios activos en las 24h anteriores |
| `/crisis` | Usuarios con `crisisActive = true` en este momento |
| `/retencion` | Usuarios totales, activos esta semana, rachas activas |
| `/estado` | Distribucion emocional actual de todos los usuarios |
| `/tareas` | Cola de `AdminTask` con estado `pending` |

### Modo IA libre

Cualquier mensaje que no sea un comando activa el modo IA directa: el bot consulta la IA con contexto del sistema (metricas actuales) y responde.

### Comandos para usuarios regulares

| Comando | Accion |
|---|---|
| `/start` | Inicia el proceso de consentimiento |
| `/privacidad` | Muestra la politica de privacidad |
| `/estado` | Lista sus acciones pendientes |
| `/vincular` | Genera enlace para conectar Telegram con cuenta web |
| `/salir` | Desactiva los recordatorios |
| `/borrar_datos` | Elimina todos sus datos del sistema (GDPR) |

---

## 14. Planes y billing (Stripe)

### Estado actual: MVP gratuito (hasta octubre 2026)

Durante el periodo MVP, todos los usuarios tienen acceso completo a las funciones Pro sin necesidad de pago. La variable `FREE_PLAN_UNLIMITED=true` controla esto.

### Planes configurados (post-MVP)

| Plan | Precio | Limites |
|---|---|---|
| Free | 0 euros | 10 conversaciones/mes, 20 mensajes/conversacion |
| Pro mensual | 9 euros/mes | Ilimitado + Modo Impulso + Telegram + Portal familiar |
| Pro anual | 79 euros/ano | Ilimitado + Modo Impulso + Telegram + Portal familiar |

El plan Pro incluye 7 dias de prueba gratuita.

### Variables de Stripe

| Variable | Descripcion |
|---|---|
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave publica de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe |
| `STRIPE_PRICE_PRO_MONTHLY` | ID del precio mensual en Stripe |
| `STRIPE_PRICE_PRO_ANNUAL` | ID del precio anual en Stripe |

### Flujos de billing

- **Checkout:** `POST /api/billing/checkout` crea sesion de pago en Stripe
- **Portal cliente:** `POST /api/billing/portal` genera enlace al portal de gestion de Stripe
- **Estado:** `GET /api/billing/status` consulta estado de suscripcion
- **Webhook:** `POST /api/billing/webhook` procesa eventos de Stripe (pagos, cancelaciones, etc.)

### Variable de override

`FREE_PLAN_UNLIMITED=true` desactiva los limites del plan gratuito (util para testing).

---

## 15. Cron jobs automaticos

Todos los cron jobs requieren el parametro `?secret=CRON_SECRET`.

| Ruta | Descripcion | Frecuencia recomendada |
|---|---|---|
| `/api/cron/24h-nudge` | Nudge a usuarios nuevos inactivos tras 24h | Diaria |
| `/api/cron/action-reminders` | Recordatorios de acciones pendientes via Telegram | Diaria |
| `/api/cron/inactivity-check` | Deteccion de usuarios inactivos | Diaria |
| `/api/cron/proactive-review` | Revision proactiva de progreso | Diaria |
| `/api/cron/reminders` | Recordatorios generales a usuarios | Diaria |
| `/api/cron/scheduled-emails` | Envio de campanas de email programadas | Cada hora |
| `/api/cron/telegram-checkin` | Recordatorio de check-in diario via Telegram | Diaria (manana) |
| `/api/cron/user-weekly-review` | Revision semanal proactiva por usuario | Semanal |
| `/api/cron/weekly-inactive-reminder` | Re-engagement de usuarios inactivos | Semanal |
| `/api/cron/weekly-summary` | Resumen semanal enviado por Telegram al admin | Semanal |

---

## 16. Variables de entorno clave

### Obligatorias en produccion

| Variable | Descripcion |
|---|---|
| `DATABASE_URL` | Cadena de conexion PostgreSQL |
| `AUTH_TOKEN_SECRET` | Secreto para firmar tokens de sesion de usuarios |
| `ADMIN_USERNAME` | Usuario del panel admin |
| `ADMIN_PASSWORD` | Contrasena del panel admin |
| `OPENROUTER_API_KEY` | Clave API para las llamadas a IA |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram (obtenido de @BotFather) |
| `ADMIN_TELEGRAM_ID` | ID numerico de Telegram del administrador |
| `APP_BASE_URL` | URL base del dominio |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe |
| `STRIPE_PRICE_PRO_MONTHLY` | ID precio Pro mensual |
| `STRIPE_PRICE_PRO_ANNUAL` | ID precio Pro anual |
| `CRON_SECRET` | Secreto para proteger endpoints de cron jobs |

### Opcionales pero recomendadas

| Variable | Descripcion |
|---|---|
| `ADMIN_AUTH_SECRET` | Secreto independiente para sesiones admin. Si no se configura, usa `AUTH_TOKEN_SECRET` |
| `TELEGRAM_WEBHOOK_SECRET` | Token para verificar webhooks de Telegram |
| `FREE_PLAN_UNLIMITED` | Desactiva limites del plan gratuito |
| `RESEND_API_KEY` | Clave de Resend para emails transaccionales |
| `EMAIL_FROM` | Direccion de remitente de emails |

### Como obtener el ADMIN_TELEGRAM_ID

1. Escribe `/start` a `@userinfobot` en Telegram
2. El bot responde con tu ID numerico
3. Copia ese numero en `ADMIN_TELEGRAM_ID`

### Como registrar el webhook de Telegram

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tresmilmillonesdelatidos.es/api/telegram/webhook"}'
```

Para verificar:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

---

## 17. Referencia rapida de endpoints

### Auth usuario

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/auth/login` | Login email/contrasena |
| `POST` | `/api/auth/signup` | Registro de usuario |
| `GET/POST` | `/api/auth/bootstrap` | Sesion anonima |
| `POST` | `/api/auth/capture-email` | Captura de email |
| `POST` | `/api/auth/forgot-password` | Solicitar reset de contrasena |
| `POST` | `/api/auth/reset-password` | Aplicar reset de contrasena |
| `POST` | `/api/auth/change-password` | Cambiar contrasena |
| `POST` | `/api/auth/token` | Validar sesion |
| `POST` | `/api/auth/link-telegram` | Vincular cuenta Telegram |

### Admin (requieren cookie `mw_admin_session`)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/admin/login` | Login admin |
| `POST` | `/api/admin/logout` | Logout admin |
| `GET` | `/api/admin/users` | Lista de usuarios |
| `GET` | `/api/admin/users/[id]` | Detalle de usuario |
| `POST` | `/api/admin/users/[id]/change-plan` | Cambiar plan de suscripcion |
| `GET` | `/api/admin/users/[id]/emotional-history` | Historial emocional |
| `GET` | `/api/admin/users/[id]/export-pdf` | Exportar PDF del usuario |
| `GET` | `/api/admin/insights` | Metricas y alertas del dashboard |
| `GET` | `/api/admin/retention` | Retencion por cohortes |
| `GET` | `/api/admin/analytics` | Analytics general |
| `GET` | `/api/admin/llm-usage` | Consumo de tokens y costes |
| `GET/POST` | `/api/admin/clinical-notes/[userId]` | Notas clinicas (listar/crear) |
| `DELETE` | `/api/admin/clinical-notes/[userId]?noteId=X` | Eliminar nota clinica |
| `GET` | `/api/admin/assessments/[userId]` | Evaluaciones |
| `GET` | `/api/admin/conversations/[id]` | Conversacion individual |
| `GET` | `/api/admin/crisis` | Eventos de crisis |
| `GET` | `/api/admin/crm` | Datos de CRM |
| `GET` | `/api/admin/export` | Exportacion de datos |
| `GET` | `/api/admin/family` | Datos de portales familiares |
| `GET` | `/api/admin/feedback` | Feedback de usuarios |
| `GET` | `/api/admin/notifications` | Configuracion de notificaciones |
| `GET` | `/api/admin/operations` | Estado de operaciones |
| `GET` | `/api/admin/settings` | Configuracion del sistema |
| `GET` | `/api/admin/telegram-report` | Generar y enviar resumen Telegram |
| `POST` | `/api/admin/test-email` | Test de envio de email |
| `POST` | `/api/admin/backup` | Backup de datos |
| `GET` | `/api/admin/tasks` | Tareas admin pendientes |
| `GET` | `/api/admin/accompaniment` | Datos de acompanamiento |

### Admin — Marketing (requieren cookie `mw_admin_session` + rol marketing)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/admin/marketing/broadcast` | Enviar broadcast a segmento |
| `GET/POST` | `/api/admin/marketing/campaign` | Gestionar campanas |
| `GET` | `/api/admin/marketing/metrics` | Metricas de campanas |
| `GET` | `/api/admin/marketing/history` | Historial de envios |
| `GET` | `/api/admin/marketing/segments` | Listar segmentos |

### Admin — Equipos (requieren cookie `mw_admin_session` + superadmin)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/admin/team` | Lista de admins |
| `POST` | `/api/admin/team` | Crear admin |
| `PUT` | `/api/admin/team/[id]` | Editar admin |
| `DELETE` | `/api/admin/team/[id]` | Eliminar admin |

### Admin — Organizaciones (requieren cookie `mw_admin_session`)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/admin/organizations` | Lista de organizaciones |
| `POST` | `/api/admin/organizations` | Crear organizacion |
| `GET` | `/api/admin/organizations/[id]/users` | Usuarios de una organizacion |

### Admin clinico (requieren cookie `mw_admin_session`)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/admin-clinical/users` | Lista clinica con filtros |
| `GET` | `/api/admin-clinical/user/[id]` | Detalle clinico completo |
| `POST` | `/api/admin-clinical/intervention` | Enviar intervencion |

**Body de POST /api/admin-clinical/intervention:**
```json
{
  "userId": "abc123xyz",
  "type": "message",
  "content": "Texto de la intervencion",
  "notify": true
}
```

Tipos validos: `message` | `recommendation` | `resource` | `assessment`

### Portal organizacional

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/org/auth` | Login organizacional |
| `GET` | `/api/org/dashboard` | Datos dashboard org |
| `GET` | `/api/org/patients` | Lista de pacientes |

### Portal familia

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/family/[token]` | Datos del portal familia |
| `GET` | `/api/family/[token]/dashboard` | Dashboard familia |
| `POST` | `/api/family/[token]/support-message` | Enviar mensaje de apoyo |
| `POST` | `/api/family/[token]/ping` | Enviar ping al usuario |

### Billing (Stripe)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/billing/checkout` | Crear sesion de pago |
| `POST` | `/api/billing/portal` | Portal de gestion Stripe |
| `GET` | `/api/billing/status` | Estado de suscripcion |
| `POST` | `/api/billing/webhook` | Webhook de Stripe |

### Telegram

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/telegram/webhook` | Webhook del bot |

### Cron jobs (requieren `?secret=CRON_SECRET`)

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/cron/24h-nudge` | Nudge a usuarios inactivos tras 24h |
| `GET` | `/api/cron/action-reminders` | Recordatorios de acciones pendientes |
| `GET` | `/api/cron/inactivity-check` | Deteccion de inactividad |
| `GET` | `/api/cron/proactive-review` | Revision proactiva de progreso |
| `GET` | `/api/cron/reminders` | Recordatorios generales |
| `GET` | `/api/cron/scheduled-emails` | Envio de emails programados |
| `GET` | `/api/cron/telegram-checkin` | Check-in diario via Telegram |
| `GET` | `/api/cron/user-weekly-review` | Revision semanal por usuario |
| `GET` | `/api/cron/weekly-inactive-reminder` | Re-engagement de inactivos |
| `GET` | `/api/cron/weekly-summary` | Resumen semanal |

### Sistema

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/ready` | Readiness check |
