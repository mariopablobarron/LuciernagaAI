'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Stethoscope,
  ClipboardList,
  ShieldAlert,
  FileText,
  BookOpen,
  Lock,
  Users,
  AlertTriangle,
} from 'lucide-react';

export default function ParaPsicologasPage() {
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
            Para profesionales de la salud mental y el bienestar
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Tu cliente,{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              entre sesiones
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Tres Mil Millones de Latidos no sustituye tu trabajo. Lo complementa. Un mentor con IA
            que acompaña a tus clientes entre sesiones, dentro de un marco pedagógico revisado
            clínicamente y con un panel profesional para que tú tengas visibilidad real.
          </p>
        </div>
      </section>

      {/* Honestidad primero */}
      <section className="max-w-3xl mx-auto px-4 pb-8">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            Lo que queremos dejar claro antes de empezar
          </div>
          <ul className="space-y-2 text-sm text-zinc-400 leading-relaxed">
            <li>
              <strong className="text-white">No es terapia.</strong> No diagnostica, no prescribe,
              no sustituye la relación clínica. Si un caso necesita intervención, el profesional
              humano es quien lleva el caso.
            </li>
            <li>
              <strong className="text-white">El mentor tiene líneas que no cruza.</strong> Ante
              señales de riesgo, deja de hacer coaching y deriva a recursos de emergencia y ayuda
              profesional.
            </li>
            <li>
              <strong className="text-white">Hay una profesional de la psicología responsable del criterio clínico</strong>{' '}
              que supervisa detección de riesgo, intervenciones y plantillas del mentor.
            </li>
          </ul>
        </div>
      </section>

      {/* Qué obtiene el profesional */}
      <section className="max-w-4xl mx-auto px-4 pb-16 space-y-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Qué te aporta a tu consulta</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: ClipboardList,
                title: 'Panel clínico',
                desc: 'Ves evolución, estado emocional, patrones detectados y acciones completadas de los clientes que te vinculan como profesional de referencia.',
              },
              {
                icon: ShieldAlert,
                title: 'Detección de riesgo temprano',
                desc: 'El sistema monitoriza señales (ideación suicida, autolesión, crisis aguda) y las escala a tu panel antes de que lleguen a tu próxima sesión.',
              },
              {
                icon: FileText,
                title: 'Notas clínicas integradas',
                desc: 'Puedes tomar notas sobre el cliente dentro del panel, asociarlas a momentos concretos, y revisarlas antes de cada sesión.',
              },
              {
                icon: BookOpen,
                title: 'Diario y patrones del cliente',
                desc: 'El cliente trabaja en su diario, check-ins y objetivos entre sesiones. Tú llegas a consulta con un mapa, no con un folio en blanco.',
              },
              {
                icon: Users,
                title: 'Intervenciones supervisadas',
                desc: 'Puedes activar intervenciones específicas (mensajes, pausas, reenfoques del mentor) para tu cliente concreto, siempre bajo tu criterio.',
              },
              {
                icon: Lock,
                title: 'Privacidad y consentimiento',
                desc: 'El cliente decide qué comparte contigo. Tú ves lo que autoriza — no leemos conversaciones sin su consentimiento explícito.',
              },
            ].map((b) => (
              <div
                key={b.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center">
                  <b.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-white font-semibold">{b.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Marco pedagógico */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">El marco que usa el mentor</h2>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8 space-y-4">
            <p className="text-zinc-400 leading-relaxed">
              Cuatro principios hardcoded en los prompts del sistema y vigilados por validadores
              automáticos:
            </p>
            <ul className="space-y-3">
              {[
                ['Interpelar antes que instruir', 'El mentor no dice "tienes que hacer X". Pregunta. Hace visible lo que el cliente no está viendo.'],
                ['Preguntas antes que respuestas', 'Las respuestas cierran. Las preguntas abren.'],
                ['De lo local a lo global', 'Empezamos por el dato concreto del día, no por marcos genéricos.'],
                ['El cambio viene desde dentro', 'No se empuja al cliente — se acompaña al lugar donde pueda verse a sí mismo.'],
              ].map(([t, d]) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  <div>
                    <p className="text-white font-semibold">{t}</p>
                    <p className="text-sm text-zinc-500 leading-relaxed">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-sm text-zinc-500 leading-relaxed pt-2 border-t border-zinc-800">
              El sistema tiene <strong className="text-zinc-300">explícitamente prohibido</strong>{' '}
              usar imperativos huecos, validar sin contexto, felicitar rápido al completar
              objetivos o reforzar dependencia emocional hacia la plataforma. Lee el método completo
              en{' '}
              <Link href="/como-funciona" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                /como-funciona
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Casos de uso */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-fuchsia-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Dónde encaja en tu práctica</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                title: 'Entre sesiones',
                desc: 'Clientes que necesitan contención ordenada fuera de consulta, sin convertirlo en terapia 24/7.',
              },
              {
                title: 'Lista de espera',
                desc: 'Personas que aún no pueden acceder a consulta presencial tienen un primer punto de contacto estructurado.',
              },
              {
                title: 'Casos de baja intensidad',
                desc: 'Personas con bloqueos, dudas o transiciones vitales que no requieren intervención clínica formal.',
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2"
              >
                <p className="text-white font-semibold">{c.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold text-white">¿Quieres explorarlo?</h3>
          <p className="text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Si te dedicas a la psicología, el coaching o el acompañamiento profesional y te interesa probar
            el panel clínico con algún cliente, escríbenos. Revisamos cada colaboración caso por
            caso — no trabajamos con cualquiera.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/contact?motivo=profesional"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/20 text-lg"
            >
              Hablar con el equipo <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/como-funciona"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              Leer el método completo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
