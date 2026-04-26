'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  HeartHandshake,
  Brain,
  Footprints,
  Eye,
  Target,
  Sparkles,
  Users,
} from 'lucide-react';
import { LastUpdated } from '@/components/seo/LastUpdated';

export default function MetodoPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-fuchsia-500/8 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">El método</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            No damos consejos.{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              Hacemos preguntas
            </span>
            .
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            La mayoría de apps de bienestar intentan darte más información. Nosotros trabajamos
            al revés: te devolvemos la pregunta que no te estás haciendo. Este es el marco que
            usa el mentor en cada conversación.
          </p>
          <div className="pt-2">
            <LastUpdated
              iso="2026-04-15"
              reviewedBy="Revisado por el equipo clínico de Tres Mil Millones de Latidos"
            />
          </div>
        </div>
      </section>

      {/* Pipeline 5 fases */}
      <section className="max-w-4xl mx-auto px-4 pb-16 space-y-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Compass className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Cómo procesa el mentor cada mensaje</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Detrás de cada respuesta hay cinco fases. No es improvisación: es un proceso diseñado
            para que lo que te digamos tenga sentido aquí y ahora.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                n: '01',
                icon: HeartHandshake,
                color: 'text-rose-400',
                bg: 'bg-rose-500/10',
                border: 'border-rose-500/20',
                title: 'Validar la emoción',
                desc: 'Antes de pensar, sentir. Nombramos lo que está pasando dentro sin juicio ni prisa por arreglarlo.',
              },
              {
                n: '02',
                icon: Brain,
                color: 'text-violet-400',
                bg: 'bg-violet-500/10',
                border: 'border-violet-500/20',
                title: 'Ordenar el pensamiento',
                desc: 'Separamos hecho de interpretación. Lo que pasó, lo que te dices sobre lo que pasó, y lo que sientes sobre lo que te dices.',
              },
              {
                n: '03',
                icon: Eye,
                color: 'text-cyan-400',
                bg: 'bg-cyan-500/10',
                border: 'border-cyan-500/20',
                title: 'Interpelar',
                desc: 'La pregunta incómoda que nadie te está haciendo. No para juzgarte — para que veas lo que llevas tiempo esquivando.',
              },
              {
                n: '04',
                icon: Footprints,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20',
                title: 'Proponer acción',
                desc: 'Un paso pequeño, concreto, hoy. No un plan perfecto para la semana que viene. Movimiento real, no intención.',
              },
              {
                n: '05',
                icon: Target,
                color: 'text-fuchsia-400',
                bg: 'bg-fuchsia-500/10',
                border: 'border-fuchsia-500/20',
                title: 'Cerrar sin dependencia',
                desc: 'Terminamos dejándote con más claridad, no con más necesidad de nosotros. El objetivo es que nos necesites menos, no más.',
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <span className="text-xs font-mono text-zinc-600">{s.n}</span>
                </div>
                <p className="text-white font-semibold">{s.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Principios */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-fuchsia-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Los principios que lo sostienen</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                title: 'Interpelar antes de instruir',
                desc: 'Una pregunta bien puesta genera más cambio que la mejor instrucción. El consejo se olvida; la respuesta que descubres tú, no.',
              },
              {
                title: 'Siempre el porqué',
                desc: 'Actuar sin entender por qué es obediencia, no cambio. Si no sabes qué te está moviendo, el cambio no dura.',
              },
              {
                title: 'De lo local a lo global',
                desc: 'Empezamos por lo concreto de hoy — este bloqueo, esta emoción — y desde ahí descubrimos el patrón grande. No al revés.',
              },
              {
                title: 'Gafas nuevas',
                desc: 'Lo que más te frena suele ser lo que has normalizado. Parte del trabajo es hacerte ver lo que ya no ves.',
              },
              {
                title: 'El cambio viene de dentro',
                desc: 'Nadie cambia porque se lo digan. Cambias cuando conectas con tu propio motivo. Nuestro trabajo es acompañar ese proceso, no forzarlo.',
              },
              {
                title: 'Progreso, no perfección',
                desc: 'Un paso imperfecto hoy vale más que un plan perfecto mañana. Mejor movimiento real que intención bonita.',
              },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
              >
                <p className="text-white font-semibold mb-1">{p.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Adaptar el acompañamiento */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-fuchsia-300" />
            </div>
            <h2 className="text-2xl font-bold text-white">Adaptar el acompañamiento a ti</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            El mentor por defecto ya se adapta a tu estado emocional, tu patrón dominante y la fase
            en la que estás. Si quieres ir un paso más allá, hay dos opciones — opcionales — para
            ajustar la experiencia a cómo funcionas tú.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-5 space-y-2">
              <p className="text-base font-bold text-white">Test del Eneagrama</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                90 frases en 10-12 minutos. El mentor ajusta su tono y sus preguntas a tu tipo:
                con un perfeccionista evita el «deberías», con quien tiende a evitar conflicto
                pregunta directo qué quieres tú. No te etiqueta en el chat. Está en tu perfil.
              </p>
              <Link
                href="/profile/eneagrama"
                className="inline-flex items-center gap-1 text-sm text-fuchsia-300 hover:text-fuchsia-200 pt-1"
              >
                Hacer el test <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-2">
              <p className="text-base font-bold text-white">Carta humana del equipo</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Tras unos turnos en el chat aparece un ofrecimiento: si quieres, alguien del equipo
                lee tu hilo y te escribe una nota personal a tu email en los siguientes días. La
                firma una persona real — no la IA. Es opcional y la pides desde el propio chat.
              </p>
            </div>
          </div>
        </div>

        {/* Qué NO hacemos */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-zinc-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Qué no hacemos</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Para que quede claro dónde están los límites del método — y dónde empieza un profesional
            humano.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'No diagnosticamos trastornos. Eso es trabajo clínico.',
              'No prescribimos tratamientos ni medicación.',
              'No sustituimos terapia ni sesiones con tu psicólogo.',
              'No damos frases motivacionales vacías ni recetas mágicas.',
              'No te decimos qué tienes que hacer con tu vida.',
              'No pretendemos que cambies rápido. El cambio real lleva tiempo.',
            ].map((txt, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <span className="mt-0.5 text-zinc-600 font-bold shrink-0">✕</span>
                <p className="text-sm text-zinc-400 leading-relaxed">{txt}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-8 space-y-4">
          <p className="text-zinc-500">
            El método sólo cobra sentido cuando lo vives.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
            >
              Probarlo ahora <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/sobre-nosotros"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              Conocer el proyecto
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
