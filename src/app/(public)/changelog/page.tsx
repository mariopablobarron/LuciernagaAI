'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Wrench, Shield, Heart } from 'lucide-react';

type Kind = 'nuevo' | 'mejora' | 'seguridad' | 'cuidado';

type Entry = {
  date: string; // YYYY-MM-DD
  kind: Kind;
  title: string;
  body: string;
};

const ENTRIES: Entry[] = [
  {
    date: '2026-04-18',
    kind: 'cuidado',
    title: 'Página de ayuda urgente',
    body:
      'Incorporamos dentro de la app una página con los recursos oficiales de emergencia en España (112, 024, Teléfono de la Esperanza, ANAR, 016) y una guía corta para esos minutos críticos en los que alguien está esperando a que le atiendan. No sustituye a ningún servicio — hace más fácil llegar a ellos.',
  },
  {
    date: '2026-04-15',
    kind: 'nuevo',
    title: 'Programa de referidos',
    body:
      'Ya puedes invitar a alguien a quien crees que esto le vendría bien, y compartir con esa persona el acompañamiento. Las métricas quedan visibles en tu perfil. No es un sistema de afiliación pagada: es una forma de que lo que te funciona llegue a quien tú eliges.',
  },
  {
    date: '2026-04-14',
    kind: 'seguridad',
    title: 'Rate limiting en recuperación de contraseña',
    body:
      'Añadimos límites de intento a los endpoints de recuperación de contraseña y reenvío de verificación. Protege a los usuarios frente a ataques de fuerza bruta y hace más ruido cuando alguien intenta suplantar.',
  },
  {
    date: '2026-04-10',
    kind: 'mejora',
    title: 'Panel clínico: notas y seguimientos',
    body:
      'La psicóloga responsable ya puede tomar notas clínicas dentro del panel, marcar seguimientos pendientes y ver cuándo una nota se resuelve automáticamente por evolución del caso. Mejor trazabilidad para el trabajo de fondo.',
  },
];

const KIND_LABEL: Record<Kind, string> = {
  nuevo: 'Nuevo',
  mejora: 'Mejora',
  seguridad: 'Seguridad',
  cuidado: 'Cuidado',
};

const KIND_STYLE: Record<
  Kind,
  { icon: typeof Sparkles; text: string; bg: string; border: string }
> = {
  nuevo: {
    icon: Sparkles,
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
  },
  mejora: {
    icon: Wrench,
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  seguridad: {
    icon: Shield,
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  cuidado: {
    icon: Heart,
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
};

const DATE_FORMAT = new Intl.DateTimeFormat('es-ES', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function ChangelogPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/8 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">Novedades</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Qué{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              está cambiando
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Cada cambio explicado sin marketing. Lo que es nuevo, lo que hemos mejorado, lo que
            hemos reforzado en seguridad, y lo que hemos ajustado por cuidado del usuario.
          </p>
        </div>
      </section>

      {/* Entries */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="space-y-8">
          {ENTRIES.map((e, i) => {
            const style = KIND_STYLE[e.kind];
            const Icon = style.icon;
            const d = new Date(e.date);
            return (
              <article
                key={`${e.date}-${i}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full ${style.bg} border ${style.border} px-3 py-1 text-xs font-semibold ${style.text}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {KIND_LABEL[e.kind]}
                  </div>
                  <time
                    dateTime={e.date}
                    className="text-xs text-zinc-500"
                  >
                    {DATE_FORMAT.format(d)}
                  </time>
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">{e.title}</h2>
                <p className="text-zinc-400 leading-relaxed">{e.body}</p>
              </article>
            );
          })}
        </div>

        {/* Suggestion */}
        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 text-center space-y-3">
          <p className="text-white font-semibold">¿Echas en falta algo?</p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Si hay algo que te haría la vida más fácil, cuéntanoslo. No prometemos construirlo todo,
            pero leemos cada sugerencia.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/20"
            >
              Enviar sugerencia <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
