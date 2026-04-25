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
        q: '¿Por qué se llama así?',
        a: 'Un corazón humano late en torno a tres mil millones de veces a lo largo de una vida. Cada latido es una elección — la mayoría inconscientes. El proyecto existe para que más latidos tuyos tengan dirección real, no para añadir ruido.',
      },
      {
        q: '¿En qué se diferencia de ChatGPT u otras IAs?',
        a: 'ChatGPT responde lo que le pides. Nosotros trabajamos al revés: interpelamos antes de instruir. El mentor está entrenado en un marco pedagógico concreto — validar la emoción, ordenar el pensamiento, proponer una acción pequeña — y recuerda tu contexto entre conversaciones para acompañarte de verdad.',
      },
      {
        q: '¿Necesito saber de psicología o mindfulness para usarlo?',
        a: 'No. Se usa escribiendo como hablarías con alguien de confianza. El mentor se adapta a lo que traes ese día.',
      },
      {
        q: '¿Puedo usarlo si estoy bien y solo busco claridad?',
        a: 'Sí. No hace falta estar mal para usarlo. Mucha gente lo usa para decidir, ordenar la cabeza antes de algo importante o sostener una racha buena.',
      },
    ],
  },
  {
    title: 'Empezar sin dar datos',
    items: [
      {
        q: '¿Tengo que registrarme para empezar?',
        a: 'No. Entras al chat y empiezas a hablar. No pedimos email, ni nombre, ni tarjeta para probarlo. Esa es nuestra propuesta: que cruzar la puerta no cueste nada.',
      },
      {
        q: '¿Por qué después me pide el email?',
        a: 'Solo cuando hay algo que merece la pena conservar — un objetivo, una acción comprometida, una conversación que valdría volver a leer. El email guarda tu progreso para que no lo pierdas si cierras el navegador. Si no quieres dejarlo, sigues usándolo igual sin guardar.',
      },
      {
        q: '¿Y si entré como anónimo y luego quiero guardar lo conversado?',
        a: 'Sí. En cualquier momento puedes asociar la sesión a un email y todo lo que has hablado queda vinculado a tu cuenta — sin perder nada.',
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
        q: '¿El mentor recuerda lo que le conté?',
        a: 'Sí. Mantiene tu contexto entre sesiones: tus objetivos abiertos, los patrones que detecta, lo que ha funcionado y lo que has evitado. No te hace repetir tu historia cada vez.',
      },
      {
        q: '¿Qué es la carta semanal?',
        a: 'Una vez por semana el mentor te escribe una carta corta sobre lo que ha visto en ti — citando frases textuales tuyas — y termina con una sola pregunta para la semana siguiente. Llega por email si lo activas; si no, queda en la app.',
      },
      {
        q: '¿Hay ejercicios o solo conversación?',
        a: 'Ambos. Además del chat: respiración guiada, check-ins diarios, diario, trabajo por objetivos con acciones pequeñas, un test gratuito de impulso, una calculadora de latidos restantes, y "cápsulas" — cartas que escribes a tu yo del futuro y se entregan en la fecha que tú elijas.',
      },
      {
        q: '¿Hay un plan estructurado o todo es libre?',
        a: 'Las dos cosas. Puedes hablar al ritmo que quieras. O entrar en el reto de 30 días o el Modo Impulso 21 días, que te dan una secuencia clara: un foco, un check-in y una acción concreta cada día.',
      },
    ],
  },
  {
    title: 'Comunidad y círculos',
    items: [
      {
        q: '¿Hay comunidad o solo es individual?',
        a: 'Es individual al entrar — solo tú y el mentor. Cuando quieras, puedes formar parte de un círculo: un grupo cerrado de cuatro personas que comparten un mismo patrón emocional reciente. No reemplaza al mentor, lo complementa con espejo de pares.',
      },
      {
        q: '¿Cómo entro en un círculo?',
        a: 'No hay listado para apuntarte. Te asignamos un círculo automáticamente cuando hay match con tu estado actual. El emparejamiento es por afinidad de patrón, no por edad ni demografía, y respeta tu anonimato dentro del grupo.',
      },
      {
        q: '¿Qué pasa dentro del círculo?',
        a: 'Cada semana se abre un "pulso": una pregunta. Cada miembro responde cuando quiera durante 7 días — anónimamente. Al cerrarse, el mentor te deja una devolución privada que recoge lo que del grupo te toca a ti. Los ciclos duran seis semanas y al final recibes una carta de cierre archivada para siempre.',
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
        q: '¿Y dentro del círculo, los demás saben quién soy?',
        a: 'No. Las respuestas en el círculo son anónimas para los demás miembros — no se ve tu nombre, ni tu email, ni tu foto. Solo el contenido de lo que escribes.',
      },
      {
        q: '¿Usáis mis datos para entrenar IA o para publicidad?',
        a: 'No. No vendemos datos, no los compartimos con anunciantes y no los usamos para entrenar modelos de terceros. Las conversaciones son tuyas.',
      },
      {
        q: '¿Puedo exportar o borrar todo?',
        a: 'Sí. Desde ajustes puedes descargar un export completo (GDPR art. 15) o eliminar tu cuenta. Al eliminarla se borran también las conversaciones y contenidos asociados.',
      },
    ],
  },
  {
    title: 'Precios y cuenta',
    items: [
      {
        q: '¿Es gratis? ¿Hay prueba?',
        a: 'Puedes entrar a probarlo sin registrarte. El test gratuito y el reto de 30 días tampoco requieren pago. Los planes y detalles actualizados están en la página de precios.',
      },
      {
        q: '¿Qué incluye el plan Pro?',
        a: 'Conversaciones ilimitadas, Modo Impulso 21 días con seguimiento, retos personalizados según tu patrón, acceso a círculos y carta semanal por email. Precio actualizado en /precios.',
      },
      {
        q: '¿Puedo cancelar cuando quiera?',
        a: 'Sí. No hay permanencia. Cancelas desde tu cuenta y mantienes acceso hasta el final del periodo ya pagado.',
      },
      {
        q: '¿Y si quiero hacer una pausa sin perder lo trabajado?',
        a: 'Tu cuenta y tus conversaciones se conservan aunque no entres durante semanas. Vuelves cuando quieras y el mentor sigue donde lo dejasteis.',
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
        a: 'Si aparece riesgo (ideación suicida, autolesiones, crisis aguda), el mentor deja de hacer coaching y te conecta con los recursos de emergencia (en España, 024 y 112). Esa es una línea que no cruzamos.',
      },
      {
        q: '¿Puedo dejar a alguien de confianza para situaciones extremas?',
        a: 'Sí. En ajustes puedes registrar un contacto de confianza. Si entras en una crisis sostenida, el sistema puede avisarle — solo en escenarios definidos por ti, nunca por defecto.',
      },
      {
        q: '¿La IA se equivoca?',
        a: 'A veces sí. Por eso el marco pedagógico está diseñado para devolverte preguntas antes que respuestas cerradas: la decisión siempre es tuya. Si algo que te dice el mentor no encaja contigo, dilo — ajusta el rumbo en la misma conversación.',
      },
    ],
  },
  {
    title: 'El proyecto',
    items: [
      {
        q: '¿Quién está detrás?',
        a: 'Lo construye Startidea, un equipo pequeño en España comprometido con el bienestar emocional a través de la tecnología. Más en la página "Sobre nosotros".',
      },
      {
        q: '¿En qué idiomas está disponible?',
        a: 'Español de forma nativa. Hay una versión en inglés en desarrollo accesible desde el selector EN del menú; el español es donde se afinaron primero el tono y el marco pedagógico.',
      },
      {
        q: '¿Hay versión para profesionales o equipos?',
        a: 'Sí. Trabajamos con organizaciones y profesionales de salud mental. Más detalles en /para-profesionales.',
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
          <p className="text-base font-semibold uppercase tracking-widest text-violet-400">Preguntas frecuentes</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Lo que la gente{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              pregunta antes de empezar
            </span>
          </h1>
          <p className="text-xl text-zinc-300 leading-relaxed max-w-2xl mx-auto">
            Esta página resuelve tus dudas para que decidas si Tres Mil Millones de Latidos encaja contigo.
            Respuestas directas, sin marketing.
          </p>
          <p className="text-base text-zinc-400">
            Si no está aquí lo que buscas,{' '}
            <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-semibold">
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
        <div className="text-center pt-12 space-y-5 border-t border-zinc-800/60">
          <div className="pt-8 space-y-2">
            <p className="text-2xl font-bold text-white">
              ¿Listo para probarlo?
            </p>
            <p className="text-base text-zinc-400 max-w-md mx-auto">
              Empiezas sin dar datos. El email se pide solo cuando hay algo que merezca la pena guardar.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
            >
              Empezar ahora — gratis <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-base text-zinc-500 pt-4">
            <HelpCircle className="inline w-4 h-4 text-cyan-500 mr-1" />
            ¿Tu pregunta no está aquí?{' '}
            <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-semibold">
              Cuéntanosla
            </Link>{' '}
            y la añadimos.
          </p>
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
