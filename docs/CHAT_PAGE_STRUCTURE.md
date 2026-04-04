# Estructura de la Página de Chat `/app`

## PROPÓSITO GENERAL
**La página `/app` es el espacio de trabajo conversacional** donde el usuario:
1. **Chatea con el AI Coach** para explorar qué lo bloquea
2. **Recibe objetivos y acciones** personalizadas
3. **Completa acciones y check-ins** para progresar
4. **Ve insights** sobre su patrón emocional

---

## DISEÑO VISUAL ORDENADO

```
┌────────────────────────────────────────────────────────────────┐
│                  HEADER / TOOLBAR                              │
│  (Tabs: Chat | Plan | Goals) + (Estado usuario)               │
└────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────────────────┬──────────────────────┐
│              │                          │                      │
│   SIDEBAR    │     CHAT PRINCIPAL       │     INSIGHTS &       │
│   IZQUIERDO  │                          │     OBJETIVOS        │
│              │     • Conversación       │                      │
│ • Historial  │     • Input usuario      │  • Estado emocional  │
│ • Conversaciónes│   • Respuesta IA      │  • Recomendaciones   │
│ • Búsqueda   │     • Mensajes          │  • Objetivo activo   │
│              │                          │  • Acciones          │
│              │                          │  • Check-in          │
│              │                          │                      │
└──────────────┴──────────────────────────┴──────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  DIALOGS FLOTANTES (cuando sea necesario)                      │
│  • Captura de email | Upgrade | Onboarding | Consent           │
└────────────────────────────────────────────────────────────────┘
```

---

## ZONAS PRINCIPALES

### 1. HEADER (Toolbar Superior)
**Objetivo:** Navegación y contexto global

**Elementos:**
- **Tabs horizontales** para cambiar modo:
  - `Chat` - Conversación principal (ACTIVO por defecto)
  - `Plan` - Vista de objetivos y progreso
  - `Goals` - Gestión de metas
- **Indicadores de estado:**
  - Estado emocional actual (clarity/blocked/anxiety/doubt)
  - Racha de días
  - Usuario anónimo/autenticado
- **Opciones:** Menú usuario, logout, settings

**Comportamiento:**
- Sticky (pegado arriba)
- Responsive: oculta tabs en móvil, muestra icono de menú

---

### 2. SIDEBAR IZQUIERDO (Historial)
**Objetivo:** Acceso rápido a conversaciones anteriores

**Elementos:**
- **Título:** "Conversaciones"
- **Buscador** para filtrar conversaciones
- **Lista de conversaciones:**
  - Conversación activa (highlight)
  - Última fecha actualizada
  - Número de mensajes
  - Botón "+ Nueva"
- **Acciones:**
  - Click = cambiar a conversación
  - Right-click/⋮ = opciones (renombrar, eliminar, exportar)

**Comportamiento:**
- Visible en desktop (lg+)
- Oculto en mobile/tablet
- Scrollable cuando hay muchas conversaciones

---

### 3. ZONA CENTRAL (Chat Principal) ⭐ **PRINCIPAL**
**Objetivo:** Conversación con el AI Coach

**Elementos:**
1. **Área de mensajes** (scrollable):
   - Mensajes del usuario (derecha, azul)
   - Respuestas del IA (izquierda, gris)
   - Timestamps y badges de estado

2. **Indicadores de IA en proceso:**
   - Cursor parpadeante mientras escribe
   - Badge "Pensando..." o spinning dot

3. **Input de usuario:**
   - Textarea expansible
   - Placeholder: "¿Qué sientes ahora?"
   - Botón Enviar
   - Draft guardado localmente (si se recarga, recupera el texto)

4. **Estados especiales:**
   - **Crisis detected** → Mensaje rojo con alerta
   - **Action required** → Card destacada con acción
   - **Error** → Mensaje de error con retry

**Comportamiento:**
- Auto-scroll al nuevo mensaje
- Responsive: ajusta tamaño en móvil
- Persiste mensaje draft en localStorage

---

### 4. SIDEBAR DERECHO (Insights & Objetivos)
**Objetivo:** Contexto y acciones derivadas de la conversación

**Elementos:**

#### A. **Card: Estado Emocional**
```
Emoji | Estado actual
Patrón detectado
Nivel de energía (1-5 barras)
```

#### B. **Card: Recomendaciones**
```
💡 Recomendación personalizada según estado
```

#### C. **Card: Objetivo Activo**
```
Título: "Completar proyecto X"
Progreso: 2/4 acciones
Checklist de acciones:
  ☑ Acción 1
  ☐ Acción 2
  ☐ Acción 3
"Agregar acción" btn
```

#### D. **Card: Check-in diario** (cuando corresponda)
```
"¿Cómo estuvo tu día?"
Textarea para respuesta
"Guardar check-in" btn
Status: "✓ Completado hoy"
```

#### E. **Card: Guardar progreso** (anónimos)
```
"Guarda tu email para no perder progreso"
Input email
"Guardar" btn
```

**Comportamiento:**
- Visible en desktop grande (xl+)
- Oculto en tablet/mobile
- Cada card es independiente
- Scrollable en el panel

---

## FLUJOS PRINCIPALES

### Flujo 1: Conversación Simple
```
Usuario escribe → IA responde → Insights se actualizan
                              → Si hay objetivo, se muestra
                              → Si requiere acción, se destaca
```

### Flujo 2: Completar Acción
```
Usuario ve acción en panel derecho
→ Clickea checkbox
→ IA valida y responde
→ Actualiza progreso
→ Muestra siguiente acción o celebración
```

### Flujo 3: Check-in Diario
```
Panel derecho muestra "Check-in"
→ Usuario completa formulario
→ Guarda estado del día
→ Muestra racha actualizada
```

### Flujo 4: Captura de Email (anónimo)
```
Conversación llega a punto clave
→ Sistema detecta conversión
→ Dialog modal: "Guarda tu email"
→ Usuario confirma
→ Vincula cuenta a email
```

---

## ESTADOS VISUALES

### Estado 1: Cargando sesión
- Skeleton loaders en todas las zonas
- Spinner en centro
- "Preparando tu espacio..."

### Estado 2: Anónimo sin progreso
- No hay objetivo visible
- Panel derecho muestra "Comienza escribiendo"
- Button para ir a /explore

### Estado 3: Con objetivo activo
- Objetivo en panel derecho
- Checklist de acciones visible
- Check-in si no completó hoy

### Estado 4: Crisis detectada
- Mensaje rojo en chat
- Alert especial
- Botón de "Líneas de ayuda"
- Notificación al admin/psicólogo

---

## RESPONSIVIDAD

### Desktop (lg+)
```
[Sidebar] [Chat Principal] [Insights]
Todos visibles, layout de 3 columnas
```

### Tablet (md-lg)
```
[Chat Principal] [Insights]
Sidebar colapsable/drawer
```

### Mobile (sm)
```
[Chat Principal solamente]
Sidebar, insights, tools en drawer/modal
```

---

## COMPONENTES INVOLUCRADOS

```
/app/page.tsx (HomePage)
├── ChatWorkspaceContainer
│   ├── header: HomeWorkspace (tabs + toolbar)
│   ├── sidebarLeft: Sidebar (conversaciones)
│   ├── chatArea: Chat (conversación principal)
│   ├── sidebarRight: InsightsPanel (estado + objetivos)
│   └── tools: Dialogs (upgrade, email, onboarding)
│
├── Dialog: UpgradeDialog
├── Dialog: CaptureEmailDialog
├── Dialog: OnboardingDialog
├── Dialog: ConsentModal (si aplica)
└── Toaster (notificaciones)
```

---

## KEYS & TIPS

1. **El objetivo principal es CHATEAR** - Todo lo demás es contexto
2. **Los insights deben ser secundarios** - No distraer de la conversación
3. **Las acciones deben ser claras** - No enterradas en menús
4. **Responsive es crítico** - Mobile users son mayoría
5. **Guardado automático** - User nunca pierde progreso

---

## NEXT STEPS PARA MEJORA

- [ ] Agregar animaciones suaves entre tabs
- [ ] Mejorar visual feedback en acciones completadas
- [ ] Agregar drag-drop para reordenar acciones
- [ ] Implementar temas (light/dark)
- [ ] Agregar emojis de reacción a mensajes
