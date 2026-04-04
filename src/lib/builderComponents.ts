'use client';

import React from 'react';
import type { RegisteredComponent } from '@builder.io/sdk-react';

// ─── HeroSection ─────────────────────────────────────────────────────────────

function HeroSection({
  title = '¿Qué estás evitando ahora mismo?',
  subtitle = 'Luciernaga te ayuda a convertir eso en un siguiente paso claro.',
  ctaText = 'Empieza ahora',
  ctaHref = '/explore',
  secondaryText = 'Ver más',
  secondaryHref = '/landing',
}: {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
}) {
  return React.createElement(
    'section',
    {
      className:
        'flex flex-col items-center justify-center min-h-[60vh] text-center px-6 py-20',
    },
    React.createElement(
      'h1',
      { className: 'text-5xl font-bold tracking-tight mb-4' },
      title,
    ),
    React.createElement(
      'p',
      { className: 'text-xl text-neutral-600 mb-10 max-w-xl' },
      subtitle,
    ),
    React.createElement(
      'div',
      { className: 'flex gap-4 flex-wrap justify-center' },
      React.createElement(
        'a',
        {
          href: ctaHref,
          className:
            'px-8 py-3 rounded-full bg-black text-white hover:opacity-90 transition text-sm',
        },
        ctaText,
      ),
      secondaryText &&
        React.createElement(
          'a',
          {
            href: secondaryHref,
            className:
              'px-8 py-3 rounded-full border text-sm hover:bg-neutral-100 transition',
          },
          secondaryText,
        ),
    ),
  );
}

// ─── FeatureCard ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon = '✨',
  title = 'Funcionalidad clave',
  description = 'Descripción breve de lo que hace esta característica por el usuario.',
}: {
  icon?: string;
  title?: string;
  description?: string;
}) {
  return React.createElement(
    'div',
    {
      className: 'p-6 rounded-2xl border bg-white shadow-sm flex flex-col gap-3',
    },
    React.createElement('div', { className: 'text-3xl' }, icon),
    React.createElement(
      'h3',
      { className: 'text-base font-semibold' },
      title,
    ),
    React.createElement(
      'p',
      { className: 'text-sm text-neutral-600 leading-relaxed' },
      description,
    ),
  );
}

// ─── TestimonialCard ─────────────────────────────────────────────────────────

function TestimonialCard({
  quote = 'Esto cambió mi forma de tomar decisiones cada día.',
  author = 'María López',
  role = 'Diseñadora freelance',
}: {
  quote?: string;
  author?: string;
  role?: string;
}) {
  return React.createElement(
    'figure',
    {
      className:
        'p-6 rounded-2xl border bg-neutral-50 flex flex-col gap-4 max-w-sm',
    },
    React.createElement(
      'blockquote',
      { className: 'text-sm text-neutral-700 italic leading-relaxed' },
      `"${quote}"`,
    ),
    React.createElement(
      'figcaption',
      { className: 'flex flex-col' },
      React.createElement(
        'span',
        { className: 'text-sm font-semibold' },
        author,
      ),
      React.createElement(
        'span',
        { className: 'text-xs text-neutral-500' },
        role,
      ),
    ),
  );
}

// ─── PricingCard ─────────────────────────────────────────────────────────────

function PricingCard({
  planName = 'Pro',
  price = '19',
  period = 'mes',
  features = 'Conversaciones ilimitadas,Check-ins diarios,Historial completo',
  ctaText = 'Empezar gratis',
  ctaHref = '/explore',
  highlighted = false,
}: {
  planName?: string;
  price?: string;
  period?: string;
  features?: string;
  ctaText?: string;
  ctaHref?: string;
  highlighted?: boolean;
}) {
  const featureList = features.split(',').map((f) => f.trim()).filter(Boolean);

  return React.createElement(
    'div',
    {
      className: [
        'p-8 rounded-2xl border flex flex-col gap-6',
        highlighted ? 'bg-black text-white border-black' : 'bg-white',
      ].join(' '),
    },
    React.createElement(
      'div',
      null,
      React.createElement(
        'div',
        {
          className: [
            'text-sm font-medium mb-1',
            highlighted ? 'text-neutral-300' : 'text-neutral-500',
          ].join(' '),
        },
        planName,
      ),
      React.createElement(
        'div',
        { className: 'flex items-end gap-1' },
        React.createElement(
          'span',
          { className: 'text-4xl font-bold' },
          `$${price}`,
        ),
        React.createElement(
          'span',
          {
            className: [
              'text-sm mb-1',
              highlighted ? 'text-neutral-400' : 'text-neutral-500',
            ].join(' '),
          },
          `/${period}`,
        ),
      ),
    ),
    React.createElement(
      'ul',
      { className: 'flex flex-col gap-2 flex-1' },
      ...featureList.map((f) =>
        React.createElement(
          'li',
          { key: f, className: 'text-sm flex items-center gap-2' },
          React.createElement(
            'span',
            { className: highlighted ? 'text-neutral-300' : 'text-neutral-400' },
            '✓',
          ),
          f,
        ),
      ),
    ),
    React.createElement(
      'a',
      {
        href: ctaHref,
        className: [
          'px-6 py-3 rounded-full text-sm text-center transition',
          highlighted
            ? 'bg-white text-black hover:bg-neutral-100'
            : 'bg-black text-white hover:opacity-90',
        ].join(' '),
      },
      ctaText,
    ),
  );
}

// ─── CTASection ──────────────────────────────────────────────────────────────

function CTASection({
  headline = 'Empieza hoy. Sin excusas.',
  subtext = 'Abre tu primera conversación y encuentra el siguiente paso.',
  ctaText = 'Comenzar ahora',
  ctaHref = '/explore',
}: {
  headline?: string;
  subtext?: string;
  ctaText?: string;
  ctaHref?: string;
}) {
  return React.createElement(
    'section',
    {
      className:
        'flex flex-col items-center text-center px-6 py-20 bg-black text-white rounded-3xl',
    },
    React.createElement(
      'h2',
      { className: 'text-4xl font-bold mb-4' },
      headline,
    ),
    React.createElement(
      'p',
      { className: 'text-neutral-400 mb-8 max-w-md' },
      subtext,
    ),
    React.createElement(
      'a',
      {
        href: ctaHref,
        className:
          'px-8 py-3 rounded-full bg-white text-black hover:bg-neutral-100 transition text-sm font-medium',
      },
      ctaText,
    ),
  );
}

// ─── StatsBar ────────────────────────────────────────────────────────────────

function StatsBar({
  stat1Value = '10k+',
  stat1Label = 'Conversaciones',
  stat2Value = '87%',
  stat2Label = 'Encuentran acción clara',
  stat3Value = '4.9',
  stat3Label = 'Satisfacción media',
}: {
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  stat3Value?: string;
  stat3Label?: string;
}) {
  const stats = [
    { value: stat1Value, label: stat1Label },
    { value: stat2Value, label: stat2Label },
    { value: stat3Value, label: stat3Label },
  ];

  return React.createElement(
    'div',
    {
      className:
        'grid grid-cols-3 gap-8 py-10 border-y text-center',
    },
    ...stats.map(({ value, label }) =>
      React.createElement(
        'div',
        { key: label, className: 'flex flex-col gap-1' },
        React.createElement(
          'span',
          { className: 'text-3xl font-bold' },
          value,
        ),
        React.createElement(
          'span',
          { className: 'text-sm text-neutral-500' },
          label,
        ),
      ),
    ),
  );
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const customComponents: RegisteredComponent[] = [
  {
    component: HeroSection,
    name: 'HeroSection',
    image: 'https://cdn.builder.io/api/v1/image/assets%2Fpwgjf0RoYWbdnJSbpBAjXNRMe9F2%2Ffb27a7c790324294af8be1c35fe30f4d',
    description: 'Hero principal con título, subtítulo y CTA',
    inputs: [
      { name: 'title', type: 'text', defaultValue: '¿Qué estás evitando ahora mismo?' },
      { name: 'subtitle', type: 'text', defaultValue: 'Luciernaga te ayuda a convertir eso en un siguiente paso claro.' },
      { name: 'ctaText', type: 'text', defaultValue: 'Empieza ahora' },
      { name: 'ctaHref', type: 'text', defaultValue: '/explore' },
      { name: 'secondaryText', type: 'text', defaultValue: 'Ver más' },
      { name: 'secondaryHref', type: 'text', defaultValue: '/landing' },
    ],
  },
  {
    component: FeatureCard,
    name: 'FeatureCard',
    description: 'Tarjeta de funcionalidad con icono, título y descripción',
    inputs: [
      { name: 'icon', type: 'text', defaultValue: '✨' },
      { name: 'title', type: 'text', defaultValue: 'Funcionalidad clave' },
      { name: 'description', type: 'longText', defaultValue: 'Descripción breve de lo que hace esta característica.' },
    ],
  },
  {
    component: TestimonialCard,
    name: 'TestimonialCard',
    description: 'Testimonio de usuario con cita, autor y rol',
    inputs: [
      { name: 'quote', type: 'longText', defaultValue: 'Esto cambió mi forma de tomar decisiones cada día.' },
      { name: 'author', type: 'text', defaultValue: 'María López' },
      { name: 'role', type: 'text', defaultValue: 'Diseñadora freelance' },
    ],
  },
  {
    component: PricingCard,
    name: 'PricingCard',
    description: 'Tarjeta de precio con plan, precio, features y CTA',
    inputs: [
      { name: 'planName', type: 'text', defaultValue: 'Pro' },
      { name: 'price', type: 'text', defaultValue: '19' },
      { name: 'period', type: 'text', defaultValue: 'mes' },
      { name: 'features', type: 'longText', defaultValue: 'Conversaciones ilimitadas,Check-ins diarios,Historial completo' },
      { name: 'ctaText', type: 'text', defaultValue: 'Empezar gratis' },
      { name: 'ctaHref', type: 'text', defaultValue: '/explore' },
      { name: 'highlighted', type: 'boolean', defaultValue: false },
    ],
  },
  {
    component: CTASection,
    name: 'CTASection',
    description: 'Sección CTA centrada con fondo oscuro',
    inputs: [
      { name: 'headline', type: 'text', defaultValue: 'Empieza hoy. Sin excusas.' },
      { name: 'subtext', type: 'text', defaultValue: 'Abre tu primera conversación y encuentra el siguiente paso.' },
      { name: 'ctaText', type: 'text', defaultValue: 'Comenzar ahora' },
      { name: 'ctaHref', type: 'text', defaultValue: '/explore' },
    ],
  },
  {
    component: StatsBar,
    name: 'StatsBar',
    description: 'Barra de estadísticas con 3 métricas clave',
    inputs: [
      { name: 'stat1Value', type: 'text', defaultValue: '10k+' },
      { name: 'stat1Label', type: 'text', defaultValue: 'Conversaciones' },
      { name: 'stat2Value', type: 'text', defaultValue: '87%' },
      { name: 'stat2Label', type: 'text', defaultValue: 'Encuentran acción clara' },
      { name: 'stat3Value', type: 'text', defaultValue: '4.9' },
      { name: 'stat3Label', type: 'text', defaultValue: 'Satisfacción media' },
    ],
  },
];

// Default export — null component used by the dynamic import in layout.tsx
// to pre-load the Builder component bundle on the client side.
export default function BuilderRegistrations() {
  return null;
}
