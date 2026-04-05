# Design System Global - Tres Mil Millones de Latidos

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Colores & Gradientes](#colores--gradientes)
3. [Tipografía](#tipografía)
4. [Espaciados](#espaciados)
5. [Componentes Base](#componentes-base)
6. [Responsividad](#responsividad)
7. [Uso en Páginas](#uso-en-páginas)
8. [Ejemplos de Código](#ejemplos-de-código)

---

## Visión General

Este Design System garantiza **consistencia visual en TODAS las páginas** de Tres Mil Millones de Latidos:

- ✅ **Colores fluorescentes modernos**: Negro → Morado → Violeta → Fucsia → Cyan
- ✅ **Responsive**: Mobile, Tablet, Desktop
- ✅ **Reutilizable**: Componentes base que funcionan en cualquier página
- ✅ **Mantenible**: Cambios centralizados en `src/styles/design-system.ts`

---

## Colores & Gradientes

### Paleta Principal

```
Neutrales:     Black, Zinc-950/900/800/700
Primario:      Violeta (a78bfa) → Fucsia (ec4899) → Cyan (06b6d4)
Estados:       Emerald (éxito), Amber (alerta), Red (error)
```

### Gradientes Predefinidos

```typescript
import { GRADIENTS } from '@/styles/design-system';

// Uso
<div className={`bg-gradient-to-r ${GRADIENTS.primary}`}>
  Violeta → Fucsia
</div>

<div className={`bg-gradient-to-r ${GRADIENTS.accent}`}>
  Violeta → Fucsia → Cyan (más dramático)
</div>
```

### Temas por Estado Emocional

```typescript
import { EMOTIONAL_THEMES } from '@/styles/design-system';

const theme = EMOTIONAL_THEMES.clarity;
// → { color: 'cyan', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', ... }

<div className={`${theme.bg} ${theme.border}`}>
  Este contenido responde al estado del usuario
</div>
```

---

## Tipografía

### Jerarquía de Headings

```typescript
import { TYPOGRAPHY } from '@/styles/design-system';

// Página principal
<h1 className={TYPOGRAPHY.h1}>Título principal</h1>
// → text-4xl md:text-5xl lg:text-6xl font-bold

// Secciones
<h2 className={TYPOGRAPHY.h2}>Sección</h2>
// → text-3xl md:text-4xl font-bold

// Subsecciones
<h3 className={TYPOGRAPHY.h3}>Subsección</h3>
```

### Tipografía de Cuerpo

```typescript
<p className={TYPOGRAPHY.body}>Texto normal</p>
<p className={TYPOGRAPHY.bodySmall}>Texto pequeño</p>
<p className={TYPOGRAPHY.bodyMicro}>Micro texto</p>
<label className={TYPOGRAPHY.label}>SECCIÓN</label>
```

---

## Espaciados

### Cards y Containers

```typescript
import { SPACING } from '@/styles/design-system';

// Card con padding responsive
<div className={SPACING.cardPadding}>
  Contenido con padding p-6 (móvil) → p-8 (desktop)
</div>

// Secciones
<div className={SPACING.sectionGap}>
  Elementos con gap-6 (móvil) → gap-8 (desktop)
</div>

// Página entera
<div className={SPACING.pagePadding}>
  px-4 py-8 (móvil) → px-8 py-16 (desktop)
</div>
```

### Border Radius

```typescript
<div className={SPACING.borderRadius.sm}>Pequeño (rounded-lg)</div>
<div className={SPACING.borderRadius.md}>Medio (rounded-xl)</div>
<div className={SPACING.borderRadius.lg}>Grande (rounded-2xl)</div>
```

---

## Componentes Base

### Cards

```tsx
import { COMPONENTS } from '@/styles/design-system';

// Card básico
<div className={COMPONENTS.card}>
  Contenido
</div>

// Card con hover
<div className={`${COMPONENTS.card} ${COMPONENTS.cardHover}`}>
  Contenido interactivo
</div>
```

### Botones

```tsx
// Botón primario (Violeta → Fucsia)
<button className={COMPONENTS.buttonPrimary}>
  Acceder
</button>

// Botón secundario (Borde morado)
<button className={COMPONENTS.buttonSecondary}>
  Cancelar
</button>

// Botones pequeños
<button className={`${COMPONENTS.buttonPrimary} ${COMPONENTS.buttonSmall}`}>
  OK
</button>
```

### Badges / Etiquetas

```tsx
<span className={COMPONENTS.badgeInfo}>Info</span>
<span className={COMPONENTS.badgeSuccess}>Éxito</span>
<span className={COMPONENTS.badgeWarning}>Alerta</span>
<span className={COMPONENTS.badgeError}>Error</span>
```

### Inputs

```tsx
<input
  type="text"
  className={COMPONENTS.inputField}
  placeholder="Escribe aquí..."
/>

<textarea className={COMPONENTS.inputField}>
  Contenido...
</textarea>
```

### Progress Bar

```tsx
<div className={COMPONENTS.progressBar}>
  <div 
    className={COMPONENTS.progressFill}
    style={{ width: `${percentage}%` }}
  />
</div>
```

---

## Responsividad

### Breakpoints Tailwind

```
sm:   640px  (mobile)
md:   768px  (tablet)
lg:  1024px  (desktop)
xl:  1280px  (wide)
2xl: 1536px  (ultra-wide)
```

### Patrones Comunes

```typescript
import { LAYOUTS } from '@/styles/design-system';

// Grid 2 columnas en desktop
<div className={LAYOUTS.gridTwoCol}>
  <div>Izquierda</div>
  <div>Derecha</div>
</div>

// Grid 3 columnas en desktop
<div className={LAYOUTS.gridThreeCol}>
  <div>1</div>
  <div>2</div>
  <div>3</div>
</div>

// Hero: 2 columnas en desktop
<div className={LAYOUTS.gridHero}>
  <div>Contenido</div>
  <div>Imagen/Visual</div>
</div>
```

### Ejemplo Completo Responsive

```tsx
<div className={LAYOUTS.sectionInner}>
  <h1 className={TYPOGRAPHY.h1}>Título</h1>
  
  <div className={LAYOUTS.gridThreeCol}>
    {items.map(item => (
      <div key={item.id} className={`${COMPONENTS.card} ${COMPONENTS.cardHover}`}>
        <h3 className={TYPOGRAPHY.h3}>{item.title}</h3>
        <p className={TYPOGRAPHY.body}>{item.description}</p>
      </div>
    ))}
  </div>
</div>
```

---

## Uso en Páginas

### ✅ Páginas con Design System (Referencia)

- `/explore` - Colores fluorescentes, responsive ✓
- `/dashboard` - Sistema de recomendaciones, responsive ✓

### 🔄 Páginas a Actualizar

- `/app` - Chat principal (usar tokens globales)
- `/impulso` - Programa de retos (aplicar colores)
- `/admin` - Panel administrativo (estandarizar)
- `/editor` - Block editor (mantener coherencia)
- Páginas públicas: `/landing`, `/contact`

---

## Ejemplos de Código

### Ejemplo 1: Página Completa Bien Formateada

```tsx
'use client';

import { TYPOGRAPHY, LAYOUTS, COMPONENTS, SPACING, GRADIENTS } from '@/styles/design-system';

export default function MyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-purple-950">
      {/* Header */}
      <div className={LAYOUTS.sectionInner}>
        <h1 className={`${TYPOGRAPHY.h1} bg-gradient-to-r ${GRADIENTS.primary} bg-clip-text text-transparent`}>
          Bienvenida
        </h1>
        <p className={TYPOGRAPHY.body}>Descripción</p>
      </div>

      {/* Grid de cards */}
      <div className={LAYOUTS.gridThreeCol}>
        {items.map(item => (
          <div key={item.id} className={`${COMPONENTS.card} ${COMPONENTS.cardHover}`}>
            <h3 className={TYPOGRAPHY.h3}>{item.title}</h3>
            <p className={TYPOGRAPHY.bodySmall}>{item.description}</p>
            <button className={COMPONENTS.buttonPrimary}>
              Acción
            </button>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className={COMPONENTS.card}>
        <input className={COMPONENTS.inputField} placeholder="Tu email" />
        <button className={COMPONENTS.buttonPrimary}>
          Enviar
        </button>
      </div>
    </div>
  );
}
```

### Ejemplo 2: Tabla Responsiva

```tsx
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr className="border-b border-zinc-800">
        <th className={`${TYPOGRAPHY.label} text-left py-3 px-4`}>Columna</th>
      </tr>
    </thead>
    <tbody>
      {data.map(row => (
        <tr key={row.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
          <td className="py-3 px-4">{row.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Ejemplo 3: Card con Estado Emocional

```tsx
import { EMOTIONAL_THEMES } from '@/styles/design-system';

export function EmotionalCard({ state, title, description }) {
  const theme = EMOTIONAL_THEMES[state];
  
  return (
    <div className={`rounded-2xl border p-6 ${theme.bg} ${theme.border}`}>
      <p className={`text-2xl mb-2 ${theme.text}`}>Estado: {title}</p>
      <p className="text-white">{description}</p>
    </div>
  );
}
```

---

## Checklist para Nuevas Páginas

- [ ] Importar tokens de `@/styles/design-system`
- [ ] Usar `TYPOGRAPHY` para headings y body
- [ ] Usar `COMPONENTS` para cards, buttons, inputs
- [ ] Usar `LAYOUTS` para grids y secciones
- [ ] Usar `SPACING` para padding/margin
- [ ] Usar `GRADIENTS` para fondos y botones
- [ ] Verificar responsive en mobile/tablet/desktop
- [ ] Aplicar tema de color (primario/secundario)
- [ ] Usar `EMOTIONAL_THEMES` si depende de estado

---

## Actualizar Design System

Si necesitas cambiar colores o estilos:

1. **Edita** `src/styles/design-system.ts`
2. **Actualiza** los valores centralizados
3. **Se refleja automáticamente** en todas las páginas que usan los tokens
4. **Sin cambios manuales** en cada página

```typescript
// Antes (malo - hardcodeado)
<button className="bg-indigo-500 hover:bg-indigo-400">Botón</button>

// Después (bien - desde design system)
<button className={COMPONENTS.buttonPrimary}>Botón</button>
```

---

## Soporte

Si tienes preguntas sobre cómo usar el design system:
- Revisa los ejemplos arriba
- Busca componentes similares en páginas ya completas (`/explore`, `/dashboard`)
- Usa los tipos TypeScript para autocompletar
