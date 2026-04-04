# Plan de Migración - Design System Global

## ✅ COMPLETADO

### 1. Sistema de Tokens Creado
- ✅ `src/styles/design-system.ts` - Centro de verdad para todos los estilos
- ✅ `docs/DESIGN_SYSTEM.md` - Guía completa de uso
- ✅ `docs/COLOR_CONSISTENCY_AUDIT.md` - Auditoría de todas las páginas

### 2. Páginas Actualizadas ✓

#### Públicas
- ✅ `/landing` - Hero actualizado con gradientes fluorescentes
  - Cambios: GRADIENTS, TYPOGRAPHY, COMPONENTS
  - Estado: Aún necesita actualizar secciones adicionales

- ✅ `/contact` - Formulario completo actualizado
  - Cambios: COMPONENTS.card, COMPONENTS.inputField, COMPONENTS.buttonPrimary
  - Estado: 100% completado

#### Especial
- ✅ `/explore` - Ya conforme (creado con design system)
- ✅ `/dashboard` - Ya conforme (creado con design system)

---

## 🔄 EN PROGRESO

### 3. Páginas Faltantes por Actualizar

#### High Priority (Impacto Visual Alto)

**A. `/impulso` (Página principal del programa)**
```
Location: src/app/impulso/page.tsx
Cambios necesarios:
  - Fondo: bg-gradient-to-br ${GRADIENTS.background}
  - Cards: COMPONENTS.card
  - Botones: COMPONENTS.buttonPrimary
  - Tipografía: TYPOGRAPHY tokens
  - Badges: COMPONENTS.badge*
```

**B. `/impulso/checkin` (Check-in diario)**
```
Location: src/app/impulso/checkin/page.tsx
Cambios necesarios:
  - Formulario: COMPONENTS.inputField
  - Buttons: COMPONENTS.buttonPrimary
  - Success state: COMPONENTS.badgeSuccess
  - Cards: COMPONENTS.card
```

**C. `/app` (Chat Principal - Complejo)**
```
Location: src/app/app/page.tsx (1984 líneas)
Cambios necesarios:
  - Fondo: GRADIENTS.background
  - Componentes UI: COMPONENTS.*
  - Tipografía: TYPOGRAPHY.*
  - Inputs: COMPONENTS.inputField
  - Buttons: COMPONENTS.buttonPrimary/Secondary
  - Dialogs y modales: aplicar tema
```

#### Medium Priority

**D. `/admin` (Panel administrativo)**
```
Location: src/app/admin/page.tsx
Cambios necesarios:
  - Tema oscuro: mantener pero aplicar COMPONENTS
  - Cards: COMPONENTS.card
  - Alertas: COMPONENTS.badge*
  - Tablas: bordes y hover effects modernos
```

**E. `/impulso/diagnostico`, `/impulso/retos`, `/impulso/perfil`**
```
Cambios necesarios:
  - Aplicar COMPONENTS.card
  - Actualizar botones
  - Mantener layout existente
```

**F. `/editor` (Block Editor)**
```
Location: src/app/editor/page.tsx
Cambios necesarios:
  - Toolbar: aplicar tema
  - Sidebar: colores modernos
  - Mantener funcionalidad de editor
```

---

## 📊 Matriz de Progreso

| Página | Estado | Cambios | Prioridad |
|--------|--------|---------|-----------|
| `/landing` | 🔄 Parcial | Hero: ✓, Resto: ⏳ | 🔴 Alta |
| `/contact` | ✅ Completo | 100% | 🟢 Hecho |
| `/explore` | ✅ Conforme | Ya moderno | 🟢 Hecho |
| `/dashboard` | ✅ Conforme | Ya moderno | 🟢 Hecho |
| `/app` | ❌ No iniciado | Todo | 🔴 Alta |
| `/impulso` | ❌ No iniciado | Cards, buttons, tipografía | 🟠 Media |
| `/impulso/checkin` | ❌ No iniciado | Formulario | 🟠 Media |
| `/impulso/*` (3) | ❌ No iniciado | Básico | 🟠 Media |
| `/admin` | ❌ No iniciado | Cards, alertas | 🟡 Baja |
| `/editor` | ❌ No iniciado | Toolbar, sidebar | 🟡 Baja |

---

## 🚀 Cómo Completar Faltantes

### Patrón General (Aplica a Todas las Páginas)

```typescript
// 1. Importar tokens
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

// 2. Actualizar fondo
// Antes:  bg-zinc-950
// Después: bg-gradient-to-br ${GRADIENTS.background}

// 3. Reemplazar headings
// Antes:  className="text-4xl font-bold text-white"
// Después: className={TYPOGRAPHY.h1}

// 4. Reemplazar cards
// Antes:  className="card-surface p-6"
// Después: className={COMPONENTS.card}

// 5. Reemplazar buttons
// Antes:  className="bg-indigo-500 hover:bg-indigo-400"
// Después: className={COMPONENTS.buttonPrimary}

// 6. Reemplazar inputs
// Antes:  className="bg-zinc-900 border-zinc-700"
// Después: className={COMPONENTS.inputField}

// 7. Reemplazar badges
// Antes:  className="bg-green-500/10 text-green-400"
// Después: className={COMPONENTS.badgeSuccess}
```

---

## 🎯 Orden de Implementación Recomendado

### Fase 1 (Crítica - Hoy/Mañana)
1. ✅ Completar `/landing` (resto de secciones)
2. ✅ `/contact` (HECHO)
3. ⏳ `/impulso` - Rápido, impacto visual

### Fase 2 (Importante - Esta Semana)
4. `/app` - Complejo, requiere tiempo
5. `/impulso/checkin` - Formulario
6. `/impulso/*` (diagnostico, retos, perfil)

### Fase 3 (Complementaria)
7. `/admin` - Menos visible
8. `/editor` - Complejo pero no crítico

---

## 📝 Template para Cada Página

**Cuando actualices una página, sigue este template:**

```tsx
'use client';

// ✅ 1. Importar tokens
import { 
  TYPOGRAPHY, 
  COMPONENTS, 
  LAYOUTS, 
  GRADIENTS,
  SPACING 
} from '@/styles/design-system';
import { otrosImports } from 'wherever';

export default function PageName() {
  return (
    // ✅ 2. Fondo gradiente
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background}`}>
      
      // ✅ 3. Usar LAYOUTS para secciones
      <div className={LAYOUTS.sectionInner}>
        
        // ✅ 4. Tipografía
        <h1 className={TYPOGRAPHY.h1}>Título</h1>
        <h2 className={TYPOGRAPHY.h2}>Subtítulo</h2>
        <p className={TYPOGRAPHY.body}>Párrafo</p>
        
        // ✅ 5. Grids y layouts
        <div className={LAYOUTS.gridThreeCol}>
          // ✅ 6. Cards con componentes
          <div className={`${COMPONENTS.card} ${COMPONENTS.cardHover}`}>
            <h3 className={TYPOGRAPHY.h3}>Contenido</h3>
          </div>
        </div>
        
        // ✅ 7. Botones
        <button className={COMPONENTS.buttonPrimary}>Acción</button>
        <button className={COMPONENTS.buttonSecondary}>Cancelar</button>
        
        // ✅ 8. Inputs
        <input className={COMPONENTS.inputField} />
        
        // ✅ 9. Badges
        <span className={COMPONENTS.badgeSuccess}>Éxito</span>
        <span className={COMPONENTS.badgeError}>Error</span>
      </div>
    </div>
  );
}
```

---

## ✨ Resultado Final

Cuando todo esté completo:

✅ **Consistencia Visual** - Todas las páginas usan la misma paleta (Negro-Morado-Violet-Fuchsia-Cyan)
✅ **Responsive** - Mobile-first en todas partes
✅ **Moderno** - Gradientes fluorescentes, efectos modernos
✅ **Mantenible** - Cambios centralizados en `design-system.ts`
✅ **Profesional** - Aspecto pulido y cohesionado

---

## 🔗 Referencias

- Sistema de tokens: `src/styles/design-system.ts`
- Guía de uso: `docs/DESIGN_SYSTEM.md`
- Auditoría inicial: `docs/COLOR_CONSISTENCY_AUDIT.md`

---

## Nota

Puedes actualizar páginas en cualquier orden. El sistema está diseñado para ser aplicable page-by-page sin dependencias.

Para cualquier página, simplemente:
1. Importa los tokens
2. Reemplaza clases hardcodeadas con tokens
3. Verifica responsividad
4. ¡Listo!
