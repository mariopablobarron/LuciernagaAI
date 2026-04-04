# Luciernaga AI - UI Implementation Guide

Complete specifications and component templates for building all pages in the design system.

---

## Color Palette Reference

```css
/* Dark Theme (zinc-950 base) */
--bg-base: #09090b          /* zinc-950 */
--bg-surface: #18181b       /* zinc-900 */
--border: #27272a           /* zinc-800 */
--text-primary: #ffffff
--text-muted: #a1a1aa       /* zinc-400 */
--accent: #6366f1           /* indigo-500 */
--accent-hover: #818cf8     /* indigo-400 */

/* Emotional States */
--emotion-blocked: #ef4444    /* red-500 */
--emotion-anxious: #f59e0b    /* amber-500 */
--emotion-doubt: #a855f7      /* purple-500 */
--emotion-clarity: #10b981    /* emerald-500 */
```

---

## 1. PUBLIC HEADER & FOOTER

### Header (src/components/home/Header.tsx)
- Sticky top with transparent → zinc-950/80 on scroll
- Logo left: "Luciernaga" wordmark white
- Nav: Inicio | Cómo funciona | Impulso | Contacto
- CTA right: "Abrir app →" indigo button
- Mobile menu with hamburger

**Key Classes:**
```tsx
className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur"
```

### Footer (src/components/home/Footer.tsx)
- Columns: Brand | Product | Legal | Resources
- Copyright + disclaimer
- Link colors: hover:text-indigo-400

---

## 2. PAGE IMPLEMENTATIONS

### 2.1 Homepage (/) - COMPLETE ✅
**Status:** LandingPageDesign.tsx component created
- Hero with radial glow
- Social proof avatars
- 3-card features grid
- Final CTA section
- Responsive, no external images

### 2.2 Landing Page (/landing)
**File:** `src/app/(public)/landing/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* HERO - 2 Column */}
      <section className="min-h-[calc(100vh-80px)] grid md:grid-cols-2 gap-12 items-center px-4 py-24">
        {/* Left: Text */}
        <div className="space-y-6">
          <p className="text-sm text-indigo-400 font-semibold uppercase tracking-wider">
            ⚡ Transformación Real
          </p>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Cambia tu vida{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              un hábito a la vez
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            Luciernaga te guía a través de la transformación real. No es teoría.
            No es perfección. Es acción pequeña, consistente, que genera cambios duraderos.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/explore" className="btn-primary">
              Empieza gratis
            </Link>
            <button className="btn-secondary">Ver demo</button>
          </div>
        </div>

        {/* Right: Chat UI Mock */}
        <div className="hidden md:block">
          <div className="card-surface p-6 space-y-4 max-h-96 overflow-hidden">
            {/* Mock chat messages */}
            <div className="space-y-3">
              {[
                { role: 'user', text: 'Estoy bloqueado con mi proyecto' },
                { role: 'ai', text: '¿Qué es lo más pequeño que podrías hacer en 10 minutos?' },
                { role: 'user', text: 'Abrir el archivo y escribir un párrafo' },
                { role: 'ai', text: 'Eso es. Hazlo ahora. Luego volveremos.' },
              ].map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - 3 Steps */}
      <section className="py-20 px-4 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Cómo funciona</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '1', title: 'Describes cómo te sientes', desc: 'Elige tu estado emocional actual' },
              { num: '2', title: 'La IA detecta tu patrón', desc: 'Bloqueado / Ansioso / Dudoso / Claro' },
              { num: '3', title: 'Recibes un próximo paso', desc: 'Específico, accionable, hoy' },
            ].map((step) => (
              <div key={step.num} className="card-surface p-8 text-center space-y-4">
                <div className="text-4xl font-bold text-indigo-400">{step.num}</div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-zinc-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS - 3 Cards */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Historias reales</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: 'Por fin algo que no me dice qué sentir sino qué hacer.', name: 'Valentina', age: '29' },
              { quote: 'Tres semanas y ya completé mi primer reto.', name: 'Miguel', age: '34' },
              { quote: 'El check-in diario me cambió la rutina.', name: 'Priya', age: '31' },
            ].map((testimonial, i) => (
              <div key={i} className="card-surface p-6 space-y-4">
                <p className="text-zinc-300 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-xs text-zinc-500">{testimonial.age} años</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING - 2 Tiers */}
      <section className="py-20 px-4 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Planes</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Gratuito', features: ['Chat ilimitado', 'Detección de estado', 'Primer reto gratis'] },
              { title: 'Impulso', features: ['Programa 21 días', 'Check-ins diarios', 'Retos personalizados', 'Mensajes futuros'] },
            ].map((plan, i) => (
              <div key={i} className={`card-surface p-8 space-y-6 ${i === 1 ? 'ring-2 ring-indigo-500' : ''}`}>
                <h3 className="text-2xl font-bold">{plan.title}</h3>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-zinc-300">
                      <span className="text-indigo-400">✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/explore" className={i === 0 ? 'btn-secondary' : 'btn-primary'}>
                  {i === 0 ? 'Empezar gratis' : 'Activar Impulso'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
```

### 2.3 Explore Page (/explore) 
**File:** Update `src/app/(public)/explore/page.tsx` with enhanced UI
- Already functional, enhance visual design
- Use EmotionalStateBadge component
- Smooth transitions and animations

### 2.4 Chat App (/app)
**File:** `src/app/app/page.tsx`

3-panel layout:
```tsx
'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Sidebar } from '@/components/Sidebar';
import { Chat } from '@/components/Chat';
import { InsightsPanel } from '@/components/InsightsPanel';

export default function AppPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  return (
    <AppLayout
      title="Luciernaga AI"
      sidebar={<Sidebar onSelectConversation={setActiveConversationId} />}
      main={<Chat conversationId={activeConversationId} />}
      rightPanel={<InsightsPanel />}
    />
  );
}
```

### 2.5 Dashboard Page (/dashboard)
**File:** `src/app/dashboard/page.tsx`

Metrics row (4 cards):
```tsx
<div className="grid md:grid-cols-4 gap-4 mb-8">
  <MetricCard label="Conversaciones" value="12" />
  <MetricCard label="Acciones completadas" value="8/12" type="progress" />
  <MetricCard label="Estado actual" value="Claro" type="badge" />
  <MetricCard label="Racha" value="7 días" icon="🔥" />
</div>
```

### 2.6 Impulso Program (/impulso/*)
**Files:**
- `src/app/impulso/page.tsx` — Main dashboard with tabs
- `src/app/impulso/diagnostico/page.tsx` — Diagnostic flow
- `src/app/impulso/retos/page.tsx` — Challenges list
- `src/app/impulso/checkin/page.tsx` — Daily check-in form
- `src/app/impulso/mensajes/page.tsx` — Future messages

Tab navigation:
```tsx
const tabs = [
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'retos', label: 'Retos' },
  { id: 'insights', label: 'Insights' },
  { id: 'mensajes', label: 'Mensajes Futuros' },
];
```

### 2.7 Check-in Form (/impulso/checkin)
**File:** `src/app/impulso/checkin/page.tsx`

Form sections:
1. **Mood selector** - 3 buttons (Bien/Regular/Mal)
2. **Emotional state** - 6 full-width options
3. **Energy level** - 5-point scale (1-5)
4. **Challenge status** - textarea
5. **Note** - large textarea with char counter

---

## 3. SHARED COMPONENTS CHECKLIST

- [x] EmotionalStateBadge — emotion indicator badge
- [x] StateCard — emotional profile card
- [ ] MetricCard — dashboard metric display
- [ ] ProgressBar — custom progress indicator
- [ ] ChallengCard — challenge item card
- [ ] ConversationItem — sidebar conversation item
- [ ] MessageBubble — chat message bubble
- [ ] InputField — form input wrapper
- [ ] Modal — dialog/sheet for modals

---

## 4. DESIGN TOKENS

### Spacing Scale
```
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
```

### Border Radius
```
sm: 6px
md: 8px
lg: 12px
xl: 20px
```

### Typography
```
Font family: Geist Sans, Inter, system-ui
Headings: font-bold
Body: font-normal
Labels: font-semibold, text-sm
```

### Shadows (subtle, dark-appropriate)
```
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 4px 6px rgba(0,0,0,0.1)
lg: 0 10px 15px rgba(0,0,0,0.1)
glow: shadow-lg shadow-indigo-500/20
```

---

## 5. ANIMATION PATTERNS

### Transitions
```css
transition: all 200ms ease-out;
```

### Hover States
- Buttons: scale(1.02) + opacity(0.9)
- Cards: translate(0, -4px) + shadow-lg
- Links: text-color change + underline

### Loading States
- Spinner: rotating circle
- Skeleton: animated gradient

---

## 6. RESPONSIVE BREAKPOINTS

```
Mobile: base (no prefix)
Tablet: sm: 640px
Desktop: md: 768px
Large: lg: 1024px
XL: xl: 1280px
```

Mobile-first approach:
```tsx
<div className="block md:flex"> {/* block on mobile, flex on md+ */}
```

---

## 7. FORMS & VALIDATION

Input pattern:
```tsx
<input
  type="text"
  placeholder="..."
  className="input-field"
  required
/>
```

Button states:
```tsx
<button
  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={!isComplete}
>
  Enviar
</button>
```

---

## 8. ACCESSIBILITY

- [ ] ARIA labels on all buttons/icons
- [ ] Keyboard navigation (Tab, Enter, Esc)
- [ ] Focus states visible (ring-2 ring-indigo-400)
- [ ] Color contrast ratios met (WCAG AA)
- [ ] Form labels associated with inputs
- [ ] Loading states announced to screen readers

---

## 9. PERFORMANCE CHECKLIST

- [ ] Images optimized (use `next/image`)
- [ ] Components lazy-loaded where appropriate
- [ ] CSS is tree-shaken (unused utility classes removed)
- [ ] No large bundles in root
- [ ] API calls cached/revalidated appropriately

---

## 10. TESTING CHECKLIST

- [ ] All pages responsive (mobile, tablet, desktop)
- [ ] All forms submit correctly
- [ ] All links navigate to correct routes
- [ ] Emotional state colors display correctly
- [ ] Dark mode is the only theme
- [ ] Animations smooth and not jarring
- [ ] No console errors

---

## Implementation Priority

**Phase 1 (MVP):**
1. ✅ Homepage with hero (DONE)
2. Landing page with 2-column hero
3. Explore canvas (improve UI)
4. Chat app basic layout
5. Contact page

**Phase 2 (Features):**
1. Dashboard with metrics
2. Impulso program main page
3. Check-in form
4. Diagnostic flow

**Phase 3 (Polish):**
1. Animations & transitions
2. Loading states
3. Error handling & validation
4. Accessibility audit

---

## Quick Component Template

```tsx
'use client';

import { ReactNode } from 'react';

interface ComponentProps {
  children?: ReactNode;
}

export function Component({ children }: ComponentProps) {
  return (
    <div className="card-surface p-6 space-y-4">
      {children}
    </div>
  );
}
```

---

**Last Updated:** April 2026  
**Status:** Implementation Guide v1.0  
**Next Step:** Build pages following this spec
