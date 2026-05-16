'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  BookOpen,
  Heart,
  Sparkles,
  Newspaper,
  GraduationCap,
  Library,
} from 'lucide-react';

// Estructura visual fija con IDs estables. Copy desde messages.resources.*
const SECCIONES = [
  {
    id: 'empezar',
    icon: GraduationCap,
    accent: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    items: [
      { id: 'metodo', href: '/como-funciona' },
      { id: 'casos', href: '/casos-de-uso' },
      { id: 'guia', href: '/guia' },
      { id: 'faq', href: '/faq' },
    ],
  },
  {
    id: 'herramientas',
    icon: Sparkles,
    accent: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    items: [
      { id: 'calculadora', href: '/calculadora-latidos' },
      { id: 'test', href: '/test' },
      { id: 'reto', href: '/reto' },
    ],
  },
  {
    id: 'leer',
    icon: Newspaper,
    accent: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    items: [
      { id: 'blog', href: '/blog' },
      { id: 'sobre', href: '/sobre-nosotros' },
    ],
  },
  {
    id: 'profesionales',
    icon: Heart,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    items: [
      { id: 'panel', href: '/para-profesionales' },
      { id: 'contacto', href: '/contact?motivo=profesional' },
    ],
  },
] as const;

export default function RecursosPage() {
  const t = useTranslations('resources');

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/8 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            {t('eyebrow')}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            {t('title')}{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              {t('titleHighlight')}
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Anchor nav */}
        <div className="max-w-3xl mx-auto px-4 pt-8">
          <div className="flex flex-wrap justify-center gap-2">
            {SECCIONES.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
              >
                <s.icon className={`w-4 h-4 ${s.accent}`} />
                {t(`section.${s.id}.title`)}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Secciones */}
      <section className="max-w-4xl mx-auto px-4 pb-16 space-y-16">
        {SECCIONES.map((s) => (
          <div key={s.id} id={s.id} className="space-y-6 scroll-mt-24">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}
                >
                  <s.icon className={`w-5 h-5 ${s.accent}`} />
                </div>
                <h2 className="text-2xl font-bold text-white">{t(`section.${s.id}.title`)}</h2>
              </div>
              <p className="text-zinc-500">{t(`section.${s.id}.subtitle`)}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {s.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white font-semibold group-hover:text-white">
                      {t(`item.${it.id}.title`)}
                    </p>
                    <ArrowRight
                      className={`w-4 h-4 ${s.accent} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`}
                    />
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {t(`item.${it.id}.desc`)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* CTA */}
        <div className="text-center pt-8 border-t border-zinc-800 space-y-4">
          <p className="text-zinc-500">
            <BookOpen className="inline w-4 h-4 text-cyan-500 mr-1" />
            {t('footerLine')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
            >
              {t('footerCta')} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
