# Manual SaaS Tres Mil Millones de Latidos

## Control del documento

- Producto: Tres Mil Millones de Latidos
- Tipo: Manual maestro SaaS, version operativa
- Objetivo: Documentar negocio, producto, arquitectura, operacion y calidad para un entorno productivo
- Alcance: Aplicacion web de mentoria con IA, backend API, persistencia, panel admin y despliegue
- Fecha base: 30 de marzo de 2026

## Fuentes primarias del repositorio

- Vision general y operacion: [README.md](../README.md)
- Motor de decisiones: [DECISION_ENGINE.md](../DECISION_ENGINE.md)
- Despliegue Coolify detallado: [COOLIFY_DEPLOY_STEPS.md](../COOLIFY_DEPLOY_STEPS.md)
- Despliegue Coolify resumen: [COOLIFY_QUICK_REF.md](../COOLIFY_QUICK_REF.md)
- Esquema de datos: [prisma/schema.prisma](../prisma/schema.prisma)
- Stack y scripts: [package.json](../package.json)
- Contenedor productivo: [Dockerfile](../Dockerfile)
- Pipeline despliegue: [.github/workflows/coolify-auto-deploy.yml](../.github/workflows/coolify-auto-deploy.yml)
- Config Next y headers: [next.config.ts](../next.config.ts)

## Distribucion sugerida de 50 paginas

1. Portada, control y legal interno: 2 paginas
2. Resumen ejecutivo: 2 paginas
3. Producto y propuesta de valor: 3 paginas
4. Usuarios objetivo y journeys: 3 paginas
5. Arquitectura general: 4 paginas
6. Frontend y experiencia: 3 paginas
7. Backend y catalogo API: 7 paginas
8. Modelo de datos y persistencia: 4 paginas
9. Seguridad y autenticacion: 4 paginas
10. Motor IA y logica conversacional: 4 paginas
11. Analitica e insights admin: 3 paginas
12. DevOps y despliegue: 4 paginas
13. Operacion, monitoreo y alertas: 3 paginas
14. QA, testing y liberacion: 2 paginas
15. Riesgos, deuda tecnica y roadmap: 1 pagina
16. Anexos operativos: 1 pagina

Total: 50 paginas

---

## 1) Portada, control y legal interno (2 paginas)

### 1.1 Portada

- Nombre del producto
- Version del manual
- Fecha
- Responsable de producto
- Responsable tecnico

### 1.2 Control de cambios

| Version | Fecha               | Tipo de cambio                                                                          | Secciones impactadas     | Responsable    |
| ------- | ------------------- | --------------------------------------------------------------------------------------- | ------------------------ | -------------- |
| v0.1    | 30 de marzo de 2026 | Estructura base del manual maestro                                                      | 1-16 (plantilla inicial) | Equipo tecnico |
| v0.2    | 30 de marzo de 2026 | Se incorporan skills operativas para desarrollo, QA, seguridad y operacion              | 12, 13, 14, 15, 16       | Equipo tecnico |
| v0.3    | 30 de marzo de 2026 | Se incorporan contratos API operativos con request/responses y errores                  | 7                        | Equipo tecnico |
| v0.4    | 30 de marzo de 2026 | Se completan contratos API de Nivel 1 (chat-direct, conversations, messages, actions)   | 7                        | Equipo tecnico |
| v0.5    | 30 de marzo de 2026 | Se completan contratos API de Nivel 2 (admin login, admin logout, alerts)               | 7                        | Equipo tecnico |
| v0.6    | 30 de marzo de 2026 | Se completa contrato API de Nivel 3 (mock-chat) y se cierra expansion de catalogo       | 7                        | Equipo tecnico |
| v0.7    | 30 de marzo de 2026 | Se completa modelo de datos detallado y matriz de controles de seguridad por endpoint   | 8, 9                     | Equipo tecnico |
| v0.8    | 30 de marzo de 2026 | Se convierte hardening en plan por sprint y se agrega matriz de pruebas de seguridad    | 9, 14                    | Equipo tecnico |
| v0.9    | 30 de marzo de 2026 | Se agrega checklist semanal de hardening con comandos y evidencia minima por semana     | 9, 14                    | Equipo tecnico |
| v0.10   | 30 de marzo de 2026 | Se agrega tablero de ejecucion semanal para seguimiento operativo diario                | 9, 14                    | Equipo tecnico |
| v0.11   | 30 de marzo de 2026 | Se automatiza la actualizacion del tablero semanal via script y workflow programado     | 9, 12                    | Equipo tecnico |
| v0.12   | 30 de marzo de 2026 | Se agrega escalamiento automatico con issue cuando una semana queda bloqueada           | 9, 12, 13                | Equipo tecnico |
| v0.13   | 30 de marzo de 2026 | Se agrega cierre automatico de issue cuando la semana sale de estado bloqueado          | 9, 12, 13                | Equipo tecnico |
| v0.14   | 4 de abril de 2026  | Se agregan scripts de operacion: backup PostgreSQL diario, telegram test, doc generator | 12, 13, 16               | Equipo tecnico |
| v0.15   | 4 de abril de 2026  | Se arreglan 9 errores de linter en componentes frontend, lint 0 errores                 | 6                        | Equipo tecnico |

Cambios relevantes de v0.2:

- Se agregan skills de entrega y operacion en .github/skills para estandarizar ejecucion.
- Se formaliza enfoque de quality gate, security gate e incident response para release y soporte.
- Se habilita este manual como documento vivo con mantenimiento incremental.

Cambios relevantes de v0.3:

- Se agrega catalogo de contratos API operativos para endpoints criticos en la seccion 7.4.
- Se define prioridad de expansion documental por nivel de criticidad en la seccion 7.5.

Cambios relevantes de v0.4:

- Se documentan contratos operativos de /api/chat-direct, /api/conversations, /api/messages y /api/actions.
- Se deja completado el Nivel 1 de expansion de catalogo API definido en la seccion 7.5.

Cambios relevantes de v0.5:

- Se documentan contratos operativos de /api/admin/login, /api/admin/logout y /api/alerts.
- Se deja completado el Nivel 2 de expansion de catalogo API definido en la seccion 7.5.

Cambios relevantes de v0.6:

- Se documenta contrato operativo de /api/mock-chat para testing y desarrollo.
- Se cierra la expansion por niveles de la seccion 7.5 (Nivel 1, 2 y 3 completados).

Cambios relevantes de v0.7:

- Se agrega diccionario de datos por entidad, reglas de integridad y estrategia de indices en seccion 8.
- Se agrega matriz de controles de seguridad por endpoint y backlog de hardening en seccion 9.

Cambios relevantes de v0.8:

- Se transforma el backlog de hardening en plan ejecutable por sprint con prioridad, esfuerzo y criterio de salida.
- Se agrega matriz de pruebas de seguridad en seccion 14, alineada con endpoints criticos.

Cambios relevantes de v0.9:

- Se agrega checklist operativo semanal (Semana 1-5) con comandos sugeridos de validacion.
- Se agrega matriz de evidencia minima por semana para seguimiento y cierre.

Cambios relevantes de v0.10:

- Se agrega tablero de ejecucion semanal con estados (pendiente/en curso/hecho/bloqueado).
- Se agrega plantilla de cierre semanal para evidencia, riesgos y decision go/no-go.

Cambios relevantes de v0.11:

- Se agrega script de actualizacion automatica del tablero en scripts/auto-update-hardening-board.mjs.
- Se agrega workflow programado para ejecutar la actualizacion diaria en dias habiles.

Cambios relevantes de v0.12:

- El workflow de hardening abre issue automaticamente cuando la semana queda en estado bloqueado.
- El script publica outputs (semana, estado, bloqueador) para orquestar escalamiento en CI.

Cambios relevantes de v0.13:

- El workflow cierra automaticamente la issue de bloqueo cuando la semana pasa a en_curso o hecho.
- Se agrega comentario de cierre con estado actual y enlace al run de CI.

Cambios relevantes de v0.14:

- Se implementan tres scripts de operacion: backup PostgreSQL diario, test Telegram, doc generator.
- Script `scripts/db-backup-daily.sh`: backup diario con compresion gzip-9, SHA256 checksums, retencion configurable (default 14 dias).
- Script `scripts/test-telegram-send.mjs`: valida conectividad de bot Telegram y envia mensaje de prueba.
- Script `scripts/auto-update-commands-doc.mjs`: genera `docs/comandos-operativos.md` de forma idempotente (sin reescrituras innecesarias).
- Cinco nuevos comandos npm: `backup:daily`, `backup:restore:latest`, `test:telegram`, `docs:commands:update`, `docs:commands:check`.
- Documentacion operativa: `docs/daily-backup.md` con setup cron y procedimientos de restaura.
- Documentacion de comando: `docs/comandos-operativos.md` con 23 comandos npm, 15 operativos, 4 variables clave.

Cambios relevantes de v0.15:

- Se arreglan 9 errores de linter: 4 comillas sin escape (react/no-unescaped-entities), 2 setState en useEffect, 1 uso de <a> vs <Link>, 2 variables sin usar.
- Lint status: reducido de 9 errores a 0 errores (5 warnings menores).
- Archivos editados: landing/page.tsx, impulso/page.tsx, ActionNodes.tsx, BenefitsSection.tsx, CentralPrompt.tsx, ChatModal.tsx, HowItWorks.tsx, explore/page.tsx, AssessmentFlow.tsx, Chat.tsx.

Aprobaciones:

- Product owner: pendiente
- Responsable tecnico: aprobado

### 1.3 Avisos internos

- Documento interno de operacion
- No incluir secretos en distribucion
- Referir politicas corporativas de privacidad y seguridad

### 1.4 Politica de actualizacion continua del manual

- Actualizar este documento en cada entrega funcional relevante (feature, bugfix critico, cambio de esquema, cambio de seguridad o despliegue productivo).
- Registrar cada actualizacion en la tabla de versiones con fecha y secciones impactadas.
- Si el cambio afecta contratos API, datos o operacion, actualizar tambien secciones 7, 8, 12, 13 y 14 segun corresponda.
- Mantener trazabilidad entre codigo y manual referenciando rutas reales del repositorio.

---

## 2) Resumen ejecutivo (2 paginas)

### 2.1 Que es Tres Mil Millones de Latidos

Tres Mil Millones de Latidos es un SaaS de mentoria conversacional con IA que detecta estado emocional del usuario, orienta a accion concreta y registra progreso en objetivos y check-ins.

### 2.2 Valor diferencial

- Conversaciones orientadas a decision y accion
- Modelo emocional acumulado y contexto entre sesiones
- Gestion de riesgo emocional con protocolo de crisis
- Panel admin con metricas de retencion, engagement e insights accionables

### 2.3 Estado actual

- Arquitectura productiva con Next.js y API routes
- Persistencia con Prisma y PostgreSQL
- Integracion con OpenRouter para respuestas IA
- Despliegue contenedorizado y operable en Coolify

---

## 3) Producto y propuesta de valor (3 paginas)

### 3.1 Problema que resuelve

Usuarios con bloqueo, ansiedad o duda requieren acompanamiento inmediato, estructurado y accionable.

### 3.2 Solucion

- Interfaz de chat con recomendaciones concretas
- Flujos de conversacion por intencion
- Objetivos y acciones con seguimiento
- Señales de riesgo y escalado

### 3.3 Capacidades principales

- Deteccion de estado: neutral, duda, bloqueo, ansiedad, claridad
- Perfil emocional: emocion primaria, patron, energia, riesgo, tendencia
- Motor de coaching contextual
- Seguimiento de objetivos y evitacion
- Panel admin de decisiones e insights

Referencia funcional principal: [src/app/page.tsx](../src/app/page.tsx)

---

## 4) Usuarios objetivo y journeys (3 paginas)

### 4.1 Segmentos

- Usuario final con necesidad de claridad y accion
- Operador admin para monitoreo del sistema
- Equipo tecnico para operacion y mejora continua

### 4.2 Journey usuario final

1. Inicializa sesion
2. Envia mensaje
3. Sistema detecta estado e intencion
4. Recibe respuesta de coach y accion sugerida
5. Registra check-in o progreso en acciones

Rutas clave:

- [src/app/api/chat/route.ts](../src/app/api/chat/route.ts)
- [src/app/api/checkin/route.ts](../src/app/api/checkin/route.ts)
- [src/app/api/goals/route.ts](../src/app/api/goals/route.ts)

### 4.3 Journey admin

1. Login admin
2. Consulta insights y alertas
3. Interpreta decisiones automaticas
4. Toma acciones de producto o soporte

Rutas clave:

- [src/app/admin/login/page.tsx](../src/app/admin/login/page.tsx)
- [src/app/admin/page.tsx](../src/app/admin/page.tsx)
- [src/app/api/admin/insights/route.ts](../src/app/api/admin/insights/route.ts)

---

## 5) Arquitectura general (4 paginas)

### 5.1 Stack

- Next.js 16, React 19, TypeScript
- Prisma y PostgreSQL
- Integracion OpenRouter
- Docker para empaquetado

Fuente: [README.md](../README.md), [package.json](../package.json)

### 5.2 Capas

- Capa UI: [src/components](../src/components)
- Capa API: [src/app/api](../src/app/api)
- Capa servicios: [src/services](../src/services)
- Capa librerias comunes: [src/lib](../src/lib)
- Capa datos: [prisma/schema.prisma](../prisma/schema.prisma)

### 5.3 Flujo de solicitud chat

1. Cliente envia mensaje a API chat
2. API resuelve identidad y validaciones
3. Aplica rate limit
4. Detecta estado, intencion y riesgo
5. Construye contexto y prompt
6. Solicita respuesta IA
7. Persiste conversacion y estado
8. Devuelve respuesta + señales

Endpoint principal: [src/app/api/chat/route.ts](../src/app/api/chat/route.ts)

---

## 6) Frontend y experiencia (3 paginas)

### 6.1 Modulos UI

- Chat y envio de mensajes: [src/components/Chat.tsx](../src/components/Chat.tsx)
- Mensajes: [src/components/Message.tsx](../src/components/Message.tsx)
- Panel contextual: [src/components/InsightsPanel.tsx](../src/components/InsightsPanel.tsx)
- Sidebar de conversaciones: [src/components/Sidebar.tsx](../src/components/Sidebar.tsx)

### 6.2 Comportamientos clave

- Render de señales de motor: busqueda externa, fallback, flujo activo
- Bloqueo de accion en casos de responsabilidad activa
- Carga perezosa de conversaciones y mensajes

### 6.3 UX admin

- Dashboard de metricas y decisiones
- Lista de alertas
- Seccion de crisis y evitacion

Vista admin: [src/app/admin/page.tsx](../src/app/admin/page.tsx)

---

## 7) Backend y catalogo API (7 paginas)

### 7.1 Endpoints implementados

- [src/app/api/actions/route.ts](../src/app/api/actions/route.ts)
- [src/app/api/admin/insights/route.ts](../src/app/api/admin/insights/route.ts)
- [src/app/api/admin/login/route.ts](../src/app/api/admin/login/route.ts)
- [src/app/api/admin/logout/route.ts](../src/app/api/admin/logout/route.ts)
- [src/app/api/alerts/route.ts](../src/app/api/alerts/route.ts)
- [src/app/api/auth/bootstrap/route.ts](../src/app/api/auth/bootstrap/route.ts)
- [src/app/api/auth/token/route.ts](../src/app/api/auth/token/route.ts)
- [src/app/api/chat-direct/route.ts](../src/app/api/chat-direct/route.ts)
- [src/app/api/chat/route.ts](../src/app/api/chat/route.ts)
- [src/app/api/checkin/route.ts](../src/app/api/checkin/route.ts)
- [src/app/api/conversations/route.ts](../src/app/api/conversations/route.ts)
- [src/app/api/goals/route.ts](../src/app/api/goals/route.ts)
- [src/app/api/health/route.ts](../src/app/api/health/route.ts)
- [src/app/api/messages/route.ts](../src/app/api/messages/route.ts)
- [src/app/api/mock-chat/route.ts](../src/app/api/mock-chat/route.ts)
- [src/app/api/ready/route.ts](../src/app/api/ready/route.ts)

### 7.2 Matriz de API por dominio

- Sesion y autenticacion: bootstrap, token
- Conversacion: chat, chat-direct, conversations, messages
- Progreso usuario: checkin, goals, actions
- Operacion: health, ready, mock-chat
- Admin: login, logout, insights
- Integraciones: alerts

### 7.3 Contratos recomendados para documentar en detalle

Para cada endpoint documentar:

- Proposito
- Metodo y path
- Requisitos de autenticacion
- Request esperado
- Respuesta exitosa
- Errores comunes
- Ejemplos de uso

Fuente de referencia para estructura de API: [src/api/README.md](../src/api/README.md)

### 7.4 Contratos API operativos (version actual)

#### 7.4.1 Inicializacion de sesion

- Proposito: inicializar o recuperar identidad de usuario para sesiones anonimas o autenticadas del chat.
- Metodo y path: GET/POST /api/auth/bootstrap
- Autenticacion: no requiere login previo, pero crea o reutiliza sesion.
- Request esperado:
  - GET sin body.
  - POST sin body obligatorio.
- Respuesta exitosa (200):
  - ok: true
  - userId: string
  - source: origen de identidad resuelta
  - Cookie mw_session cuando aplica.
- Errores comunes:
  - 500 SESSION_BOOTSTRAP_FAILED
  - 500 SESSION_COOKIE_NOT_SET

Ejemplo de respuesta:

```json
{
  "ok": true,
  "userId": "usr_123",
  "source": "cookie"
}
```

#### 7.4.2 Validacion y emision de token de sesion

- Proposito: validar sesion vigente o emitir token de sesion para cliente.
- Metodo y path:
  - GET /api/auth/token
  - POST /api/auth/token
- Autenticacion:
  - GET valida token existente en header o cookie.
  - POST emite token via bootstrap de identidad.
- Request esperado:
  - GET sin body.
  - POST sin body obligatorio.
- Respuesta exitosa (200):
  - success: true
  - authenticated: true
  - userId: string
  - source: string
  - token: string
- Errores comunes:
  - 401 INVALID_SESSION_TOKEN
  - 500 TOKEN_VALIDATION_FAILED
  - 500 TOKEN_ISSUE_FAILED

Ejemplo de respuesta:

```json
{
  "success": true,
  "authenticated": true,
  "userId": "usr_123",
  "source": "header",
  "token": "session_token"
}
```

#### 7.4.3 Conversacion principal

- Proposito: procesar mensaje, detectar estado/intencion/riesgo, generar respuesta IA y persistir conversacion.
- Metodo y path: POST /api/chat
- Autenticacion: identidad por bearer, x-session-token o cookie mw_session.
- Request esperado:
  - message: string (requerido)
  - conversationId: string (opcional)
- Respuesta exitosa (200), modo normal:
  - success: true
  - response: string
  - state: estado detectado
  - conversationId: string
  - goal: objetivo activo serializado o null
  - action: sugerencia de accion
  - emotionalProfile: perfil emocional
  - searchUsed: boolean
  - fallback: boolean
  - flow: contexto de flujo conversacional
  - persistenceAvailable: boolean
- Respuesta exitosa (200), modo accion requerida:
  - type: action_required
  - message/response con instruccion de completar accion pendiente
- Respuesta exitosa (200), modo crisis:
  - type: crisis
  - crisis: true
  - continueChat: false
  - riskLevel y recursos de alerta
- Errores comunes:
  - 400 INVALID_BODY
  - 400 EMPTY_MESSAGE
  - 401 INVALID_SESSION_TOKEN
  - 429 rate limit excedido
  - 500 MISSING_OPENROUTER_API_KEY
  - 500 INTERNAL_ERROR

Ejemplo de request:

```json
{
  "message": "Estoy bloqueado y no se por donde empezar",
  "conversationId": "conv_abc"
}
```

#### 7.4.4 Registro de check-in diario

- Proposito: guardar check-in, recalcular estado y actualizar perfil emocional.
- Metodo y path: POST /api/checkin
- Autenticacion: sesion de usuario valida.
- Request esperado:
  - response: string (requerido)
- Respuesta exitosa (200):
  - ok: true
  - checkin: registro creado
  - state: estado detectado
  - emotionalProfile: perfil emocional actualizado
  - checkinsToday: numero de check-ins del dia
  - userId: string
- Errores comunes:
  - 400 response required
  - 401 INVALID_SESSION_TOKEN
  - 500 Error saving checkin

Ejemplo de request:

```json
{
  "response": "Hoy avance un poco y me siento mejor"
}
```

#### 7.4.5 Objetivos del usuario

- Proposito: consultar objetivo activo o crear objetivo con acciones.
- Metodos y path:
  - GET /api/goals
  - POST /api/goals
- Autenticacion: sesion de usuario valida.
- Request esperado:
  - GET sin body.
  - POST:
    - title: string (requerido)
    - actions: string[] (opcional)
- Respuesta exitosa (200):
  - success: true
  - goal: objeto serializado con progreso y acciones
- Errores comunes:
  - 400 title es requerido
  - 401 Token invalido o expirado
  - 500 No se pudo cargar o crear el objetivo

Ejemplo de request POST:

```json
{
  "title": "Retomar mi rutina",
  "actions": ["Caminar 20 minutos", "Escribir 3 prioridades"]
}
```

#### 7.4.6 Salud de proveedor IA

- Proposito: verificar disponibilidad minima de configuracion para integracion de IA.
- Metodo y path: GET /api/health
- Autenticacion: no requerida.
- Respuesta exitosa (200):
  - status: ok
  - openrouter: boolean
  - timestamp: ISO string
- Nota operativa: este endpoint devuelve 200 incluso en catch y sirve como pulso de servicio.

#### 7.4.7 Readiness de base de datos

- Proposito: validar conectividad real con base de datos antes de declarar servicio listo.
- Metodo y path: GET /api/ready
- Autenticacion: no requerida.
- Respuesta exitosa (200):
  - status: ok
  - database: connected
- Error comun:
  - 500 con status error y detalle de desconexion.

#### 7.4.8 Insights administrativos

- Proposito: calcular metricas, decisiones, alertas e historico para dashboard admin.
- Metodo y path: GET /api/admin/insights
- Autenticacion: requerida (cookie admin o basic auth valido).
- Respuesta exitosa (200):
  - metrics: retencion, dropOffPoint, checkinDrop, dominantState, confidence
  - decision: recomendacion priorizada
  - alerts: lista de alertas critical o warning
  - insights: lista accionable
  - crisis: resumen 24h y eventos recientes
  - avoidance: resumen 7 dias y acciones mas evitadas
  - decisionHistory e insightHistory
- Errores comunes:
  - 401 UNAUTHORIZED_ADMIN
  - 500 fallback de metricas y decision por falla interna

#### 7.4.9 Conversacion directa (sin pipeline completo)

- Proposito: responder de forma directa con IA usando deteccion de estado, sin pipeline avanzado de metas/crisis del endpoint principal.
- Metodo y path: POST /api/chat-direct
- Autenticacion: identidad por bearer, x-session-token o cookie mw_session.
- Request esperado:
  - message: string (requerido)
- Respuesta exitosa (200):
  - success: true
  - ok: true
  - reply: string
  - state: estado detectado
  - fallback: boolean
  - userId: string
  - timestamp: ISO string
- Errores comunes:
  - 400 INVALID_BODY
  - 400 EMPTY_INPUT
  - 401 INVALID_SESSION_TOKEN
  - 500 MISSING_OPENROUTER_API_KEY
  - 500 INTERNAL_ERROR

Ejemplo de request:

```json
{
  "message": "Necesito ayuda para enfocarme hoy"
}
```

#### 7.4.10 Conversaciones del usuario

- Proposito: listar conversaciones del usuario o crear una nueva conversacion.
- Metodos y path:
  - GET /api/conversations
  - POST /api/conversations
- Autenticacion: sesion de usuario valida.
- Request esperado:
  - GET sin body.
  - POST con body opcional:
    - title: string (opcional)
- Respuesta exitosa GET (200):
  - success: true
  - emotionalProfile: perfil emocional actual
  - conversations[]: id, title, createdAt, updatedAt, messageCount
- Respuesta exitosa POST (200):
  - success: true
  - conversation: id, title, createdAt, updatedAt
- Errores comunes:
  - 401 INVALID_SESSION_TOKEN
  - 500 No se pudieron cargar las conversaciones
  - 500 No se pudo crear la conversacion

Ejemplo de request POST:

```json
{
  "title": "Plan de enfoque semanal"
}
```

#### 7.4.11 Mensajes de una conversacion

- Proposito: listar mensajes de una conversacion concreta del usuario autenticado.
- Metodo y path: GET /api/messages?conversationId={id}
- Autenticacion: sesion de usuario valida.
- Request esperado:
  - Query param conversationId (requerido)
- Respuesta exitosa (200):
  - success: true
  - conversationId: string
  - messages[]: id, role, content, createdAt
- Errores comunes:
  - 400 MISSING_CONVERSATION_ID
  - 404 CONVERSATION_NOT_FOUND
  - 401 INVALID_SESSION_TOKEN
  - 500 No se pudieron cargar los mensajes

#### 7.4.12 Actualizacion de acciones de objetivo

- Proposito: marcar una accion como completada o pendiente dentro del objetivo activo del usuario.
- Metodo y path: PATCH /api/actions
- Autenticacion: sesion de usuario valida.
- Request esperado:
  - actionId: string (requerido)
  - completed: boolean (requerido)
- Respuesta exitosa (200):
  - success: true
  - goal: objetivo actualizado con progreso y acciones serializadas
- Errores comunes:
  - 400 actionId y completed son requeridos
  - 404 Accion no encontrada
  - 401 Token invalido o expirado
  - 500 No se pudo actualizar la accion

Ejemplo de request:

```json
{
  "actionId": "act_123",
  "completed": true
}
```

#### 7.4.13 Login administrativo

- Proposito: autenticar operador admin y emitir cookie de sesion administrativa.
- Metodos y path:
  - GET /api/admin/login
  - POST /api/admin/login
- Autenticacion:
  - GET valida estado actual de autenticacion admin.
  - POST requiere credenciales admin validas.
- Request esperado:
  - GET sin body.
  - POST:
    - username: string (requerido)
    - password: string (requerido)
    - next: string (opcional, normalizado a ruta admin segura)
- Respuesta exitosa GET (200):
  - authenticated: boolean
  - source: string
- Respuesta exitosa POST (200):
  - ok: true
  - next: string
  - Cookie de sesion admin emitida en la respuesta.
- Errores comunes:
  - 401 INVALID_ADMIN_CREDENTIALS
  - 500 ADMIN_LOGIN_FAILED

Ejemplo de request POST:

```json
{
  "username": "admin",
  "password": "***",
  "next": "/admin"
}
```

#### 7.4.14 Logout administrativo

- Proposito: cerrar sesion admin y limpiar cookie administrativa.
- Metodo y path: POST /api/admin/logout
- Autenticacion: requiere contexto admin, pero siempre intenta limpiar sesion.
- Request esperado:
  - POST sin body.
- Respuesta exitosa (200):
  - ok: true
  - Cookie admin invalidada/limpiada.

Ejemplo de respuesta:

```json
{
  "ok": true
}
```

#### 7.4.15 Alertas manuales e integraciones

- Proposito: disparar alertas operativas manuales hacia canales de notificacion (Telegram/Email).
- Metodo y path: POST /api/alerts
- Autenticacion: no obligatoria a nivel endpoint; se recomienda proteger por red/proxy en entornos productivos.
- Request esperado:
  - title: string (requerido)
  - message: string (requerido)
  - type: string (opcional, default info)
  - metric: string (opcional)
  - value: number (opcional)
- Respuesta exitosa (200):
  - ok: true
  - message: confirmacion de envio
- Errores comunes:
  - 400 title y message required
  - 500 Error sending alert

Ejemplo de request:

```json
{
  "type": "warning",
  "title": "Latency spike",
  "message": "Tiempo de respuesta elevado en /api/chat",
  "metric": "chat_latency_ms",
  "value": 1800
}
```

#### 7.4.16 Chat mock para testing y desarrollo

- Proposito: simular respuestas de mentor sin dependencia de base de datos ni proveedor IA externo.
- Metodo y path: POST /api/mock-chat
- Autenticacion: no requerida (endpoint orientado a pruebas internas).
- Request esperado:
  - message: string (opcional, recomendado para detectar estado)
  - userId: string (opcional, usado para logs de testing)
- Respuesta exitosa (200):
  - ok: true
  - reply: string (respuesta mock segun estado detectado)
  - state: estado detectado
  - mock: true
  - timestamp: ISO string
- Errores comunes:
  - 500 Error en mock

Ejemplo de request:

```json
{
  "message": "Me siento bloqueado y no avanzo",
  "userId": "usr_test"
}
```

Ejemplo de respuesta:

```json
{
  "ok": true,
  "reply": "Estás congelado. La parálisis es real...",
  "state": "bloqueo",
  "mock": true,
  "timestamp": "2026-03-30T18:00:00.000Z"
}
```

### 7.5 Prioridad de expansion documental

- Nivel 1: completado (chat-direct, conversations, messages, actions).
- Nivel 2: completado (admin/login, admin/logout, alerts).
- Nivel 3: completado (mock-chat para entorno de pruebas y soporte).

Estado global de expansion de catalogo API:

- Completado al 100% para los endpoints actualmente listados en seccion 7.1.

---

## 8) Modelo de datos y persistencia (4 paginas)

### 8.1 Entidades principales

- User
- Conversation
- Message
- UserState
- DailyCheckin
- Goal
- Action
- CrisisEvent
- AvoidanceEvent
- Insight
- DecisionLog
- DailyLog

Modelo completo: [prisma/schema.prisma](../prisma/schema.prisma)

### 8.2 Relacionamiento

- User 1:N Conversation
- Conversation 1:N Message
- User 1:1 UserState
- User 1:N Goal
- Goal 1:N Action
- User 1:N CrisisEvent
- User 1:N AvoidanceEvent

### 8.3 Diccionario de datos por entidad (campos clave)

#### User

- id: identificador unico (cuid).
- createdAt/updatedAt: auditoria de alta y cambios.
- lastSeen: ultima actividad conocida.
- Relaciones: conversaciones, mensajes, objetivos, crisis y evitacion.

#### Conversation

- id: identificador unico de conversacion.
- userId: referencia opcional a User (onDelete SetNull).
- title: titulo visible en sidebar (default Nueva conversación).
- messages: snapshot JSON legacy.
- messageRecords: fuente canonica de mensajes normalizados.

#### Message

- id: identificador unico de mensaje.
- conversationId: FK obligatoria a Conversation (onDelete Cascade).
- userId: FK opcional a User (onDelete SetNull).
- role: user o assistant.
- content: texto de mensaje.
- createdAt: timestamp para orden de timeline.

#### UserState

- userId: identificador unico por usuario (1:1).
- state: estado conversacional principal (neutral, duda, bloqueo, ansiedad, claridad).
- primaryEmotion/dominantPattern/focusArea/energyLevel: perfil emocional acumulado.
- riskLevel/progressTrend: señales de riesgo y evolucion.
- crisisActive/crisisActivatedAt/crisisActiveUntil: ventana de crisis activa.

#### DailyCheckin

- userId: referencia logica a usuario.
- response: texto de check-in.
- mood: clasificacion simplificada de tono.
- createdAt: fecha/hora de registro.

#### Goal

- userId: propietario de objetivo.
- title: objetivo en lenguaje natural.
- status: activo/completado/cancelado (default active).
- createdAt/updatedAt: seguimiento de ciclo de vida.

#### Action

- goalId: FK a Goal (onDelete Cascade).
- description: accion concreta.
- completed: estado de ejecucion.
- createdAt: fecha de alta.

#### AvoidanceEvent

- userId: usuario que evita/rechaza/postpone.
- actionId: accion asociada.
- type: tipo de evento (postpone, refuse, avoidance).
- createdAt: fecha de evento.

#### CrisisEvent

- userId: usuario afectado.
- level: severidad (high, critical).
- message: trigger detectado.
- response: respuesta de contencion emitida.
- createdAt: timestamp del incidente.

#### Insight

- type/title/content/action: insight accionable para admin.
- confidence/priority: calidad y urgencia.
- createdAt: snapshot temporal de insight.

#### DecisionLog

- metric/value/decision: trazabilidad del motor de decisiones.
- createdAt: momento de recomendacion.

#### DailyLog

- userId: agregacion diaria por usuario.
- checkIns/messagesCount: contadores de actividad diaria.
- createdAt: fecha del agregado.

### 8.4 Reglas de integridad y ciclo de vida

- Conversation -> Message usa onDelete Cascade: borrar conversacion elimina su timeline.
- Goal -> Action usa onDelete Cascade: borrar objetivo elimina acciones asociadas.
- Action -> AvoidanceEvent usa onDelete Cascade: evita huerfanos de evitacion.
- User -> CrisisEvent/AvoidanceEvent/Goal usa onDelete Cascade para preservar consistencia por usuario.
- User en Conversation/Message usa onDelete SetNull para conservar historico conversacional aunque cambie identidad.
- UserState tiene userId unico para garantizar una sola fotografia de estado por usuario.

### 8.5 Estrategia de indices y consultas

- Conversaciones: indice userId + updatedAt para listado reciente por usuario.
- Mensajes: indices por conversationId+createdAt y userId+createdAt para timeline y analitica.
- UserState: indices por state/updatedAt y crisisActive/crisisActiveUntil para monitoreo de riesgo.
- Goal/Action: indices por userId/status y goalId/createdAt para progreso activo.
- Eventos: indices por userId/createdAt, actionId/type/createdAt y level/createdAt para alerting.
- DecisionLog: indice metric/createdAt para historico de cambios de decision.

### 8.6 Consideraciones de persistencia

- Modelo hibrido en conversaciones: campo messages (JSON) y tabla Message normalizada.
- Recomendacion: mantener Message como fuente primaria para consultas y reportes.
- Mantener convencion ISO en serializacion API para createdAt/updatedAt.

### 8.7 Migraciones

Directorio de migraciones: [prisma/migrations](../prisma/migrations)

---

## 9) Seguridad y autenticacion (4 paginas)

### 9.1 Autenticacion usuario

- Token de sesion firmado con HMAC
- Cookie de sesion mw_session
- Resolucion de identidad por header/cookie
- TTL de sesion: 24h con refresco de token expirado cuando aplica
- Cookie: httpOnly + sameSite lax + secure en produccion

Implementacion: [src/lib/auth.ts](../src/lib/auth.ts)

### 9.2 Autenticacion admin

- Credenciales admin por variables de entorno
- Cookie admin separada mw_admin_session
- Basic auth como alternativa
- Token admin firmado con HMAC y expiracion de 24h
- Fallback de credenciales solo en desarrollo

Implementacion: [src/lib/admin-auth.ts](../src/lib/admin-auth.ts)

### 9.3 Proteccion de rutas admin

- Proxy de proteccion para /admin y /api/admin
- Permite /admin/login y rutas de login/logout; protege el resto
- Responde 401 JSON en API admin y redirect a login en UI admin

Implementacion: [src/proxy.ts](../src/proxy.ts)

### 9.4 Matriz de controles por endpoint critico

| Endpoint            | AuthN                                | AuthZ                                     | Rate limit      | Headers seguridad             | Riesgo residual                                |
| ------------------- | ------------------------------------ | ----------------------------------------- | --------------- | ----------------------------- | ---------------------------------------------- |
| /api/chat           | Token usuario (cookie/header/bearer) | Scope usuario por userId resuelto         | Si (en memoria) | Si (next.config para /api/\*) | Rate limit no distribuido                      |
| /api/chat-direct    | Token usuario                        | Scope usuario basico                      | No explicito    | Si                            | Menor proteccion anti abuso                    |
| /api/checkin        | Token usuario                        | Scope usuario por userId                  | No explicito    | Si                            | Posible abuso por falta de throttling dedicado |
| /api/goals          | Token usuario                        | Scope usuario por userId                  | No explicito    | Si                            | Requiere monitoreo de abuso                    |
| /api/actions        | Token usuario                        | Scope usuario por userId                  | No explicito    | Si                            | Sin limite explicito                           |
| /api/conversations  | Token usuario                        | Scope usuario por userId                  | No explicito    | Si                            | Sin limite explicito                           |
| /api/messages       | Token usuario                        | Scope usuario + ownership de conversacion | No explicito    | Si                            | Enumeracion mitigada por ownership check       |
| /api/admin/insights | Cookie admin o Basic                 | Proxy + verificacion admin                | No explicito    | Si                            | Reforzar auditoria y throttling admin          |
| /api/admin/login    | Credenciales admin                   | Normalizacion de next path                | No explicito    | Si                            | Riesgo brute force sin bloqueo nativo          |
| /api/admin/logout   | Sesion admin                         | Limpieza de cookie                        | No aplica       | Si                            | Bajo                                           |
| /api/alerts         | No obligatoria                       | No aplicable hoy                          | No explicito    | Si                            | Exposicion si endpoint queda publico           |
| /api/health         | No requerida                         | No aplicable                              | No              | Si                            | Divulga estado de proveedor via boolean        |
| /api/ready          | No requerida                         | No aplicable                              | No              | Si                            | Puede exponer error de DB en payload           |

### 9.5 Controles complementarios

- Rate limit por clave de usuario
- Headers de seguridad para API

Implementaciones:

- [src/lib/rate-limit.ts](../src/lib/rate-limit.ts)
- [next.config.ts](../next.config.ts)

### 9.6 Plan de hardening por sprint (ejecutable)

| Sprint   | Objetivo                                      | Alcance tecnico                                                                                                         | Prioridad | Esfuerzo estimado | Owner sugerido | Criterio de salida                                                                |
| -------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------- | ----------------- | -------------- | --------------------------------------------------------------------------------- |
| Sprint 1 | Mitigar abuso inmediato                       | Throttling + lockout progresivo en /api/admin/login y limites dedicados para /api/chat-direct, /api/checkin, /api/goals | Critica   | M                 | Backend        | Pruebas de brute force y abuso en verde, sin regresion de login legitimo          |
| Sprint 2 | Endurecer superficie expuesta                 | Proteger /api/alerts con auth interna o firma HMAC y restringir acceso por red donde aplique                            | Critica   | M                 | Backend/DevOps | Endpoint rechaza requests no firmados/no autorizados y mantiene alertas legitimas |
| Sprint 3 | Escalar control de trafico                    | Migrar rate limit en memoria a store distribuido (Redis o equivalente) para despliegue multi instancia                  | Alta      | L                 | Backend/Infra  | Limites consistentes entre replicas, sin falsos positivos altos                   |
| Sprint 4 | Reducir riesgo de inyeccion y contratos rotos | Estandarizar validacion de payload con esquema (zod/valibot) en endpoints de escritura                                  | Alta      | M                 | Backend        | Requests invalidos bloqueados con 400 consistente y tests de validacion cubiertos |
| Sprint 5 | Minimizar fuga de informacion                 | Sanitizar respuesta de /api/ready y errores internos en produccion                                                      | Media     | S                 | Backend        | Sin leakage de detalles internos en respuestas publicas                           |

### 9.7 Riesgo residual post plan

- Dependencia de proveedor IA externo (disponibilidad y latencia).
- Riesgo operativo por configuracion de secretos en entorno.
- Necesidad de auditoria continua de permisos admin y rutas nuevas.

### 9.8 Checklist operativo semanal (Semana 1-5)

#### Semana 1 (Sprint 1)

- Objetivo: mitigar abuso inmediato (admin login + endpoints de escritura).
- Checklist de implementacion:
  - Definir umbrales de lockout y cooldown para /api/admin/login.
  - Agregar throttling dedicado en /api/chat-direct, /api/checkin y /api/goals.
  - Revisar que respuestas de bloqueo sean consistentes (401/429 segun caso).
- Comandos sugeridos de validacion:

```bash
npm run lint
npm run test
npm run system-check
```

#### Semana 2 (Sprint 2)

- Objetivo: endurecer /api/alerts.
- Checklist de implementacion:
  - Implementar auth interna o firma HMAC para /api/alerts.
  - Restringir invocacion por red/proxy donde aplique.
  - Verificar que alertas legitimas siguen entregandose.
- Comandos sugeridos de validacion:

```bash
npm run lint
npm run test
curl -i -X POST http://localhost:3000/api/alerts -H 'content-type: application/json' -d '{"title":"test","message":"test"}'
```

#### Semana 3 (Sprint 3)

- Objetivo: migrar rate limit a almacenamiento distribuido.
- Checklist de implementacion:
  - Integrar store distribuido (ej. Redis) en modulo de rate limiting.
  - Validar consistencia de limites entre replicas.
  - Definir fallback seguro ante caida del store.
- Comandos sugeridos de validacion:

```bash
npm run lint
npm run test
npm run build
```

#### Semana 4 (Sprint 4)

- Objetivo: estandarizar validacion de payloads.
- Checklist de implementacion:
  - Introducir esquemas en endpoints POST/PATCH prioritarios.
  - Unificar formato de errores 400 por validacion.
  - Cubrir casos invalidos en pruebas de integracion.
- Comandos sugeridos de validacion:

```bash
npm run lint
npm run test
npm run test:coverage
```

#### Semana 5 (Sprint 5)

- Objetivo: minimizar fuga de informacion en errores.
- Checklist de implementacion:
  - Sanitizar payload de /api/ready en modo produccion.
  - Revisar manejo de errores internos sensibles en APIs criticas.
  - Verificar observabilidad sin exponer detalles al cliente.
- Comandos sugeridos de validacion:

```bash
npm run lint
npm run test
npm run build
```

### 9.9 Tablero de ejecucion semanal (operativo)

Escala de estado:

- pendiente
- en_curso
- hecho
- bloqueado

| Semana   | Sprint   | Owner          | Estado    | Fecha inicio | Fecha fin objetivo | Bloqueador actual | Evidencia                       | Ultima actualizacion     |
| -------- | -------- | -------------- | --------- | ------------ | ------------------ | ----------------- | ------------------------------- | ------------------------ |
| Semana 1 | Sprint 1 | Backend        | en_curso  | 2026-03-30   | 2026-04-05         | -                 | auto(lint:ok,test:ok) local-run | 2026-03-30T17:57:20.623Z |
| Semana 2 | Sprint 2 | Backend/DevOps | pendiente | -            | -                  | -                 | -                               | -                        |
| Semana 3 | Sprint 3 | Backend/Infra  | pendiente | -            | -                  | -                 | -                               | -                        |
| Semana 4 | Sprint 4 | Backend        | pendiente | -            | -                  | -                 | -                               | -                        |
| Semana 5 | Sprint 5 | Backend        | pendiente | -            | -                  | -                 | -                               | -                        |

Reglas de uso del tablero:

- Actualizar estado al menos una vez por dia habil.
- Registrar bloqueadores el mismo dia en que aparezcan.
- Enlazar evidencia tecnica (PR, test report, logs) al cierre de cada semana.
- No marcar hecho sin cumplir criterio de salida del sprint correspondiente.

### 9.10 Automatizacion del tablero (modo solo)

Componentes:

- Script: scripts/auto-update-hardening-board.mjs
- Comando local: npm run hardening:auto
- Workflow programado: .github/workflows/hardening-board-auto-update.yml

Comportamiento:

- Calcula semana activa segun plan (Semana 1 a Semana 5).
- Ejecuta validaciones de la semana y actualiza la fila correspondiente en 9.9.
- Marca estado en_curso cuando pasa validaciones, o bloqueado cuando alguna falla.
- Registra evidencia automatica de comandos y run URL de GitHub Actions cuando aplica.
- Si el estado queda bloqueado en GitHub Actions, crea issue de escalamiento automaticamente.
- Si el estado deja de ser bloqueado, cierra automaticamente la issue abierta de esa semana.

Nota operativa:

- Si se requiere marcar estado hecho automaticamente al cierre, ejecutar con AUTO_HARDENING_MARK_DONE=true.

---

## 10) Motor IA y logica conversacional (4 paginas)

### 10.1 Pipeline de inteligencia

- Deteccion de intencion
- Deteccion de estado
- Analisis emocional acumulado
- Evaluacion de riesgo
- Flujo de dialogo
- Prompt coaching
- Respuesta IA o fallback

Servicios clave:

- [src/services/intent.ts](../src/services/intent.ts)
- [src/services/state.ts](../src/services/state.ts)
- [src/services/emotional-model.ts](../src/services/emotional-model.ts)
- [src/services/risk.ts](../src/services/risk.ts)
- [src/services/flows.ts](../src/services/flows.ts)
- [src/services/coach.ts](../src/services/coach.ts)
- [src/services/ai.ts](../src/services/ai.ts)

### 10.2 Integracion con OpenRouter

- Modelo por defecto: openai/gpt-4o-mini
- Timeout y manejo de errores
- Fallback controlado

### 10.3 Casos especiales

- Crisis alta y critica con escalado
- Senales de evitacion para acciones pendientes
- Contexto externo opcional via busqueda web

---

## 11) Analitica e insights admin (3 paginas)

### 11.1 Metricas clave

- Retencion D3 y D7
- Checkin drop
- Estado dominante
- Segmentacion usuarios activos/nuevos/inactivos
- Crisis y evitacion

### 11.2 Decision engine

- Reglas de decision por umbrales
- Priorizacion de acciones

Servicios:

- [src/services/decision.ts](../src/services/decision.ts)
- [src/services/insights.ts](../src/services/insights.ts)

### 11.3 Persistencia y historico

- Guardado de insight snapshots
- Guardado de decision logs

Endpoint: [src/app/api/admin/insights/route.ts](../src/app/api/admin/insights/route.ts)

---

## 12) DevOps y despliegue (4 paginas)

### 12.1 Empaquetado

- Docker multi-stage
- Dependencias de build y runtime separadas
- Healthcheck interno

Archivo: [Dockerfile](../Dockerfile)

### 12.2 Entornos y variables

Variables criticas:

- OPENROUTER_API_KEY
- DATABASE_URL
- AUTH_TOKEN_SECRET
- ADMIN_USERNAME
- ADMIN_PASSWORD

Fuente: [README.md](../README.md), [src/lib/env.ts](../src/lib/env.ts)

### 12.3 Deploy con Coolify

- Config de servicio docker
- Health checks
- Verificacion post deploy

Guias:

- [COOLIFY_DEPLOY_STEPS.md](../COOLIFY_DEPLOY_STEPS.md)
- [COOLIFY_QUICK_REF.md](../COOLIFY_QUICK_REF.md)

### 12.4 Auto deploy por webhook

Workflow: [.github/workflows/coolify-auto-deploy.yml](../.github/workflows/coolify-auto-deploy.yml)

---

## 13) Operacion, monitoreo y alertas (3 paginas)

### 13.1 Salud del sistema

- Health endpoint para dependencia IA
- Ready endpoint para conectividad DB

Endpoints:

- [src/app/api/health/route.ts](../src/app/api/health/route.ts)
- [src/app/api/ready/route.ts](../src/app/api/ready/route.ts)

### 13.2 Logging

- Logs por tags CHAT, AI, STATE, RISK, AUTH, ERROR

Implementacion: [src/lib/logger.ts](../src/lib/logger.ts)

### 13.3 Alerting

- Telegram y Email
- Cooldown y deduplicacion
- Alertas por crisis y evitacion

Implementacion: [src/lib/alerts.ts](../src/lib/alerts.ts)

### 13.4 Scripts operativos automatizados

Tres scripts complementan la operacion diaria del sistema: backup automatizado, validacion de integraciones externas y mantenimiento de documentacion operativa.

#### 13.4.1 Backup PostgreSQL diario

**Script:** [scripts/db-backup-daily.sh](../scripts/db-backup-daily.sh)

**Proposito:** Generar copias de seguridad comprimidas de la base de datos PostgreSQL con retencion configurable.

**Características:**

- Compresion gzip-9 (máxima)
- Checksum SHA256 automatico
- Retencion configurable (default 14 días)
- Symlink a último backup para recuperación rápida
- Validacion fail-fast de prerequisitos

**Requisitos:**

- DATABASE_URL configurada
- Binarios: pg_dump, gzip, find, ln

**Uso manual:**

```bash
npm run backup:daily
# Salida: ./backups/db/mentor_web_YYYY-MM-DD_HHMMSS.sql.gz
```

**Uso con cron (produccion):**

```bash
# Crontab entry (ejecuta diario 02:30 UTC)
30 2 * * * cd /ruta/mentor-web && BACKUP_RETENTION_DAYS=14 npm run backup:daily >> logs/db-backup.log 2>&1
```

**Restaura:**

```bash
# Último backup
npm run backup:restore:latest

# Backup específico
gunzip -c ./backups/db/mentor_web_YYYY-MM-DD_HHMMSS.sql.gz | psql "$DATABASE_URL"
```

**Monitoreo:**

```bash
# Verificar logs de backup
tail -50 logs/db-backup.log

# Chequear tamaño de backups
du -sh ./backups/db/

# Validar integridad SHA256
sha256sum -c ./backups/db/*.sha256
```

Documentacion detallada: [docs/daily-backup.md](../docs/daily-backup.md)

#### 13.4.2 Test de conectividad Telegram

**Script:** [scripts/test-telegram-send.mjs](../scripts/test-telegram-send.mjs)

**Proposito:** Validar conectividad con bot Telegram y enviar mensaje de prueba en tiempo real.

**Características:**

- Deteccion automatica de chat_id (fallback en cascada)
- Manejo de errores con response validation
- Soporta multiples formas de identificar destino

**Requisitos:**

- TELEGRAM_BOT_TOKEN configurado
- Al menos una de: ADMIN_TELEGRAM_ID, TELEGRAM_CHAT_ID, o getUpdates fallback

**Uso:**

```bash
npm run test:telegram
# Output: "TELEGRAM_SEND_OK" o error detallado
```

**Cascada de resolución de chat_id:**

1. ADMIN_TELEGRAM_ID (variable de entorno)
2. TELEGRAM_CHAT_ID (variable de entorno)
3. Llamada a getUpdates API (si ambas anteriores no existen)

**Integracion en monitoreo:**

```bash
# Validar bot cada hora
0 * * * * npm run test:telegram >> logs/telegram-health.log 2>&1
```

#### 13.4.3 Generador automático de documentacion de comandos

**Script:** [scripts/auto-update-commands-doc.mjs](../scripts/auto-update-commands-doc.mjs)

**Proposito:** Mantener `docs/comandos-operativos.md` actualizado de forma idempotente durante desarrollo y CI/CD.

**Características:**

- Lee 23 comandos npm desde package.json
- Agrega 15 comandos operativos (Prisma, curl, docker, git)
- Genera tablas markdown linter-compliant
- **Idempotente:** solo reescribe si detecta cambios
- Modo check: exit code 1 si documentacion está desactualizada

**Comandos:**

```bash
# Regenerar si hay cambios
npm run docs:commands:update
# Output: "commands-doc: updated" o "commands-doc: no changes"

# Verificar sin escribir (para CI/CD)
npm run docs:commands:check
# Exit code: 0 si actual, 1 si stale
```

**Uso en CI/CD:**

```bash
# Pre-commit hook (validar antes de commit)
npm run docs:commands:check || exit 1

# Post-merge workflow (regenerar después de merge)
npm run docs:commands:update && git add docs/comandos-operativos.md
```

**Salida generada:** [docs/comandos-operativos.md](../docs/comandos-operativos.md)

Contiene:

- 23 comandos npm con descripciones detalladas
- 15 comandos operativos (Prisma, curl, docker, git)
- 4 variables clave de configuracion

---

## 14) QA, testing y liberacion (2 paginas)

### 14.1 Framework y ejecucion

- Jest con configuracion Next
- Scripts de test y coverage

Referencias:

- [jest.config.mjs](../jest.config.mjs)
- [package.json](../package.json)

### 14.2 Cobertura actual por dominio

- Servicios IA, riesgo, objetivos, busqueda, estado
- Endpoints de chat, auth, conversations, checkin, health, ready

Ejemplos:

- [src/services/ai.test.ts](../src/services/ai.test.ts)
- [src/services/risk.test.ts](../src/services/risk.test.ts)
- [src/app/api/chat/route.test.ts](../src/app/api/chat/route.test.ts)
- [src/app/api/auth/token/route.test.ts](../src/app/api/auth/token/route.test.ts)

### 14.3 Criterios de salida recomendados

- Build exitoso
- Test suite verde
- Endpoints health y ready correctos
- Flujo de chat funcional en entorno objetivo

### 14.4 Matriz de pruebas de seguridad (alineada a 9.4)

| Area                   | Endpoint                            | Caso de prueba                                             | Tipo de prueba | Resultado esperado                           |
| ---------------------- | ----------------------------------- | ---------------------------------------------------------- | -------------- | -------------------------------------------- |
| Auth usuario           | /api/chat, /api/checkin, /api/goals | Request sin token/cookie                                   | Integracion    | 401 y cookie invalida limpiada cuando aplica |
| Auth admin             | /api/admin/insights                 | Acceso sin sesion admin                                    | Integracion    | 401 UNAUTHORIZED_ADMIN                       |
| Login admin            | /api/admin/login                    | Credenciales invalidas repetidas                           | Integracion    | 401 consistente, sin bypass                  |
| Ownership conversacion | /api/messages                       | Usuario A consulta conversationId de usuario B             | Integracion    | 404 o denegacion sin fuga de datos           |
| Input validation       | Endpoints POST/PATCH criticos       | Payload incompleto o tipo invalido                         | Integracion    | 400 con error controlado                     |
| Rate limit chat        | /api/chat                           | Rafaga > limite por ventana                                | Integracion    | 429 con Retry-After y headers de limite      |
| Endpoint expuesto      | /api/alerts                         | Request sin control esperado (cuando se aplique hardening) | Integracion    | 401/403 segun politica                       |
| Error leakage          | /api/ready                          | Falla de DB en produccion                                  | Integracion    | Mensaje sanitizado sin detalle sensible      |

### 14.5 Gate de seguridad para merge/release

- No hay hallazgos criticos abiertos en auth, authz o fuga de datos.
- Casos minimos de matriz 14.4 ejecutados y en verde en cambios que toquen API.
- Endpoints admin validan autenticacion en todos los paths protegidos.
- Alertas y readiness cumplen politica de exposicion de informacion.

### 14.6 Evidencia minima por semana (seguimiento)

| Semana   | Evidencia minima requerida                                         | Aceptacion                                       |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| Semana 1 | Diff de throttling/lockout + resultados de pruebas de abuso        | Sin bypass y sin regresion funcional             |
| Semana 2 | Evidencia de bloqueo de requests no autorizados en /api/alerts     | Endpoint protegido y alertas validas funcionando |
| Semana 3 | Prueba de limites consistentes en entorno multi instancia          | Sin divergencias criticas entre replicas         |
| Semana 4 | Reporte de cobertura de validacion de payloads y errores 400       | Contratos de entrada consistentes                |
| Semana 5 | Evidencia de respuesta sanitizada en /api/ready y errores internos | Sin leakage de detalles sensibles                |

### 14.7 Plantilla de cierre semanal (go/no-go)

Usar esta plantilla al final de cada semana del plan de hardening:

- Semana/Sprint:
- Estado final: hecho | parcial | bloqueado
- Criterio de salida cumplido: si | no
- Evidencias adjuntas:
- Riesgos residuales detectados:
- Decision de avance: go | no-go
- Accion correctiva para siguiente semana:

---

## 15) Riesgos, deuda tecnica y roadmap (1 pagina)

### 15.1 Riesgos actuales

- Rate limit en memoria no distribuido
- Dependencia de proveedor externo IA
- Faltan politicas legales completas en repo para publicacion

### 15.2 Deuda tecnica prioritaria

- Persistencia distribuida para rate limiting
- Endurecimiento de auditoria de seguridad continua
- Playbooks de incidentes mas formales

### 15.3 Roadmap inmediato

- Mejoras de retencion y onboarding
- Mayor trazabilidad de acciones y resultados
- Automatizacion de reportes admin

Apoyo documental: [DECISION_ENGINE.md](../DECISION_ENGINE.md)

---

## 16) Anexos operativos (1 pagina)

### 16.1 Checklist pre lanzamiento

- Variables de entorno completas (DATABASE_URL, OPENROUTER_API_KEY, TELEGRAM_BOT_TOKEN, etc.)
- Migraciones aplicadas (`npx prisma migrate deploy`)
- Healthcheck estable (`curl https://dominio/api/health`)
- Pruebas criticas ejecutadas (`npm test`)
- Credenciales admin seguras y cambiadas post-deploy
- Test Telegram OK (`npm run test:telegram`)
- Backup configurado en cron server

### 16.2 Checklist post despliegue

- Verificar `/api/health` (status ok, openrouter boolean)
- Verificar `/api/ready` (database connected)
- Probar login admin (credenciales nuevas funciona)
- Probar chat extremo a extremo (mensaje → respuesta IA)
- Revisar logs y alertas (`tail -100 logs/`)
- Ejecutar primer backup manual (`npm run backup:daily`)
- Validar symlink a latest (`ls -la ./backups/db/latest.sql.gz`)
- Revisar documentacion de comandos actualizada (`docs/comandos-operativos.md`)

### 16.3 Scripts operativos disponibles

**Backup diario:**

```bash
# Ejecucion manual
npm run backup:daily

# Restaurar último
npm run backup:restore:latest

# Restaurar específico
gunzip -c ./backups/db/mentor_web_YYYY-MM-DD_HHMMSS.sql.gz | psql "$DATABASE_URL"
```

Documentacion: [docs/daily-backup.md](../docs/daily-backup.md)

**Test Telegram:**

```bash
npm run test:telegram
```

Detecta automáticamente chat_id por: ADMIN_TELEGRAM_ID → TELEGRAM_CHAT_ID → getUpdates fallback

**Generar comando docs:**

```bash
# Regenerar si cambios en package.json
npm run docs:commands:update

# Verificar si docs actual (para CI)
npm run docs:commands:check
```

Referencia: [docs/comandos-operativos.md](../docs/comandos-operativos.md)

**Verificar sistema:**

```bash
npm run system-check
```

### 16.4 Glosario rapido

- D3: retencion al dia 3
- D7: retencion al dia 7
- Checkin drop: caida relativa de cumplimiento de check-ins
- Fallback IA: respuesta segura cuando proveedor falla
- Idempotente: operacion que al ejecutarse multiples veces produce mismo resultado
- Symlink: enlace simbolico (máximo 14 dias, latest.sql.gz para recuperación rápida)
- Rate limit: límite de requests por ventana de tiempo y usuario
- Crisis active: ventana {crisisActivatedAt, crisisActiveUntil} cuando usuario en riesgo alto

### 16.5 Archivos de referencia operativa

Principales ubicaciones para troubleshooting:

- Logs aplicacion: `logs/` (db-backup.log, errors, etc.)
- Backups: `./backups/db/` (máximo 14 dias)
- Documentacion: `docs/` (daily-backup.md, comandos-operativos.md)
- Variables críticas: `.env` (DATABASE_URL, TELEGRAM_BOT_TOKEN, AUTH_TOKEN_SECRET)
- Scripts: `scripts/` (db-backup-daily.sh, test-telegram-send.mjs, auto-update-commands-doc.mjs)
- Configuracion app: `next.config.ts`, `prisma/schema.prisma`, `package.json`

---

## Material adicional para completar publicacion externa

Para convertir este manual tecnico en manual SaaS comercial completo, agregar:

- Politica de privacidad y tratamiento de datos
- Terminos de servicio
- Modelo de precios y facturacion
- SLA y soporte formal
- Matriz RACI y contactos de escalado

## Nota de uso

Este documento esta diseñado como base editable. Se recomienda convertir cada seccion en capitulo final con ejemplos reales de payloads, capturas de interfaz y procedimientos operativos internos.
