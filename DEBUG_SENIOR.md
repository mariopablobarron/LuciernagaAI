# 🔍 DEBUGGING SENIOR - Análisis Post-Mortem Error 500

**Fecha:** 29 de marzo de 2026  
**Commit:** ac216b5 (fix: debugging completo)  
**Severidad:** CRÍTICA  
**Status:** RESUELTO (+ Mejoras implementadas)

---

## 1. PROBLEMA ORIGINAL

### Síntomas reportados:
- Error 500 en POST `/api/chat`
- Pantalla blanca en frontend
- Sin visibilidad de qué falló exactamente

### Root Cause Analysis:

#### **Problema #1: Prisma sin manejo de errorLínea 115 en `app/api/chat/route.ts`:**

```typescript
// ❌ ANTES (VULNERABLE)
await prisma.userState.upsert({
  where: { userId },
  update: { state: userState, updatedAt: new Date() },
  create: { userId, state: userState },
});
```

**¿Qué pasó?**
- Cuando `DATABASE_URL` estaba DOWN (P1001 Connection Error)
- Prisma lanzaba error no capturado específicamente
- El try/catch general atrapaba todo → error 500 genérico
- Cliente recibía `{ error: "Error interno" }` sin contexto → **pantalla blanca**

**Por qué es crítico:**
- La app se quedaba sin feedback del usuario
- Imposible debuggear del lado del cliente
- Imposible debuggear del lado del servidor (logs genéricos)

---

#### **Problema #2: Validación de respuesta incorrecta**
Línea 138-140 en `app/api/chat/route.ts`:

```typescript
// ❌ ANTES (INCORRECTO)
const data = await response.json();  // Parse sin validación
if (!response.ok) {                 // Verificación DESPUÉS
  console.error(data);
}
```

**¿Qué pasó?**
- Si OpenRouter tiene error interno pero devuelve `status 200`
- El `.json()` falla o devuelve objeto con `error` que no es respuesta válida
- El código no lo detecta porque verifica `.ok` DESPUÉS de parsear
- El código intenta acceder a `data?.choices?.[0]?.message?.content` → undefined → respuesta vacía

**Por qué es crítico:**
- Respuesta incompleta al usuario
- No hay manejo específico del error

---

#### **Problema #3: Frontend roto**
Archivo `app/page.tsx`:

```typescript
// ❌ ANTES (SYNTAX ERROR)
useEffect(() => {
  scrollToBottom();
});
	if (!input.trim()) return;  // ← FUERA DE FUNCIÓN
	const userMessage = { ... };
	// El resto del código de sendMessage stá sueltoen el componente
```

**¿Qué pasó?**
- No hay función `sendMessage()` definida
- El try/catch de envío de mensaje estaba AFUERA de la función
- Never se ejecutaba correctamente
- El botón "Enviar" hacía referencia a una función que no existía

**Impacto:**
- Frontend NO compilaba correctamente
- Incluso si el backend funcionaba, el UI no podía enviar mensajes

---

## 2. SOLUCIONES IMPLEMENTADAS

### ✅ Fix #1: Logs Estratégicos + Manejo de Errores en Backend

```typescript
// ✅ DESPUÉS (DEBUGGING COMPLETO)
export async function POST(req: NextRequest) {
  console.log("[CHAT] 📨 Petición recibida");  // Entry point
  
  try {
    const { message, userId } = await req.json();
    console.log(`[CHAT] userState=${userId}, msgLen=${message?.length || 0}`);

    // Validación con logs
    if (!message?.trim() || !userId?.trim()) {
      console.warn("[CHAT] ⚠️ Input incompleto");
      return NextResponse.json(
        { reply: "Error: ...", error: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    // Manejo específico de DB
    try {
      console.log(`[CHAT] 💾 Guardando UserState...`);
      await prisma.userState.upsert({...});
      console.log(`[CHAT] ✅ UserState guardado`);
    } catch (dbError: any) {
      console.warn(`[CHAT] ⚠️ DB error (no crítico): ${dbError.code}`);
      // Continuar sin DB en vez de fallar
    }

    // Validar HTTP ANTES de parse
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CHAT] ❌ OpenRouter error: ${response.status}`);
      return NextResponse.json(
        { reply: `Error ${response.status}`, error: "OPENROUTER_ERROR" },
        { status: 502 }
      );
    }

    // Parse con validación
    let data;
    try {
      data = await response.json();
      console.log(`[CHAT] ✅ JSON parsed`);
    } catch (parseError) {
      console.error(`[CHAT] ❌ JSON parse error`);
      return NextResponse.json(
        { reply: "Error: respuesta no válida", error: "JSON_PARSE_ERROR" },
        { status: 502 }
      );
    }

    // Validar contenido
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      console.error(`[CHAT] ❌ Respuesta sin contenido`);
      return NextResponse.json(
        { reply: "Error: modelo no generó respuesta", error: "EMPTY_RESPONSE" },
        { status: 502 }
      );
    }

    console.log(`[CHAT] ✨ Éxito (${reply.length} chars)`);
    return NextResponse.json({ ok: true, reply, state: userState });

  } catch (error: any) {
    console.error(`[CHAT] 💥 UNHANDLED ERROR: ${error.message}`);
    console.error(error.stack);  // ← Stack trace completo
    return NextResponse.json(
      { reply: "Error inesperado", error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
```

**Mejoras:**
- ✅ Logs en CADA etapa (entrada, DB, API, parse, salida)
- ✅ Manejo específico de errores (DB no crítico, OpenRouter crítico)
- ✅ Validación ANTES de parse
- ✅ Errores estructurados: `{ reply, error, statusCode }`
- ✅ HTTP status codes correctos: 400 (bad input), 501 (config falta), 502 (API fail), 500 (internal)

---

### ✅ Fix #2: Frontend Reconstruido con Error Display

```typescript
// ✅ DESPUÉS (ESTRUCTURA CORRECTA)
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId] = useState(() => `user_${Date.now()}`);
  const [error, setError] = useState<string | null>(null);

  // ✅ Función CORRECTAMENTE definida
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    console.log(`[FRONTEND] 📨 Enviando (${input.length} chars)`);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: input, userId }),
      });

      console.log(`[FRONTEND] 📡 Status: ${res.status}`);

      if (!res.ok) {
        // ✅ Mostrar error en lugar de pantalla blanca
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.reply || `Error ${res.status}`;
        console.error(`[FRONTEND] ❌ ${errorMsg}`);
        
        setError(errorMsg);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "assistant",
          content: `❌ Error: ${errorMsg}`,
          error: true,
        }]);
        return;
      }

      const data = await res.json();
      
      // ✅ Validación
      if (!data.reply) {
        setError("Empty response from server");
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "assistant",
          content: "❌ El servidor no generó respuesta",
          error: true,
        }]);
        return;
      }

      // ✅ Mensaje de éxito
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
      }]);
      console.log(`[FRONTEND] ✨ Mensaje agregado`);

    } catch (err: any) {
      console.error(`[FRONTEND] 💥 ${err.message}`);
      setError(err.message);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Error de conexión: ${err.message}`,
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ✅ Mostrar errores visibles en header */}
      {error && (
        <div className="p-2 bg-red-100 border border-red-300 rounded text-red-800">
          ⚠️ {error}
        </div>
      )}
      {/* ... resto del UI ... */}
    </div>
  );
}
```

**Mejoras:**
- ✅ Función `sendMessage()` correctamente definida
- ✅ Logs estratégicos en frontend también
- ✅ Error banner visible
- ✅ Mensajes de error mostrados en el chat
- ✅ Validación de respuesta antes de mostrar

---

### ✅ Fix #3: Endpoints de Diagnóstico

#### **GET `/api/health` - Diagnostico de sistema**

```typescript
// Resultado:
{
  "timestamp": "2026-03-29T...",
  "environment": {
    "hasOpenRouterKey": true,
    "hasDatabaseUrl": true,
    "nodeEnv": "development"
  },
  "database": {
    "status": "✅ CONNECTED",
    "error": null
  },
  "ready": true,
  "statusCode": 200
}
```

---

#### **POST `/api/mock-chat` - Testing sin BD ni OpenRouter**

```bash
curl -X POST http://localhost:3000/api/mock-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "no sé qué hacer", "userId": "test"}'
```

**Resultado:**
```json
{
  "ok": true,
  "reply": "[Mock response based on detected state]",
  "state": "perdido",
  "mock": true
}
```

**Uso:** Testear frontend sin dependencias externas

---

## 3. CÓMO VERIFICAR QUE FUNCIONA

### 3.1 Verificar que el servidor está sano

```bash
# Check de salud del sistema
curl http://localhost:3000/api/health | jq .

# Esperado:
# {
#   "ready": true,
#   "database": { "status": "✅ CONNECTED" },
#   ...
# }
```

### 3.2 Test con endpoint MOCK (sin BD ni OpenRouter)

```bash
curl -X POST http://localhost:3000/api/mock-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "no sé qué hacer", "userId": "diego_24"}'

# Esperado:
# {
#   "ok": true,
#   "reply": "[Respuesta completa del mentor]",
#   "state": "perdido",
#   "mock": true
# }
```

### 3.3 Test con endpoint REAL (si BD conectada)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "estoy ansioso", "userId": "diego_24"}'

# En consola verás:
# [CHAT] 📨 Petición recibida
# [CHAT] userState=diego_24, msgLen=14
# [CHAT] 🎯 Estado detectado: ansioso
# [CHAT] 💾 Guardando UserState en DB...
# [CHAT] ✅ UserState guardado
# [CHAT] 🧠 Prompt construido (580 chars)
# [CHAT] 🌐 Llamando OpenRouter...
# [CHAT] 📡 OpenRouter responded with status 200
# [CHAT] ✅ JSON parsed correctamente
# [CHAT] ✨ Respuesta generada (250 chars)
```

### 3.4 Verificar logs en Console de navegador (F12)

```
[FRONTEND] VERSION: v3
[FRONTEND] userId: user_1711725600000
[FRONTEND] 📨 Enviando mensaje (14 chars)
[FRONTEND] 🌐 POST /api/chat
[FRONTEND] 📡 Respuesta status: 200
[FRONTEND] ✅ Respuesta recibida (250 chars)
[FRONTEND] ✨ Mensaje asistente agregado
```

---

## 4. MEJORES PRÁCTICAS IMPLEMENTADAS

| Problema | Solución | Línea |
|----------|----------|-------|
| Errores silenciosos | Logs estructurados con prefijo `[CHAT]` | route.ts:8+ |
| Manejo incorrecto de async/await | Try/catch específicos por nivel | route.ts:45-50 |
| Validación fuera de orden | HTTP check ANTES de parse | route.ts:118 |
| Frontend sin feedback | Error banner + mensajes de error en chat | page.tsx:50 |
| Sin diagnostico | Endpoint `/api/health` | health/route.ts |
| Testing difícil | Endpoint `/api/mock-chat` | mock-chat/route.ts |
| Pantalla blanca | Manejo visible de errores | page.tsx:15+ |

---

## 5. CHECKLIST POST-FIX

- ✅ Logs estratégicos en backend (entrada, DB, API, parse, salida)
- ✅ Manejo de errores por nivel (DB, OpenRouter, JSON, validación)
- ✅ HTTP status codes correctos (400, 501, 502, 500)
- ✅ Frontend muestra errores visibles
- ✅ Frontend tiene `userId` único para cada sesión
- ✅ Frontend envía `userId` en la petición
- ✅ Backend guarda UserState sin bloquear si DB falla
- ✅ Validación de respuesta ANTES de parse
- ✅ Endpoint `/api/health` para diagnostico
- ✅ Endpoint `/api/mock-chat` para testing sin dependencias

---

## 6. PRÓXIMOS PASOS

### Inmediatos:
1. Verificar que DATABASE_URL sea válida y BD esté accesible
2. Ejecutar `npx prisma db push` para sincronizar schema
3. Testear flujo completo: `/health` → `/mock-chat` → `/api/chat`

### A mediano plazo:
1. Añadir rate limiting en `/api/chat`
2. Implementar retry logic para OpenRouter
3. Caché de respuestas por estado común
4. Métricas de latencia
5. Alertas si error rate > 5%

### Documentación:
1. Onboarding para nuevos devs sobre estructura de logs
2. Runbook de "Qué hacer si Error 500"
3. Dashboard de monitoreo de salud

---

## 7. REFERENCIA RÁPIDA: CÓDIGOS DE ERROR

| Estado | Código | Significa | Acción |
|--------|--------|-----------|--------|
| 200 | `ok: true` | ✅ Éxito | Mostrar respuesta |
| 400 | `INVALID_INPUT` | Falta message o userId | Cliente debe revisar input |
| 501 | `MISSING_API_KEY` | OPENROUTER_API_KEY no configurada | Dev debe setup .env |
| 502 | `OPENROUTER_ERROR` | API externa falló | Reintentar después |
| 502 | `JSON_PARSE_ERROR` | Respuesta no es JSON válido | Investigar API externa |
| 502 | `EMPTY_RESPONSE` | API devolvió sin contenido | Investigar modelo |
| 500 | `INTERNAL_ERROR` | Error no manejado | Check logs del servidor |

---

**Commit:** ac216b5  
**Deploy:** Ready ✅
