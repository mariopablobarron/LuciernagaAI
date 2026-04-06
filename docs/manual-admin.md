# Manual de administración — Tres Mil Millones de Latidos

**Versión:** 1.1  
**Fecha:** abril 2026  
**Audiencia:** Administradores del sistema y equipo clínico  

---

## Índice

0. [URLs y accesos rapidos](#0-urls-y-accesos-rapidos)
1. [Acceso al panel admin](#1-acceso-al-panel-admin)
2. [Notificaciones Telegram — qué recibes y de dónde vienen](#2-notificaciones-telegram)
3. [Comandos Telegram como administrador](#3-comandos-telegram-como-administrador)
4. [Panel clínico — lista de usuarios](#4-panel-clínico--lista-de-usuarios)
5. [Panel clínico — detalle de usuario](#5-panel-clínico--detalle-de-usuario)
6. [Enviar intervenciones](#6-enviar-intervenciones)
7. [Variables de entorno clave](#7-variables-de-entorno-clave)
8. [Referencia rápida de endpoints](#8-referencia-rápida-de-endpoints)

---

## 0. URLs y accesos rapidos

### Aplicación web

| Entorno | URL |
|---|---|
| Producción principal | `https://luciernaga.ai` |
| Dominio alternativo | `https://tresmilmillonesdelatidos.es` |
| Desarrollo local | `http://localhost:3000` |

### Panel de administración

| Sección | URL de producción |
|---|---|
| Login admin | `https://luciernaga.ai/admin/login` |
| Dashboard | `https://luciernaga.ai/admin` |
| Usuarios | `https://luciernaga.ai/admin/users` |
| **Panel clínico** | `https://luciernaga.ai/admin-clinical` |
| Crisis | `https://luciernaga.ai/admin/crisis` |
| Analytics | `https://luciernaga.ai/admin/analytics` |
| Auditoría | `https://luciernaga.ai/admin/audit` |
| LLM Usage | `https://luciernaga.ai/admin/llm-usage` |
| Configuración | `https://luciernaga.ai/admin/settings` |

### Credenciales de acceso

| Credencial | Variable de entorno | Dónde configurar |
|---|---|---|
| Usuario admin | `ADMIN_USERNAME` | Panel de despliegue (Coolify) |
| Contraseña admin | `ADMIN_PASSWORD` | Panel de despliegue (Coolify) |
| Sesión válida durante | 24 horas | — |

> Las credenciales no se almacenan en el repositorio. Solicítalas al responsable técnico del proyecto.

### Bot de Telegram

| Canal | Referencia |
|---|---|
| Bot de usuarios | Configurado en `TELEGRAM_BOT_USERNAME` |
| Para usar el bot | Busca el bot en Telegram y envía `/start` |
| Chat admin (alertas) | Tu ID numérico configurado en `ADMIN_TELEGRAM_ID` |
| Obtener tu ID | Escribe a `@userinfobot` en Telegram |

### APIs — salud del sistema

| Endpoint | Propósito |
|---|---|
| `GET https://luciernaga.ai/api/health` | Health check general |
| `GET https://luciernaga.ai/api/ready` | Readiness — confirma que acepta tráfico |

```bash
# Verificar que el sistema está activo
curl https://luciernaga.ai/api/health

# Verificar estado del webhook de Telegram
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

---

## 1. Acceso al panel admin

El panel admin está disponible en `/admin`. Requiere las credenciales configuradas en las variables de entorno `ADMIN_USERNAME` y `ADMIN_PASSWORD`.

**Pasos:**
1. Navega a `https://tu-dominio.com/admin/login`
2. Introduce usuario y contraseña
3. La sesión dura 24 horas (cookie `mw_admin_session`)
4. Para cerrar sesión, usa el botón "Cerrar sesión" en la cabecera del panel

**Secciones disponibles desde el nav:**

| Sección | Ruta | Descripción |
|---|---|---|
| Dashboard | `/admin` | Métricas generales, insights, alertas automatizadas |
| Usuarios | `/admin/users` | Listado completo con filtros y engagement score |
| Panel clínico | `/admin-clinical` | Monitorización clínica e intervenciones |
| Analytics | `/admin/analytics` | Retención, cohortes, funnels |
| Crisis | `/admin/crisis` | Eventos de crisis activos e histórico |
| Auditoría | `/admin/audit` | Log de eventos del sistema |
| LLM Usage | `/admin/llm-usage` | Consumo de tokens y costes IA |

> El panel clínico (`/admin-clinical`) usa la misma sesión que el resto del admin — no requiere login separado.

---

## 2. Notificaciones Telegram

El bot envía notificaciones automáticas al administrador configurado en `ADMIN_TELEGRAM_ID`. Cada mensaje indica su origen en cursiva al final.

### Catálogo completo de notificaciones

#### Actividad de usuarios

| Cuándo se dispara | Formato |
|---|---|
| Usuario nuevo creado (web o Telegram) | `👤 Nuevo usuario` |
| Usuario proporciona su email | `📧 Usuario identificado` |

Ejemplo:
```
👤 *Nuevo usuario*

ID: `abc123xyz`
_Vía: App web_
```

```
📧 *Usuario identificado*

ID: `abc123xyz`
Email: nombre@ejemplo.com
_Vía: Telegram_
```

> El ID tiene prefijo `tg_` si el usuario vino desde el bot de Telegram, o un cuid si vino desde la web.

---

#### Cambios de estado emocional

Se dispara cuando un usuario completa una acción en el módulo "Explorar" y su estado emocional transiciona a `bloqueo`, `claridad` o `ansiedad` con crisis activa.

```
🧠 *Cambio de estado emocional*

👤 Usuario: `abc123xyz`
🎯 Acción: Nombrar el bloqueo
💡 Estado: neutral → *claridad*
_Vía: App web_
```

**Acciones posibles:**

| Código interno | Etiqueta visible |
|---|---|
| `name_block` | Nombrar el bloqueo |
| `next_step` | Definir siguiente paso |
| `close_pending` | Cerrar pendiente |
| `order_thoughts` | Ordenar pensamientos |

---

#### Crisis

```
🚨 *Crisis detectada*

👤 Usuario: `abc123xyz`
⚡ Nivel: *alto*
💬 _fragmento del último mensaje…_
_Vía: App web_
```

También puedes recibir este formato desde `sendAdminUserAlert` cuando se detectan palabras clave de riesgo vital en el webhook de Telegram:

```
🚨 *Usuario requiere atención*

👤 ID: `tg_987654321`
🧠 Estado: *riesgo*
📌 Motivo: Palabras clave de riesgo vital detectadas
💬 _fragmento del mensaje…_
_Vía: Telegram_
```

---

#### Rachas (check-in diario)

Se envía cuando un usuario alcanza 3, 7, 14, 21 o 30 días consecutivos de check-in.

```
🔥 *Racha destacada*

ID: `abc123xyz`
Racha: *7 días*
_Vía: Check-in diario_
```

---

#### Pagos y suscripciones (Stripe)

```
🎉 *Prueba gratuita iniciada (7 días)*

📧 Email: `nombre@ejemplo.com`
📦 Plan: *pro* — 0,00 €
👤 ID: `abc123xyz`
_Vía: Stripe webhook_
```

```
💰 *Pago confirmado*

📧 Email: `nombre@ejemplo.com`
📦 Plan: *pro* — 9,99 €
👤 ID: `abc123xyz`
_Vía: Stripe webhook_
```

```
❌ *Suscripción cancelada*

📧 Email: `nombre@ejemplo.com`
👤 ID: `abc123xyz`
🔑 Sub: `sub_abc123xyz`
_Vía: Stripe webhook_
```

---

#### Test diagnóstico (quiz)

```
⚡ *Test diagnóstico completado*

Estado detectado: *ansiedad*
Estado anterior: neutral
Usuario: `abc123xyz`
```

---

#### Formulario de contacto

```
📬 *Nuevo mensaje de contacto*

*Nombre:* Ana García
*Email:* `ana@ejemplo.com`

*Mensaje:*
Tengo una duda sobre la suscripción...
```

---

#### Resumen semanal (cron)

Se envía automáticamente cada semana vía cron job. También puede dispararse manualmente desde `/api/admin/telegram-report`.

```
📊 *Resumen semanal — Tres Mil Millones de Latidos*
_Período: últimos 7 días_

👥 Usuarios activos: *42*
🆕 Nuevos registros: *8*
💬 Mensajes enviados: *317*
✅ Check-ins: *29*
📋 Evaluaciones completadas: *5*

🚨 *Crisis (high/critical): 2*
  · `tg_123` — high — fragmento del mensaje...
```

---

#### Intervención enviada desde panel clínico

```
✅ *Intervención enviada*

👤 Usuario: `abc123xyz` (Ana García)
🏷 Tipo: Recomendación
💬 _texto de la intervención…_
```

---

### Origen de los mensajes — dónde está el código

| Notificación | Archivo |
|---|---|
| Nuevo usuario | [src/app/api/auth/bootstrap/route.ts](../src/app/api/auth/bootstrap/route.ts) |
| Email capturado | [src/app/api/auth/capture-email/route.ts](../src/app/api/auth/capture-email/route.ts) |
| Cambio de estado | [src/app/api/actions/trigger/route.ts](../src/app/api/actions/trigger/route.ts) |
| Crisis (app web) | [src/app/api/actions/trigger/route.ts](../src/app/api/actions/trigger/route.ts) |
| Crisis (Telegram) | [src/app/api/telegram/webhook/route.ts](../src/app/api/telegram/webhook/route.ts) |
| Usuario en riesgo | [src/lib/alerts.ts](../src/lib/alerts.ts) — `sendAdminUserAlert` |
| Racha destacada | [src/app/api/checkin/route.ts](../src/app/api/checkin/route.ts) |
| Pago confirmado | [src/app/api/billing/webhook/route.ts](../src/app/api/billing/webhook/route.ts) |
| Cancelación | [src/app/api/billing/webhook/route.ts](../src/app/api/billing/webhook/route.ts) |
| Test diagnóstico | [src/app/api/quiz/result/route.ts](../src/app/api/quiz/result/route.ts) |
| Contacto | [src/app/api/contact/route.ts](../src/app/api/contact/route.ts) |
| Resumen semanal | [src/app/api/cron/weekly-summary/route.ts](../src/app/api/cron/weekly-summary/route.ts) |
| Intervención clínica | [src/features/admin-clinical/send-intervention.ts](../src/features/admin-clinical/send-intervention.ts) |

El constructor de mensajes admin está centralizado en [src/services/telegram.ts](../src/services/telegram.ts) — función `buildAdminAlert`.

---

## 3. Comandos Telegram como administrador

Cuando escribes al bot desde el chat configurado como `ADMIN_TELEGRAM_ID`, tienes acceso a comandos exclusivos.

### Comandos disponibles

| Comando | Qué muestra |
|---|---|
| `/ayuda` | Lista todos los comandos admin disponibles |
| `/stats` | Activos hoy, nuevos hoy, mensajes totales y distribución de estados |
| `/usuarios` | Últimos 20 usuarios activos en las 24h anteriores con hora de actividad |
| `/crisis` | Usuarios con `crisisActive = true` en este momento |
| `/retencion` | Usuarios totales, activos esta semana (%), waitlist aprobados, rachas activas |
| `/estado` | Distribución emocional actual de todos los usuarios (porcentajes) |
| `/tareas` | Cola de `AdminTask` con estado `pending` |

### Modo IA libre

Cualquier mensaje que escribas al bot que **no sea un comando** activa el modo IA directa: el bot consulta Claude con contexto del sistema (métricas actuales) y te responde en segundos.

Ejemplo de uso:
```
Tú: ¿Qué usuarios llevan más de 3 días sin hacer check-in?
Bot: ⏳ Pensando...
Bot: [respuesta de IA con análisis]
```

### Comandos disponibles para usuarios regulares

Los usuarios del bot (no admin) solo pueden usar:

| Comando | Acción |
|---|---|
| `/start` | Inicia el proceso de consentimiento |
| `/privacidad` | Muestra la política de privacidad |
| `/estado` | Lista sus acciones pendientes |
| `/vincular` | Genera un enlace para conectar Telegram con la cuenta web |
| `/salir` | Desactiva los recordatorios |
| `/borrar_datos` | Elimina todos sus datos del sistema |

---

## 4. Panel clínico — lista de usuarios

**Ruta:** `/admin-clinical`

Muestra todos los usuarios con información clínica relevante. Se actualiza al cambiar filtros.

### Columnas de la tabla

| Columna | Descripción |
|---|---|
| Usuario | Nombre o email. Icono 🛡 si tiene crisis activa |
| Estado | Estado emocional actual: neutral / duda / bloqueo / ansiedad / claridad |
| Riesgo | Nivel de riesgo: low / medium / high / critical |
| Crisis 7d | Número de eventos de crisis en los últimos 7 días (en rojo si > 0) |
| Racha | Días consecutivos de check-in |
| Intervenciones | Total de intervenciones recibidas del equipo clínico |
| Última actividad | Tiempo relativo desde la última sesión (ej. "hace 3h") |

### Filtros disponibles

- **Por estado:** Todos / Ansiedad / Bloqueo / Duda / Claridad / Neutral
- **Solo riesgo alto/crítico:** filtra usuarios con `riskLevel = high|critical` o `crisisActive = true`
- **Paginación:** 50 usuarios por página

### Cómo interpretar el riesgo

| Nivel | Significado | Acción recomendada |
|---|---|---|
| `low` | Sin señales de alarma | Seguimiento rutinario |
| `medium` | Patrón de evitación o estado negativo sostenido | Revisar historial |
| `high` | Crisis recientes o estado de ansiedad persistente | Contactar en 24h |
| `critical` | Crisis activa en este momento | Intervención inmediata |

---

## 5. Panel clínico — detalle de usuario

**Ruta:** `/admin-clinical/user/[id]`

Accede haciendo clic en "Ver" en la fila de cualquier usuario (aparece al pasar el cursor).

### Secciones del detalle

**Cabecera**
- Nombre, email e ID del usuario
- Badge de crisis activa (si aplica)
- Badge de nivel de riesgo
- Fecha de registro, origen (web / telegram) y última actividad

**Estado emocional**
Muestra los campos del modelo `UserState`:

| Campo | Descripción |
|---|---|
| Estado | Estado actual del sistema de estados |
| Emoción primaria | Emoción dominante detectada |
| Patrón dominante | Patrón comportamental recurrente |
| Foco | Área de vida en la que está centrado |
| Energía | Nivel de energía reportado |
| Tendencia | Evolución reciente (mejorando / estable / empeorando) |
| Mood | Estado de ánimo general |

**Perfil emocional**
Barras de progreso con puntuaciones del 0 al 10 en: Claridad, Autoestima, Energía, Disciplina y Social. Puntación total al pie.

**Objetivos**
Lista de goals activos e inactivos con sus acciones asociadas. Las acciones completadas aparecen tachadas.

**Eventos de crisis** *(colapsable, visible por defecto)*
Historial de crisis ordenado del más reciente al más antiguo. Cada evento muestra nivel, fecha y fragmento del mensaje que lo desencadenó.

**Historial de mensajes** *(colapsable, oculto por defecto)*
Últimos 50 mensajes de la conversación del usuario, formato de burbuja. Los mensajes del usuario aparecen a la derecha (azul), las respuestas del asistente a la izquierda (gris).

---

## 6. Enviar intervenciones

El panel de intervención está en la columna derecha del detalle de usuario. Es **sticky** — permanece visible mientras navegas la página.

### Tipos de intervención

| Tipo | Cuándo usarlo |
|---|---|
| `Mensaje` | Comunicación directa o acompañamiento |
| `Recomendación` | Sugerencia de acción concreta (ejercicio, recurso, pauta) |
| `Recurso` | Enlace o material de apoyo |
| `Evaluación` | Solicitud de completar una escala (PHQ-9, GAD-7, etc.) |

### Pasos para enviar

1. Selecciona el tipo de intervención (cuatro botones en la parte superior del panel)
2. Escribe el contenido en el área de texto
3. Marca o desmarca "Notificar por Telegram" según si el usuario tiene el bot vinculado
4. Haz clic en **Enviar intervención**

### Qué ocurre tras enviar

1. La intervención se persiste en base de datos (modelo `Intervention`) con estado `sent`
2. Si el usuario tiene `telegramId` y la notificación está activada, recibe el mensaje en el bot con el formato:
   ```
   💬 *Recomendación* de tu equipo de apoyo:
   
   [texto de la intervención]
   ```
3. El administrador recibe confirmación en su propio Telegram
4. La intervención aparece inmediatamente en la sección "Intervenciones previas" del mismo panel

### Historial de intervenciones previas

Debajo del panel de envío aparecen las intervenciones anteriores enviadas al usuario, ordenadas de más reciente a más antigua. Cada tarjeta muestra tipo, fecha, contenido y estado actual (`sent` / `read` / `resolved`).

---

## 7. Variables de entorno clave

Todas las variables se configuran en `.env` (desarrollo) o en el panel de despliegue (producción).

### Obligatorias en producción

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `AUTH_TOKEN_SECRET` | Secreto para firmar tokens de sesión de usuarios |
| `ADMIN_USERNAME` | Usuario del panel admin |
| `ADMIN_PASSWORD` | Contraseña del panel admin |
| `OPENROUTER_API_KEY` | Clave API para las llamadas a IA |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram (obtenido de @BotFather) |
| `ADMIN_TELEGRAM_ID` | ID numérico de Telegram del administrador |

### Opcionales pero recomendadas

| Variable | Descripción |
|---|---|
| `ADMIN_AUTH_SECRET` | Secreto independiente para las sesiones admin. Si no se configura, usa `AUTH_TOKEN_SECRET` |
| `TELEGRAM_WEBHOOK_SECRET` | Token para verificar que los webhooks de Telegram son legítimos |
| `APP_BASE_URL` | URL base del dominio (usada en enlaces del bot) |
| `CRON_SECRET` | Secreto para proteger los endpoints de cron jobs |

### Cómo obtener el ADMIN_TELEGRAM_ID

1. Escribe `/start` a `@userinfobot` en Telegram
2. El bot responde con tu ID numérico
3. Copia ese número en `ADMIN_TELEGRAM_ID`

### Cómo registrar el webhook de Telegram

Después de desplegar en producción:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tu-dominio.com/api/telegram/webhook"}'
```

Para verificar que está registrado:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

---

## 8. Referencia rápida de endpoints

### Endpoints del panel admin (requieren cookie `mw_admin_session`)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/admin/users` | Lista de usuarios con engagement score |
| `GET` | `/api/admin/users/[id]` | Detalle completo de un usuario |
| `GET` | `/api/admin/insights` | Métricas y alertas del dashboard |
| `GET` | `/api/admin/retention` | Retención por cohortes |
| `GET` | `/api/admin/telegram-report` | Genera y envía resumen por Telegram |
| `GET` | `/api/admin/clinical-notes/[userId]` | Notas clínicas de un usuario |
| `GET` | `/api/admin/assessments/[userId]` | Evaluaciones de un usuario |
| `GET` | `/api/admin/llm-usage` | Consumo de tokens y costes |

### Endpoints del panel clínico (requieren cookie `mw_admin_session`)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/admin-clinical/users` | Lista clínica con filtros por estado y riesgo |
| `GET` | `/api/admin-clinical/user/[id]` | Detalle clínico: estado, mensajes, objetivos, crisis, intervenciones |
| `POST` | `/api/admin-clinical/intervention` | Envía y persiste una intervención |

**Body de POST /api/admin-clinical/intervention:**
```json
{
  "userId": "abc123xyz",
  "type": "message",
  "content": "Texto de la intervención",
  "notify": true
}
```

**Tipos válidos:** `message` | `recommendation` | `resource` | `assessment`

### Endpoints públicos del bot de Telegram

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/telegram/webhook` | Recibe todos los mensajes del bot |

### Endpoints de cron (requieren `?secret=CRON_SECRET`)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/cron/weekly-summary` | Resumen semanal por Telegram |
| `GET` | `/api/cron/action-reminders` | Recordatorios de acciones pendientes |
