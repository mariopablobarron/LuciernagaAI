# Manual de administracion — Tres Mil Millones de Latidos

**Version:** 2.0
**Fecha:** 7 de abril de 2026
**Audiencia:** Administradores del sistema, equipo clinico y responsables B2B

---

## Indice

0. [URLs y accesos rapidos](#0-urls-y-accesos-rapidos)
1. [Mapa de accesos y roles](#1-mapa-de-accesos-y-roles)
2. [Panel admin — acceso y secciones](#2-panel-admin--acceso-y-secciones)
3. [Panel clinico — lista de usuarios](#3-panel-clinico--lista-de-usuarios)
4. [Panel clinico — detalle de usuario](#4-panel-clinico--detalle-de-usuario)
5. [Enviar intervenciones](#5-enviar-intervenciones)
6. [Portal organizacional B2B](#6-portal-organizacional-b2b)
7. [Portal familia / contacto de confianza](#7-portal-familia--contacto-de-confianza)
8. [Notificaciones Telegram](#8-notificaciones-telegram)
9. [Comandos Telegram como administrador](#9-comandos-telegram-como-administrador)
10. [Planes y billing (Stripe)](#10-planes-y-billing-stripe)
11. [Cron jobs automaticos](#11-cron-jobs-automaticos)
12. [Variables de entorno clave](#12-variables-de-entorno-clave)
13. [Referencia rapida de endpoints](#13-referencia-rapida-de-endpoints)

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
| Auditoria | `https://tresmilmillonesdelatidos.es/admin/audit` |
| LLM Usage | `https://tresmilmillonesdelatidos.es/admin/llm-usage` |
| Configuracion | `https://tresmilmillonesdelatidos.es/admin/settings` |

### Portal organizacional B2B

| Seccion | URL |
|---|---|
| Login organizacion | `https://tresmilmillonesdelatidos.es/org/login` |
| Dashboard org | `https://tresmilmillonesdelatidos.es/org/dashboard` |
| Pacientes (terapeuta) | `https://tresmilmillonesdelatidos.es/org/patients` |

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

## 1. Mapa de accesos y roles

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

## 2. Panel admin — acceso y secciones

### Pasos de acceso

1. Navega a `/admin/login`
2. Introduce usuario y contrasena
3. La sesion dura 24 horas (cookie `mw_admin_session`)
4. Para cerrar sesion, usa el boton "Cerrar sesion" en la cabecera

### Secciones disponibles

| Seccion | Ruta | Descripcion |
|---|---|---|
| Dashboard | `/admin` | Metricas generales, insights, alertas, retencion, distribucion emocional, crisis, evitacion, decisiones |
| Usuarios | `/admin/users` | Listado completo con filtros, engagement score, detalle por usuario |
| Detalle usuario | `/admin/users/[id]` | Conversaciones, timeline emocional, objetivos, notas clinicas, export PDF |
| Conversacion | `/admin/users/[id]/conversations/[convId]` | Visualizador de conversacion individual |
| Panel clinico | `/admin-clinical` | Monitorizacion clinica, estados emocionales, riesgo, intervenciones |
| Analytics | `/admin/analytics` | Retencion por cohortes, funnels |
| Crisis | `/admin/crisis` | Eventos de crisis activos e historico (24h/7d/30d) |
| Auditoria | `/admin/audit` | Log de eventos del sistema |
| LLM Usage | `/admin/llm-usage` | Consumo de tokens y costes IA |
| Configuracion | `/admin/settings` | Configuracion del sistema |

> El panel clinico (`/admin-clinical`) usa la misma sesion que el resto del admin — no requiere login separado.

---

## 3. Panel clinico — lista de usuarios

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

## 4. Panel clinico — detalle de usuario

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

## 5. Enviar intervenciones

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

## 6. Portal organizacional B2B

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

## 7. Portal familia / contacto de confianza

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

## 8. Notificaciones Telegram

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

## 9. Comandos Telegram como administrador

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

## 10. Planes y billing (Stripe)

### Planes configurados

| Plan | Precio | Limites |
|---|---|---|
| Free | 0 euros | 10 conversaciones/mes, 20 mensajes/conversacion |
| Pro mensual | 9 euros/mes | Ilimitado + Modo Impulso |
| Pro anual | 79 euros/ano | Ilimitado + Modo Impulso |

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

## 11. Cron jobs automaticos

Todos los cron jobs requieren el parametro `?secret=CRON_SECRET`.

| Ruta | Descripcion |
|---|---|
| `/api/cron/weekly-summary` | Resumen semanal enviado por Telegram |
| `/api/cron/action-reminders` | Recordatorios de acciones pendientes |
| `/api/cron/reminders` | Recordatorios generales a usuarios |
| `/api/cron/user-weekly-review` | Revision semanal proactiva por usuario |
| `/api/cron/proactive-review` | Revision proactiva de progreso |
| `/api/cron/inactivity-check` | Deteccion de usuarios inactivos |

---

## 12. Variables de entorno clave

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

## 13. Referencia rapida de endpoints

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
| `GET` | `/api/admin/users/[id]/emotional-history` | Historial emocional |
| `GET` | `/api/admin/users/[id]/export-pdf` | Exportar PDF del usuario |
| `GET` | `/api/admin/insights` | Metricas y alertas del dashboard |
| `GET` | `/api/admin/retention` | Retencion por cohortes |
| `GET` | `/api/admin/llm-usage` | Consumo de tokens y costes |
| `GET` | `/api/admin/clinical-notes/[userId]` | Notas clinicas |
| `GET` | `/api/admin/assessments/[userId]` | Evaluaciones |
| `GET` | `/api/admin/conversations/[id]` | Conversacion individual |
| `GET` | `/api/admin/telegram-report` | Generar y enviar resumen Telegram |
| `POST` | `/api/admin/test-email` | Test de envio de email |
| `POST` | `/api/admin/backup` | Backup de datos |
| `GET` | `/api/admin/tasks` | Tareas admin pendientes |
| `GET` | `/api/admin/accompaniment` | Datos de acompanamiento |

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
| `GET` | `/api/cron/weekly-summary` | Resumen semanal |
| `GET` | `/api/cron/action-reminders` | Recordatorios de acciones |
| `GET` | `/api/cron/reminders` | Recordatorios generales |
| `GET` | `/api/cron/user-weekly-review` | Revision semanal por usuario |
| `GET` | `/api/cron/proactive-review` | Revision proactiva |
| `GET` | `/api/cron/inactivity-check` | Deteccion de inactividad |

### Sistema

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/ready` | Readiness check |
