# Decision Engine - Setup

## 📋 Cambios realizados

### 1. Modelos Prisma (prisma/schema.prisma)
- `Conversation` - Conversaciones con historial de mensajes
- `User` - Usuarios del sistema
- `Message` - Mensajes individuales
- `DailyLog` - Logs diarios de actividad
- `Insight` - Insights generados automáticamente

### 2. Endpoint API (/app/api/admin/insights/route.ts)
- `GET /api/admin/insights` - Genera insights automáticamente
- Analiza usuarios activos, retención, mensajes, confusión
- Llama a OpenRouter para análisis con IA
- Guarda insights en DB

### 3. Panel Admin (/app/admin/page.tsx)
- Dashboard limpio y enfocado
- Muestra KPIs: usuarios activos, nuevos, check-ins, confusión
- Lista de insights con prioridades (high/medium/low)
- Acciones recomendadas claras

## 🚀 Setup

### Paso 1: Ejecutar migración

Cuando la base de datos esté disponible, ejecuta:

```bash
cd /Users/STARTIDEA/luciernaga-ai
npx prisma migrate dev --name add_insights_models
```

### Paso 2: Verificar esquema

```bash
npx prisma studio
```

### Paso 3: Acceder al panel

- URL: `http://localhost:3000/admin`
- Haz clic en "Generar Análisis"
- Los insights aparecerán automáticamente

## 📊 Cómo funcionan los insights

1. **RECOLECTA DATOS**
   - Usuarios activos (últimos 7 días)
   - Usuarios nuevos
   - Check-ins promedio
   - Palabras clave en mensajes (confusión, dudas)

2. **ANÁLISIS CON IA**
   - Envía métricas a OpenRouter
   - GPT-4o analiza patrones
   - Genera insights accionables

3. **GENERA INSIGHTS**
   - Retention: problemas de retención
   - Behavior: patrones de comportamiento
   - Risk: usuarios en riesgo
   - Clarity: confusión detectada
   - Engagement: baja actividad

4. **GUARDA EN DB**
   - Historial completo de insights
   - Prioridades para acción

## 🔧 Próximos pasos (opcional)

- [ ] Scheduler diario para generar insights automáticamente
- [ ] Webhook para alertas en tiempo real
- [ ] Histórico visual de insights
- [ ] Seguimiento de acciones completadas
- [ ] Exportar insights a PDF

## ⚙️ Variables de entorno necesarias

```env
DATABASE_URL=<tu-conexion-postgres>
OPENROUTER_API_KEY=<tu-api-key>
```

---

**Estado**: ✅ Código completo, listo para migración cuando BD esté disponible
