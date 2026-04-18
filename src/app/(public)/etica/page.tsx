'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Scale,
  Cpu,
  Lock,
  HeartHandshake,
  ShieldAlert,
  UserCheck,
  Ban,
} from 'lucide-react';

type Section = {
  id: string;
  icon: typeof Scale;
  accent: string;
  bg: string;
  border: string;
  title: string;
  lead: string;
  commits: string[];
  nunca?: string[];
};

const SECTIONS: Section[] = [
  {
    id: 'ia',
    icon: Cpu,
    accent: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    title: 'Sobre la inteligencia artificial',
    lead:
      'La IA es una herramienta, no un terapeuta. Nuestro mentor usa modelos generativos para acompañar, no para diagnosticar ni decidir por ti.',
    commits: [
      'El mentor está construido sobre un marco pedagógico hardcoded. No improvisa: sigue un proceso supervisado.',
      'Hay validadores automáticos que bloquean respuestas que violan nuestros principios (imperativos huecos, validación sin contexto, felicitaciones rápidas).',
      'Cuando la IA se equivoca, corregimos el prompt y lo documentamos en el changelog público.',
      'La decisión final siempre es tuya. El mentor devuelve preguntas, no veredictos.',
    ],
    nunca: [
      'Nunca usaremos tus conversaciones para entrenar modelos de terceros.',
      'Nunca generaremos diagnósticos clínicos ni recomendaciones médicas.',
      'Nunca pretenderemos que el mentor es humano.',
    ],
  },
  {
    id: 'datos',
    icon: Lock,
    accent: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    title: 'Sobre tus datos',
    lead:
      'Lo que escribes en el mentor es íntimo. Lo tratamos con el mismo cuidado que esperaríamos si fuera nuestro.',
    commits: [
      'Tus conversaciones se guardan cifradas y se usan solo para darte continuidad: el mentor recuerda tu contexto para acompañar mejor.',
      'Solo accederíamos a una conversación concreta si tú abres una incidencia de soporte y nos lo pides explícitamente.',
      'Puedes exportar todo lo que tenemos sobre ti desde ajustes. Puedes borrarlo. El borrado es real, no marcado de baja.',
      'Cumplimos RGPD. Servidores en la Unión Europea.',
    ],
    nunca: [
      'Nunca venderemos tus datos.',
      'Nunca los compartiremos con anunciantes ni redes publicitarias.',
      'Nunca los cruzaremos con perfiles comerciales para segmentarte.',
    ],
  },
  {
    id: 'dependencia',
    icon: HeartHandshake,
    accent: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    title: 'Sobre la dependencia emocional',
    lead:
      'El objetivo del mentor es que nos necesites menos, no más. Lo escribimos en código, no solo en el marketing.',
    commits: [
      'El mentor cierra cada conversación dejándote con claridad, no con necesidad de volver.',
      'Si detectamos uso compulsivo (muchas conversaciones largas al día, sin avances), el sistema propone pausa y descanso — no más sesiones.',
      'No usamos patrones de diseño adictivos: sin infinite scroll, sin notificaciones para recuperar atención, sin recompensas variables.',
      'Los recordatorios son contextuales y útiles, no ganchos de retención.',
    ],
    nunca: [
      'Nunca optimizaremos métricas de engagement a costa de tu bienestar.',
      'Nunca añadiremos mecánicas de gamificación diseñadas para que vuelvas por volver.',
      'Nunca diremos "te echo de menos" o similar para forzar reactivación.',
    ],
  },
  {
    id: 'limites-clinicos',
    icon: ShieldAlert,
    accent: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    title: 'Sobre los límites clínicos',
    lead:
      'Hay una línea clara entre acompañamiento y atención profesional. No la cruzamos y vigilamos que no se cruce sola.',
    commits: [
      'Hay una psicóloga colegiada responsable del criterio clínico: revisa detección de riesgo, intervenciones y plantillas del mentor.',
      'Si detectamos señales de riesgo (ideación suicida, autolesión, crisis aguda), el mentor deja de hacer coaching y conecta con recursos de emergencia.',
      'Tenemos protocolo de crisis documentado. La psicóloga responsable firma cada cambio que pueda afectar al criterio clínico.',
      'Somos complemento, no sustituto, de terapia. Si alguien está en tratamiento, el profesional humano lleva el caso.',
    ],
    nunca: [
      'Nunca haremos diagnósticos psicopatológicos.',
      'Nunca prescribiremos medicación ni dosis.',
      'Nunca desaconsejaremos acudir a un profesional humano.',
    ],
  },
  {
    id: 'responsabilidad',
    icon: UserCheck,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    title: 'Sobre nuestra responsabilidad',
    lead:
      'Cuando construyes algo que toca la vida emocional de la gente, la responsabilidad es seria. No la delegamos.',
    commits: [
      'Revisamos conversaciones de forma agregada y anonimizada para mejorar el marco pedagógico.',
      'Documentamos cada cambio relevante en un changelog público que puedes leer.',
      'Si encuentras algo que viola estos principios, escríbenos. Lo corregimos y lo publicamos.',
      'No usamos menores de edad en nuestra plataforma sin consentimiento de responsables legales y mecanismos adicionales de protección.',
    ],
  },
];

export default function EticaPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/8 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Ética y límites
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Lo que{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              nunca haremos
            </span>
            , y lo que sí
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Construimos una herramienta que toca la vida emocional de la gente. Esta página es
            nuestro posicionamiento explícito — IA, datos, dependencia, límites clínicos,
            responsabilidad. Sin letra pequeña.
          </p>
        </div>

        {/* Anchor nav */}
        <div className="max-w-3xl mx-auto px-4 pt-8">
          <div className="flex flex-wrap justify-center gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
              >
                <s.icon className={`w-4 h-4 ${s.accent}`} />
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="max-w-3xl mx-auto px-4 pb-16 space-y-16">
        {SECTIONS.map((s) => (
          <article key={s.id} id={s.id} className="space-y-6 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}
              >
                <s.icon className={`w-5 h-5 ${s.accent}`} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {s.title}
              </h2>
            </div>

            <p className="text-zinc-400 leading-relaxed">{s.lead}</p>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Lo que hacemos
              </p>
              {s.commits.map((c, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
                >
                  <span className={`mt-0.5 font-bold shrink-0 ${s.accent}`}>✓</span>
                  <p className="text-sm text-zinc-400 leading-relaxed">{c}</p>
                </div>
              ))}
            </div>

            {s.nunca && s.nunca.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Lo que nunca haremos
                </p>
                {s.nunca.map((n, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-4"
                  >
                    <Ban className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-400 leading-relaxed">{n}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}

        {/* CTA */}
        <div className="text-center pt-8 border-t border-zinc-800 space-y-4">
          <p className="text-zinc-500 max-w-xl mx-auto leading-relaxed">
            <Scale className="inline w-4 h-4 text-cyan-500 mr-1" />
            Si algo de lo que hacemos no encaja con lo que leíste aquí, es un fallo. Escríbenos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/contact?motivo=etica"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/20 text-lg"
            >
              Reportar un fallo ético <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              Política de privacidad
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
