'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  Waves,
  GitBranch,
  Search,
  AlertTriangle,
} from 'lucide-react';

type Caso = {
  id: string;
  icon: typeof Compass;
  accent: string;
  bg: string;
  border: string;
  kicker: string;
  title: string;
  pitch: string;
  senales: string[];
  como: string[];
  limite: string;
};

const CASOS: Caso[] = [
  {
    id: 'bloqueos',
    icon: Compass,
    accent: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    kicker: 'Bloqueos y decisiones',
    title: 'Sabes que algo tiene que cambiar, pero no arrancas',
    pitch:
      'Le das vueltas a lo mismo sin avanzar. Tienes claro que no quieres seguir como estás, pero cada vez que te pones a decidir aparece otra duda. No es falta de información — es otra cosa.',
    senales: [
      'Pospones decisiones importantes "hasta tenerlo claro"',
      'Consumes contenido sobre el tema pero no actúas',
      'Sientes que si te equivocas no podrás arreglarlo',
      'La gente de tu alrededor ya te ha dado consejo — no te sirve',
    ],
    como: [
      'El mentor separa hecho de interpretación para que veas qué es miedo y qué es criterio',
      'Devuelve preguntas incómodas que tú mismo te estás esquivando',
      'Propone el paso más pequeño posible hoy — no el plan perfecto',
      'Revisa contigo los patrones cuando la decisión vuelve una y otra vez',
    ],
    limite:
      'Si el bloqueo viene acompañado de síntomas depresivos sostenidos o ansiedad incapacitante, complementa con un profesional humano.',
  },
  {
    id: 'ansiedad',
    icon: Waves,
    accent: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    kicker: 'Ansiedad cotidiana',
    title: 'Vas acelerado por dentro aunque por fuera funcione todo',
    pitch:
      'No es un trastorno diagnosticado. Es ese nudo que te acompaña al despertar, la cabeza que no para, la sensación de que siempre vas detrás. Quieres entenderlo antes de que escale.',
    senales: [
      'Te cuesta desconectar incluso cuando no hay nada urgente',
      'Revisas mentalmente lo que podría salir mal antes de dormir',
      'Te enfadas con cosas pequeñas y luego te sientes culpable',
      'Tu cuerpo avisa (tensión, insomnio, digestiones) y tú lo ignoras',
    ],
    como: [
      'Check-ins diarios que te obligan a nombrar lo que sientes antes de actuar',
      'Ejercicios de respiración guiados para bajar el pico en el momento',
      'El mentor identifica patrones entre lo que piensas y lo que te pasa en el cuerpo',
      'Diario guiado para separar la amenaza real de la imaginada',
    ],
    limite:
      'Si tienes ataques de pánico, evitaciones importantes o la ansiedad interfiere con tu vida diaria, esto no sustituye una valoración clínica.',
  },
  {
    id: 'transiciones',
    icon: GitBranch,
    accent: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    kicker: 'Transiciones vitales',
    title: 'Estás en un "entre". Lo viejo ya no, lo nuevo todavía no',
    pitch:
      'Cambio de trabajo, ruptura, mudanza, fin de una etapa, inicio de otra. No es crisis: es el terreno incómodo entre dos versiones de ti. Necesitas ordenar lo que sueltas y elegir lo que construyes.',
    senales: [
      'Te cuesta explicar a otros cómo estás sin sonar dramático',
      'A ratos estás bien y a ratos te invade la nostalgia o la incertidumbre',
      'Tienes decisiones grandes que tomar y no sabes desde dónde',
      'Te preguntas "¿quién soy ahora?" más de lo habitual',
    ],
    como: [
      'Trabajo por objetivos para aterrizar la dirección en acciones concretas',
      'El mentor te ayuda a nombrar lo que terminó antes de forzar lo siguiente',
      'Seguimiento de patrones emocionales para ver la curva, no solo el día',
      'Recordatorios contextuales para volver a ti cuando te pierdes en el ruido',
    ],
    limite:
      'Si la transición incluye duelo por pérdida reciente o ruptura traumática, este acompañamiento complementa pero no sustituye terapia específica.',
  },
  {
    id: 'autoconocimiento',
    icon: Search,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    kicker: 'Autoconocimiento',
    title: 'No estás mal. Quieres verte con más honestidad',
    pitch:
      'No hay una crisis. Hay curiosidad. Quieres entender por qué reaccionas como reaccionas, qué patrones se repiten en tus relaciones, qué valores estás viviendo y cuáles dejaste de lado. Ver las gafas con las que miras.',
    senales: [
      'Tienes tiempo y energía, pero sientes que podrías vivir más despierto',
      'Notas patrones repetidos pero no sabes exactamente cuáles son',
      'Quieres escribir/reflexionar regularmente pero no sostienes el hábito solo',
      'Te interesa el cómo funcionas, no solo el qué hacer',
    ],
    como: [
      'Diario guiado con preguntas que no te harías tú solo',
      'Sistema de patrones que te devuelve lo que no estás viendo',
      'Conversaciones de fondo sobre valores, decisiones, relaciones',
      'Sin prisa por "arreglar" nada — ritmo tuyo',
    ],
    limite:
      'Este caso no tiene contraindicaciones particulares más allá de los límites generales: el mentor acompaña, no diagnostica.',
  },
];

export default function CasosDeUsoPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/8 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">Casos de uso</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Depende de{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              lo que traigas
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            El mentor no es la misma cosa para todo el mundo. Cuatro formas reales en las que la
            gente lo está usando. Mira la que más se parezca a tu momento.
          </p>
        </div>

        {/* Anchor nav */}
        <div className="max-w-3xl mx-auto px-4 pt-8">
          <div className="flex flex-wrap justify-center gap-2">
            {CASOS.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
              >
                <c.icon className={`w-4 h-4 ${c.accent}`} />
                {c.kicker}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Casos */}
      <section className="max-w-3xl mx-auto px-4 pb-16 space-y-16">
        {CASOS.map((c) => (
          <article key={c.id} id={c.id} className="space-y-6 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}
              >
                <c.icon className={`w-5 h-5 ${c.accent}`} />
              </div>
              <p className={`text-sm font-semibold uppercase tracking-widest ${c.accent}`}>
                {c.kicker}
              </p>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{c.title}</h2>
            <p className="text-zinc-400 leading-relaxed">{c.pitch}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                <p className="text-white font-semibold">Te reconocerás si…</p>
                <ul className="space-y-2">
                  {c.senales.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-zinc-400 leading-relaxed">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${c.bg.replace('/10', '')}`} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                <p className="text-white font-semibold">Qué encontrarás aquí</p>
                <ul className="space-y-2">
                  {c.como.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-zinc-400 leading-relaxed">
                      <span className={`mt-0.5 font-bold shrink-0 ${c.accent}`}>→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                <strong className="text-zinc-400">Dónde está el límite.</strong> {c.limite}
              </p>
            </div>

            <div>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/20"
              >
                Empezar con esto <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </article>
        ))}

        {/* Footer note */}
        <div className="text-center pt-8 border-t border-zinc-800 space-y-3">
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xl mx-auto">
            Si no te reconoces en ninguno — o te reconoces en varios — no pasa nada. El mentor se
            adapta a lo que traes el día que entras. Estos son solo ejemplos, no etiquetas.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/como-funciona"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              Leer el método
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              Preguntas frecuentes
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
