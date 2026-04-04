# Auditoría del Sistema — Luciérnaga AI

> Generada el 2026-03-31. Revisión manual requerida antes de actuar sobre hallazgos de seguridad.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Stack y arquitectura](#2-stack-y-arquitectura)
3. [Auditoría de seguridad](#3-auditoría-de-seguridad)
4. [Auditoría de base de datos](#4-auditoría-de-base-de-datos)
5. [Auditoría de APIs](#5-auditoría-de-apis)
6. [Auditoría de testing](#6-auditoría-de-testing)
7. [Auditoría de rendimiento](#7-auditoría-de-rendimiento)
8. [Auditoría de experiencia de usuario](#8-auditoría-de-experiencia-de-usuario)
9. [Auditoría de código](#9-auditoría-de-código)
10. [Matriz de riesgos](#10-matriz-de-riesgos)
11. [Plan de acción priorizado](#11-plan-de-acción-priorizado)

---

## 1. Resumen ejecutivo

| Categoría         | Estado   | Hallazgos críticos | Hallazgos altos | Hallazgos medios | Hallazgos bajos |
|-------------------|----------|-------------------|-----------------|------------------|-----------------|
| Seguridad         | ⚠️ Alerta | 0                 | 3               | 4                | 2               |
| Base de datos     | ✅ OK     | 0                 | 0               | 2                | 2               |
| APIs              | ⚠️ Alerta | 0                 | 1               | 3                | 3               |
| Testing           | ❌ Débil  | 0                 | 3               | 2                | 1               |
| Rendimiento       | ⚠️ Alerta | 0                 | 0               | 3                | 2               |
| UX / Usuario      | ✅ OK     | 0                 | 0               | 3                | 4               |
| Código            | ✅ OK     | 0                 | 0               | 2                | 3               |

**Prioridad inmediata:** Testing (sin E2E, sin tests de integración real), Seguridad (headers HTTP, CORS).

---

## 2. Stack y arquitectura

```
Next.js 16.2.1 (App Router)
React 19.2.4
TypeScript 5 (strict)
Prisma 7.6.0 → PostgreSQL
OpenRouter API (gpt-4o-mini)
Tailwind CSS 4 + Shadcn/Radix UI
Jest 30.3.0 (unit tests)
Docker + Coolify (producción)
Telegram Bot (webhook)
```

### Diagrama de capas

```
┌─────────────────────────────────────────────────────┐
│  Pages / Routes (app/)                              │
│  ├── (public)/  — landing, explore, contact         │
│  ├── app/       — chat principal (protegido)         │
│  ├── admin/     — panel admin (auth admin)           │
│  ├── impulso/   — modo gamificación                  │
│  └── api/       — 45 endpoints REST                 │
├─────────────────────────────────────────────────────┤
│  Components (components/)                           │
│  ├── ui/       — Shadcn primitives                  │
│  ├── home/     — landing sections                   │
│  ├── explore/  — visualización interactiva           │
│  └── layout/   — AppLayout, Sidebar, RightPanel     │
├─────────────────────────────────────────────────────┤
│  Services (services/)   ← lógica de negocio         │
│  ├── ai.ts, coach.ts, risk.ts, goals.ts...          │
│  └── 30+ servicios puros y testeables               │
├─────────────────────────────────────────────────────┤
│  Domain (domain/)       ← modelos de dominio        │
│  ├── userStateEngine.ts — máquina de estados        │
│  └── decisionEngine.ts  — motor de decisiones       │
├─────────────────────────────────────────────────────┤
│  Lib (lib/)             ← utilidades transversales  │
│  ├── auth.ts            — sesiones HMAC-SHA256      │
│  ├── prisma.ts          — cliente singleton         │
│  └── rate-limit.ts      — throttling por usuario    │
├─────────────────────────────────────────────────────┤
│  Database               ← PostgreSQL vía Prisma     │
│  └── 18 modelos, indexes estratégicos               │
└─────────────────────────────────────────────────────┘
```

### Fortalezas arquitectónicas

- Separación clara: Pages → Services → Domain → DB
- Servicios como funciones puras (fácil testeo)
- TypeScript strict en todo el stack
- SSE streaming para respuestas AI
- Singleton de Prisma con pooling de conexiones
- Máquina de estados emocionales bien modelada

---

## 3. Auditoría de seguridad

### 3.1 Autenticación de usuarios

**Implementación:** `src/lib/auth.ts`

| Aspecto                    | Estado | Nota |
|----------------------------|--------|------|
| HMAC-SHA256 tokens          | ✅     | Bien implementado |
| HttpOnly cookies           | ✅     | `mw_session` |
| SameSite=Lax               | ✅     | Correcto |
| Secure en producción       | ✅     | Condicional en `NODE_ENV` |
| Timing-safe comparison     | ✅     | `timingSafeEqual` de crypto |
| TTL de 24h                 | ✅     | `SESSION_TTL_SECONDS = 86400` |
| Rotación automática        | ✅     | On expiry refresh |
| Token en múltiples vectores | ⚠️   | Bearer + X-Session-Token + cookie (superficie de ataque amplia) |

**[ALTO] Hallazgo S-01: Sin Content-Security-Policy**

No hay CSP headers configurados en `next.config.ts`. Sin CSP, un XSS exitoso puede exfiltrar tokens de sesión o ejecutar código arbitrario.

```ts
// next.config.ts — FALTA esto:
headers: async () => [{
  source: '/(.*)',
  headers: [
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'..." },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ]
}]
```

**[ALTO] Hallazgo S-02: Sin configuración CORS explícita**

Las rutas API no definen CORS. Next.js aplica same-origin por defecto, pero sin cabeceras explícitas no hay protección ante cambios de configuración futuros o subdominios.

**[ALTO] Hallazgo S-03: MVP_STATIC_IDENTITY en producción**

```ts
// src/lib/auth.ts:43
const MVP_STATIC_IDENTITY_ENABLED = process.env.MVP_STATIC_IDENTITY === "true";
```

Si `MVP_STATIC_IDENTITY=true` se cuela en producción (error humano en `.env`), todos los usuarios comparten `demo-user` — exposición total de datos. El guard `process.env.NODE_ENV !== "production"` en línea 234 existe, pero depende de que NODE_ENV esté correctamente configurado.

**[MEDIO] Hallazgo S-04: Admin sin rate limiting ni account lockout**

`/api/admin/login` no tiene rate limiting visible. Un atacante puede hacer brute force sobre credenciales admin.

**[MEDIO] Hallazgo S-05: safeEqual con cortocircuito por longitud**

```ts
// src/lib/auth.ts:104
function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;  // ← cortocircuito temporal visible
  return timingSafeEqual(a, b);
}
```

HMAC-SHA256 siempre produce outputs de igual longitud, por lo que en la práctica no es explotable. Sin embargo, para uso general esta función es insegura. Documentar la limitación.

**[MEDIO] Hallazgo S-06: Tokens en múltiples vectores de entrada**

Se acepta el token como Bearer, `X-Session-Token` header, y cookie. Esto amplía la superficie de ataque. Considerar unificar en cookie httpOnly solamente.

**[BAJO] Hallazgo S-07: Session secret fallback en desarrollo**

```ts
return process.env.SESSION_SECRET?.trim() || "dev-insecure-session-secret";
```

Si un desarrollador ejecuta `NODE_ENV=production` con `AUTH_TOKEN_SECRET` vacío por error, el error correcto sí se lanza (línea 54). Correcto.

**[BAJO] Hallazgo S-08: Validación de userId demasiado permisiva**

```ts
const USER_ID_PATTERN = /^[a-zA-Z0-9._:-]{3,64}$/;
```

El patrón permite caracteres como `.`, `-`, `:` que podrían ser usados en path traversal si el userId se usa en rutas de sistema de archivos. En la arquitectura actual no se usa así, pero el patrón debería reforzarse.

---

### 3.2 Autenticación admin

**Implementación:** `src/lib/admin-auth.ts`

| Aspecto                     | Estado | Nota |
|-----------------------------|--------|------|
| Credenciales en env vars    | ✅     | `ADMIN_USERNAME`, `ADMIN_PASSWORD` |
| Token HMAC-SHA256           | ✅     | Cookie `mw_admin_session` |
| Sin MFA                     | ⚠️     | Un solo factor |
| Sin account lockout         | ⚠️     | Ver S-04 |
| Sin rotación de credenciales | ⚠️    | Manual |

---

## 4. Auditoría de base de datos

### 4.1 Schema

**Implementación:** `prisma/schema.prisma`

| Modelo        | Indexes | Cascades | Observaciones |
|---------------|---------|----------|---------------|
| User          | email unique, telegramId unique | — | OK |
| Conversation  | [userId, updatedAt] | SetNull on user delete | OK |
| Message       | [convId, createdAt], [createdAt], [userId, createdAt] | Cascade on conv delete | OK |
| UserState     | state, transformationPhase, emotion, crisis | — | Sin FK a User ⚠️ |
| DailyLog      | [userId, createdAt], [userId, logDate] | Cascade | OK |
| Goal/Action   | [userId, status, createdAt] | Cascade | OK |
| Streak        | [status, updatedAt] | Cascade | OK |

**[MEDIO] Hallazgo DB-01: UserState sin relación FK explícita a User**

```prisma
model UserState {
  id     String @id @default(cuid())
  userId String @unique
  // ← Sin: user User @relation(fields: [userId], references: [id])
```

`UserState` usa `userId` pero no tiene una relación Prisma explícita a `User`. Si se elimina un usuario, su `UserState` queda huérfano en la DB.

**[MEDIO] Hallazgo DB-02: Dual storage de mensajes**

`Conversation.messages` es un campo `Json` que almacena mensajes, Y existen registros individuales en `Message`. Este dual-write puede causar desincronización si una operación falla a mitad.

**[BAJO] Hallazgo DB-03: DailyCheckin sin FK a User**

```prisma
model DailyCheckin {
  userId String  // ← Sin relación Prisma
```

Similar a DB-01: sin FK explícita, los registros quedan huérfanos al eliminar un usuario.

**[BAJO] Hallazgo DB-04: datasource sin url explícita**

```prisma
datasource db {
  provider = "postgresql"
  // ← Sin: url = env("DATABASE_URL")
```

Funciona porque Prisma lee `DATABASE_URL` automáticamente, pero no es explícito. Considerar documentarlo.

### 4.2 Índices

Los índices cubren los patrones de acceso más frecuentes:
- Conversaciones por usuario + fecha ✅
- Mensajes por conversación + timestamp ✅
- Estado de crisis activo ✅
- Challenges por tipo y dificultad ✅

No hay índices de texto completo, lo cual es correcto dado que no hay búsqueda full-text.

---

## 5. Auditoría de APIs

### 5.1 Cobertura de endpoints (45 total)

| Grupo              | Endpoints | Tests | Cobertura |
|--------------------|-----------|-------|-----------|
| Chat               | 3         | 1     | 33%       |
| Auth               | 5         | 4     | 80%       |
| Conversations      | 2         | 1     | 50%       |
| Goals / Actions    | 2         | 0     | 0%        |
| Check-in           | 1         | 1     | 100%      |
| Impulso / Diagnóstico | 4      | 0     | 0%        |
| Admin              | 6         | 0     | 0%        |
| Telegram           | 1         | 0     | 0%        |
| Sistema            | 4         | 2     | 50%       |
| Resto              | 17        | 0     | 0%        |
| **TOTAL**          | **45**    | **9** | **20%**   |

**[ALTO] Hallazgo API-01: 80% de endpoints sin tests**

Solo 9 de 45 endpoints tienen tests. Los endpoints de admin, goals, impulso, y Telegram no tienen cobertura.

**[MEDIO] Hallazgo API-02: /api/health no verifica DB**

```ts
// src/app/api/health/route.ts
export async function GET() {
  return NextResponse.json({
    status: "ok",
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    // ← Sin verificar conectividad real a PostgreSQL
  });
}
```

Un health check que no verifica la base de datos puede reportar "ok" cuando el sistema está degradado.

**[MEDIO] Hallazgo API-03: /api/ready sin implementación visible**

El readiness probe debería verificar que Prisma puede conectar, las variables de entorno críticas están presentes, y el modelo AI responde. Sin esto, el balanceador de carga puede enrutar tráfico a instancias no listas.

**[MEDIO] Hallazgo API-04: system-check.sh usa userId hardcodeado**

```bash
# scripts/system-check.sh:38
CHAT_PAYLOAD='{"message":"...","userId":"system-check"}'
```

El endpoint `/api/chat` ignora el `userId` del body (usa sesión), pero este patrón podría confundir si se cambia la lógica. Además, el script no verifica el endpoint `/api/ready`.

**[BAJO] Hallazgo API-05: Sin versionado de API**

No hay prefijo `/api/v1/`. Si la API es consumida externamente (Telegram, futuras apps), los breaking changes serán disruptivos.

**[BAJO] Hallazgo API-06: Sin documentación OpenAPI/Swagger**

45 endpoints sin documentación machine-readable.

**[BAJO] Hallazgo API-07: Mensajes de error inconsistentes**

Algunos endpoints devuelven `{ error: "..." }`, otros `{ message: "..." }`, otros sin campo estándar.

---

## 6. Auditoría de testing

### 6.1 Estado actual

| Tipo de test        | Cantidad | Estado |
|--------------------|----------|--------|
| Unit (servicios)   | 11       | ✅ Presente |
| Unit (API routes)  | 11       | ✅ Presente (mockeados) |
| Integración (DB real) | 0     | ❌ Ausente |
| E2E (Playwright)   | 0        | ❌ Ausente |
| UI Components      | 0        | ❌ Ausente |
| Performance / Load | 0        | ❌ Ausente |
| Accesibilidad      | 0        | ❌ Ausente |

**[ALTO] Hallazgo T-01: Sin tests de integración con DB real**

Todos los tests de API mockean Prisma. La última vez que los tests con mocks pasaron pero producción falló en una migración, se sufrió una regresión real. Los tests de integración contra una DB de test son esenciales.

**[ALTO] Hallazgo T-02: Sin tests E2E**

Los flujos críticos del usuario (bootstrap → chat → goal creation, impulso → diagnóstico → reto, admin login → ver usuario) no están automatizados. Un cambio en el layout puede romper el flujo sin que ningún test lo detecte.

**[ALTO] Hallazgo T-03: Cobertura de API del 20%**

Los endpoints más críticos para el negocio (goals, impulso, admin, Telegram) no tienen ningún test.

**[MEDIO] Hallazgo T-04: Tests de API no verifican headers de respuesta**

Los tests verifican el body JSON pero no los headers (Content-Type, Set-Cookie, X-Session-Token). Los cambios en la gestión de cookies pueden pasar desapercibidos.

**[MEDIO] Hallazgo T-05: Sin snapshot tests para componentes UI**

Los componentes visuales pueden romperse silenciosamente. Sin snapshots o visual regression tests no hay red de seguridad para cambios UI.

**[BAJO] Hallazgo T-06: Cobertura no medida en CI**

No hay umbral mínimo de cobertura configurado en jest.config.mjs. La cobertura puede degradarse sin alertas.

### 6.2 Matriz de cobertura por servicio

| Servicio                  | Test presente | Observación |
|---------------------------|---------------|-------------|
| ai.ts                     | ✅            | Mockea OpenRouter |
| coach.ts                  | ✅            | Unit |
| emotional-model.ts        | ✅            | Unit |
| goals.ts                  | ✅            | Unit |
| impulse-diagnostic.ts     | ✅            | Unit |
| mentor-protocol.ts        | ✅            | Unit |
| onboarding.ts             | ✅            | Unit |
| risk.ts                   | ✅            | Unit |
| search.ts                 | ✅            | Unit |
| transformation.ts         | ✅            | Unit |
| conversation.ts           | ❌            | Sin test |
| state.ts                  | ❌            | Sin test |
| impulse-challenges.ts     | ❌            | Sin test |
| events.ts                 | ❌            | Sin test |
| reminders.ts              | ❌            | Sin test |
| streak.ts                 | ❌            | Sin test |
| telegram.ts               | ❌            | Sin test |
| user.ts                   | ❌            | Sin test |

---

## 7. Auditoría de rendimiento

### 7.1 Streaming y respuestas AI

| Aspecto               | Estado | Nota |
|-----------------------|--------|------|
| SSE streaming         | ✅     | text/event-stream correctamente implementado |
| Rate limiting         | ✅     | Por usuario via `checkRateLimit` |
| Timeout en AI         | ⚠️     | Sin timeout explícito en llamadas OpenRouter |
| Retry en AI           | ⚠️     | Sin lógica de retry observable |

**[MEDIO] Hallazgo P-01: Conversation.messages JSON blob sin límite**

```prisma
messages Json @default("[]")
```

El campo JSON de mensajes puede crecer indefinidamente. Para conversaciones largas (100+ mensajes), leer y escribir este blob en cada request tiene costo cuadrático en la DB.

**Solución:** Limitar a últimos N mensajes en el blob, o usar solo la tabla `Message` y eliminar el dual-storage.

**[MEDIO] Hallazgo P-02: Sin caching para datos frecuentes**

El perfil de usuario, estado emocional, y challenges activos se leen en cada request de chat. Sin un layer de caché (Redis, memoria), cada mensaje genera múltiples queries secuenciales a la DB.

**[MEDIO] Hallazgo P-03: Sin timeout en llamadas externas**

Las llamadas a OpenRouter no tienen un timeout explícito. Si el proveedor AI tarda, el request puede quedarse colgado indefinidamente, bloqueando workers.

**[BAJO] Hallazgo P-04: Sin HTTP/2 push ni prefetch estratégico**

Las páginas de landing y explore son candidatas a prefetch de datos. No hay uso de `generateStaticParams` o `revalidate` para contenido estático.

**[BAJO] Hallazgo P-05: BlockNote editor es pesado**

`@blocknote/react` y `@blocknote/mantine` suman ~500KB al bundle. Si el editor solo se usa en `/editor`, asegurarse de que está lazy-loaded.

---

## 8. Auditoría de experiencia de usuario

### 8.1 Flujos principales

#### Flujo 1: Nuevo usuario → Chat

```
/ (landing) → /explore → /app
```

| Paso                          | Estado | Hallazgo |
|-------------------------------|--------|----------|
| Landing clara y directa       | ✅     | Header limpio, CTA visible |
| CTA "Empezar ahora" → /explore | ✅    | Flujo claro |
| Explore → onboarding visual   | ✅     | Canvas interactivo |
| /app sin sesión → bootstrap   | ✅     | Sesión anónima automática |
| Captura de email opcional      | ✅     | No bloqueante |

**[MEDIO] Hallazgo UX-01: /explore usa datos estáticos hardcodeados**

```ts
// src/app/(public)/explore/page.tsx:24
const AVAILABLE_ACTIONS: ActionNode[] = [
  { id: "action-1", title: "Escribir lo que evitas", ... },
  // ← Datos fijos, no conectados al estado real del usuario
```

El explore canvas es decorativo — no refleja el estado real del usuario si ya tiene sesión. Esto puede crear expectativas rotas.

**[MEDIO] Hallazgo UX-02: Sin estado de carga global visible**

Durante el bootstrap de sesión y la primera carga del chat, no hay indicador de loading visible al usuario.

**[MEDIO] Hallazgo UX-03: Modo Impulso desconectado del chat principal**

El flujo Impulso (`/impulso/*`) y el chat principal (`/app`) son experiencias separadas sin transición clara. Un usuario que complete el diagnóstico en Impulso no sabe cómo continuar en el chat.

**[BAJO] Hallazgo UX-04: Header mobile — menú no cierra al navegar**

```tsx
// Header.tsx:79 — solo cierra onClick en links del menú
onClick={() => setMobileMenuOpen(false)}
```

Los botones CTA ("Acceder", "Empezar ahora") en mobile no cierran el menú. Necesitan el mismo onClick.

**[BAJO] Hallazgo UX-05: Sin feedback de error al usuario cuando falla el chat**

Si `/api/chat` devuelve error, la UI debe mostrar un mensaje claro. Sin verificar la implementación actual del componente `Chat.tsx`.

**[BAJO] Hallazgo UX-06: AuthShell muestra "Protegido" pero es admin**

```tsx
// AuthShell.tsx:37
<Badge>Protegido</Badge>
```

El badge "Protegido" en el login de admin es genérico. Para un admin esto es confuso vs "Acceso admin".

**[BAJO] Hallazgo UX-07: Sin dark mode en páginas públicas**

El ThemeToggle solo aparece en AuthShell. Las páginas landing/explore no ofrecen toggle de tema.

### 8.2 Accesibilidad

| Aspecto                      | Estado | Nota |
|------------------------------|--------|------|
| Radix UI primitives          | ✅     | A11y integrada en componentes |
| aria-label en menú mobile    | ✅     | Header.tsx:63 presente |
| Focus management en modales  | ✅     | Via Radix Dialog |
| Contraste de colores         | ⚠️     | Sin auditoría automática |
| Alt text en imágenes         | ⚠️     | Sin verificar |
| Keyboard navigation          | ⚠️     | Sin verificar en canvas explore |

---

## 9. Auditoría de código

### 9.1 Calidad general

| Aspecto                | Estado | Nota |
|------------------------|--------|------|
| TypeScript strict      | ✅     | tsconfig.json con strict |
| ESLint configurado     | ✅     | eslint.config.mjs |
| Prettier               | ✅     | .prettierrc presente |
| Imports absolutos      | ✅     | `@/` alias configurado |
| Sin `any` explícito    | ⚠️     | Sin verificar en todo el codebase |
| Tamaño de archivos     | ⚠️     | chat/route.ts > 13K tokens |

**[MEDIO] Hallazgo C-01: chat/route.ts demasiado grande**

`src/app/api/chat/route.ts` tiene más de 400 líneas con múltiples responsabilidades (auth, rate limiting, estado, goals, crisis, AI, streaming). Difícil de mantener y testear unitariamente.

**[MEDIO] Hallazgo C-02: Importaciones circulares potenciales**

El archivo `route.ts` importa de 20+ módulos. Sin análisis estático de dependencias, pueden existir dependencias circulares ocultas.

**[BAJO] Hallazgo C-03: Comentarios en inglés y español mezclados**

El código mezcla comentarios en castellano ("// Fallback defensivo") y en inglés. Definir un estándar.

**[BAJO] Hallazgo C-04: console.log / logger mezclados**

Verificar que no haya `console.log` directos en producción (deben usar `logInfo`/`logError` de `lib/logger.ts`).

**[BAJO] Hallazgo C-05: Env vars no validadas en startup**

`src/lib/env.ts` existe pero verificar que valida todas las vars críticas al inicio, no solo cuando se usan.

---

## 10. Matriz de riesgos

| ID    | Hallazgo                              | Severidad | Probabilidad | Impacto  | Prioridad |
|-------|---------------------------------------|-----------|-------------|---------|-----------|
| S-01  | Sin CSP headers                       | ALTO      | Alta        | Alto    | P1        |
| S-02  | Sin CORS explícito                    | ALTO      | Media       | Alto    | P1        |
| S-03  | MVP_STATIC_IDENTITY en producción     | ALTO      | Baja        | Crítico | P1        |
| T-01  | Sin tests integración DB real         | ALTO      | Alta        | Alto    | P1        |
| T-02  | Sin tests E2E                         | ALTO      | Alta        | Alto    | P1        |
| T-03  | 80% endpoints sin tests               | ALTO      | Alta        | Alto    | P1        |
| API-01| 80% endpoints sin tests               | ALTO      | Alta        | Medio   | P1        |
| S-04  | Admin sin rate limiting               | MEDIO     | Media       | Alto    | P2        |
| S-05  | safeEqual con shortcircuit de longitud | MEDIO    | Muy baja    | Bajo    | P3        |
| S-06  | Tokens en múltiples vectores          | MEDIO     | Baja        | Medio   | P3        |
| DB-01 | UserState sin FK explícita            | MEDIO     | Alta        | Medio   | P2        |
| DB-02 | Dual storage mensajes                 | MEDIO     | Alta        | Medio   | P2        |
| API-02| Health check sin DB                   | MEDIO     | Alta        | Alto    | P2        |
| P-01  | JSON blob sin límite                  | MEDIO     | Alta        | Medio   | P2        |
| P-02  | Sin caché para datos frecuentes       | MEDIO     | Alta        | Bajo    | P3        |
| P-03  | Sin timeout en OpenRouter             | MEDIO     | Media       | Alto    | P2        |
| C-01  | chat/route.ts demasiado grande        | MEDIO     | Alta        | Bajo    | P3        |
| UX-01 | Explore con datos hardcodeados        | MEDIO     | Alta        | Medio   | P2        |
| UX-02 | Sin loading state global              | MEDIO     | Alta        | Bajo    | P3        |
| UX-03 | Impulso desconectado del chat         | MEDIO     | Alta        | Medio   | P2        |
| T-04  | Tests sin verificar headers           | MEDIO     | Alta        | Bajo    | P3        |

---

## 11. Plan de acción priorizado

### P1 — Inmediato (esta semana)

- [ ] **S-01/S-02:** Añadir security headers en `next.config.ts` (CSP, X-Frame-Options, CORS)
- [ ] **S-03:** Añadir guard adicional para MVP_STATIC_IDENTITY — verificar en build time
- [ ] **T-01/T-02/T-03:** Implementar tests E2E con Playwright para los 3 flujos críticos
- [ ] **API-01:** Añadir tests básicos para goals, impulso/diagnóstico, y admin endpoints

### P2 — Corto plazo (próximas 2 semanas)

- [ ] **S-04:** Añadir rate limiting al endpoint `/api/admin/login`
- [ ] **DB-01:** Añadir FK explícita de `UserState` → `User` con CASCADE en schema.prisma
- [ ] **DB-02:** Decidir: mantener dual-storage o migrar a solo tabla `Message`
- [ ] **API-02:** Mejorar `/api/health` para verificar conectividad real a PostgreSQL
- [ ] **P-01:** Implementar límite de mensajes en JSON blob de Conversation
- [ ] **P-03:** Añadir AbortController con timeout en llamadas OpenRouter
- [ ] **UX-01:** Conectar explore canvas al estado real del usuario autenticado
- [ ] **UX-03:** Añadir transición clara de Impulso → chat principal

### P3 — Medio plazo (próximo mes)

- [ ] **S-05/S-06:** Revisar y documentar limitaciones de safeEqual; reducir vectores de token
- [ ] **P-02:** Evaluar Redis para caché de estado de usuario y challenges activos
- [ ] **C-01:** Refactorizar `chat/route.ts` — extraer orchestration logic
- [ ] **T-04/T-05/T-06:** Mejorar tests existentes — verificar headers, añadir snapshots UI, umbral de cobertura
- [ ] **UX-02:** Añadir loading skeleton global para bootstrap de sesión
- [ ] **UX-04:** Cerrar menú mobile al hacer click en CTAs del Header

---

*Auditoría generada automáticamente — validar cada hallazgo con revisión humana antes de actuar.*
*Ejecutar `npm run test:coverage` para obtener cobertura actual antes de cualquier cambio.*
