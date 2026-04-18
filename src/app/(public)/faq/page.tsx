'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, HelpCircle } from 'lucide-react';

type Qa = { q: string; a: string };

const GROUPS: { title: string; items: Qa[] }[] = [
  {
    title: 'Lo básico',
    items: [
      {
        q: '¿Qué es Tres Mil Millones de Latidos?',
        a: 'Un mentor digital con IA que te acompaña para entender qué te pasa y dar el siguiente paso. No es una app de productividad ni un chatbot genérico: hace preguntas para que encuentres tus propias respuestas, en lugar de darte consejos vacíos.',
      },
      {
        q: '¿En qué se diferencia de ChatGPT u otras IAs?',
        a: 'ChatGPT responde lo que le pides. Nosotros trabajamos al revés: interpelamos antes de instruir. El mentor está entrenado en un marco pedagógico concreto — validar la emoción, ordenar el pensamiento, proponer una acción pequeña — y recuerda tu contexto entre conversaciones para acompañarte de verdad.',
      },
      {
        q: '¿Necesito saber de psicología o mindfulness para usarlo?',
        a: 'No. Se usa escribiendo como hablarías con alguien de confianza. El mentor se adapta a lo que traes ese día.',
      },
    ],
  },
  {
    title: 'Cómo funciona',
    items: [
      {
        q: '¿Cuándo me conviene usarlo?',
        a: 'Cuando sientes que algo no va bien pero no sabes nombrarlo, cuando te bloqueas ante una decisión, cuando vuelves a caer en un patrón, o cuando quieres pensar en voz alta sin sentir que molestas a nadie.',
      },
      {
        q: '¿Cuánto tiempo tarda en ayudarme?',
        a: 'Una conversación puede aclararte algo en 10 minutos. Los cambios de fondo llevan más: solemos ver patrones claros a partir de 3-4 semanas de uso regular. No prometemos magia rápida — sí un acompañamiento que suma cada día.',
      },
      {
        q: '¿Hay ejercicios o solo conversación?',
        a: 'Ambos. Además del chat, encuentras ejercicios de respiración, check-ins diarios, diario guiado, trabajo por objetivos y seguimiento de patrones. Lo que elijas depende de tu momento.',
      },
    ],
  },
  {
    title: 'Privacidad y datos',
    items: [
      {
        q: '¿Quién puede leer mis conversaciones?',
        a: 'Nadie las lee por defecto. Se guardan cifradas para que el mentor mantenga contexto. Solo accederíamos a una conversación específica si tú abres una incidencia de soporte y nos pides que lo hagamos.',
      },
      {
        q: '¿Usáis mis datos para entrenar IA o para publicidad?',
        a: 'No. No vendemos datos, no los compartimos con anunciantes y no los usamos para entrenar modelos de terceros. Las conversaciones son tuyas.',
      },
      {
        q: '¿Puedo exportar o borrar todo?',
        a: 'Sí. Desde ajustes puedes descargar un export completo o eliminar tu cuenta. Al eliminarla se borran también las conversaciones y contenidos asociados.',
      },
    ],
  },
  {
    title: 'Precios y cuenta',
    items: [
      {
        q: '¿Es gratis? ¿Hay prueba?',
        a: 'Puedes empezar con el test gratuito y probar el reto de 30 días sin compromiso. Los planes y detalles actualizados están en la página de precios.',
      },
      {
        q: '¿Puedo cancelar cuando quiera?',
        a: 'Sí. No hay permanencia. Cancelas desde tu cuenta y mantienes acceso hasta el final del periodo ya pagado.',
      },
      {
        q: '¿Funciona en móvil?',
        a: 'Sí. Es una app web optimizada: se usa desde el navegador del móvil o del ordenador, sin instalar nada.',
      },
    ],
  },
  {
    title: 'Límites y responsabilidad',
    items: [
      {
        q: '¿Sustituye a un psicólogo o psiquiatra?',
        a: 'No, y nunca pretenderemos que lo haga. Es un acompañamiento complementario. Si hay un trastorno diagnosticado, un tratamiento en curso o una crisis, el profesional humano es quien debe llevar el caso — nosotros podemos apoyar entre sesiones, no reemplazarlas.',
      },
      {
        q: '¿Qué pasa si el mentor detecta que estoy mal?',
        a: 'Si aparece riesgo (ideación suicida, autolesiones, crisis aguda), el mentor deja de hacer coaching y te conecta con recursos de emergencia y ayuda profesional. Esa es una línea que no cruzamos.',
      },
      {
        q: '¿La IA se equivoca?',
        a: 'A veces sí. Por eso el marco pedagógico está diseñado para devolverte preguntas antes que respuestas cerradas: la decisión siempre es tuya. Si algo que te dice el mentor no encaja contigo, dilo — ajusta el rumbo en la misma conversación.',
      },
    ],
  },
];

export default function FaqPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GROUPS.flatMap((g) =>
      g.items.map((it) => ({
        '@type': 'Question',
        name: it.q,
        acceptedAnswer: { '@type': 'Answer', text: it.a },
      })),
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/8 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">Preguntas frecuentes</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Lo que la gente{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              pregunta antes de empezar
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Respuestas directas. Sin marketing. Si no está aquí lo que buscas,{' '}
            <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
              escríbenos
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ groups */}
      <section className="max-w-3xl mx-auto px-4 pb-16 space-y-12">
        {GROUPS.map((group) => (
          <FaqGroup key={group.title} title={group.title} items={group.items} />
        ))}

        {/* CTA */}
        <div className="text-center pt-8 space-y-4">
          <p className="text-zinc-500">
            <HelpCircle className="inline w-4 h-4 text-cyan-500 mr-1" />
            ¿Falta tu pregunta? Mejor que quede respondida.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
            >
              Empezar ahora <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              Hacer una pregunta
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function FaqGroup({ title, items }: { title: string; items: Qa[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="space-y-3">
        {items.map((it, i) => (
          <FaqItem key={i} q={it.q} a={it.a} />
        ))}
      </div>
    </div>
  );
}

function FaqItem({ q, a }: Qa) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 text-left px-5 py-4 hover:bg-zinc-900/70 transition-colors"
        aria-expanded={open}
      >
        <span className="text-white font-semibold">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-zinc-500 shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-zinc-400 leading-relaxed">{a}</div>
      )}
    </div>
  );
}
