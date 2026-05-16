'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Compass,
  Waves,
  GitBranch,
  Search,
  AlertTriangle,
} from 'lucide-react';

// Estructura visual fija con IDs estables. El copy viene de messages/{es,en,pt,fr}.json
// bajo "useCases.case.<id>.{kicker,title,pitch,signal1..4,how1..4,limit}".
const CASOS = [
  {
    id: 'bloqueos',
    icon: Compass,
    accent: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    dot: 'bg-violet-500',
  },
  {
    id: 'ansiedad',
    icon: Waves,
    accent: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-500',
  },
  {
    id: 'transiciones',
    icon: GitBranch,
    accent: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    dot: 'bg-fuchsia-500',
  },
  {
    id: 'autoconocimiento',
    icon: Search,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
] as const;

export default function CasosDeUsoPage() {
  const t = useTranslations('useCases');

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
            {CASOS.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
              >
                <c.icon className={`w-4 h-4 ${c.accent}`} />
                {t(`case.${c.id}.kicker`)}
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
                {t(`case.${c.id}.kicker`)}
              </p>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {t(`case.${c.id}.title`)}
            </h2>
            <p className="text-zinc-400 leading-relaxed">{t(`case.${c.id}.pitch`)}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                <p className="text-white font-semibold">{t('signsLabel')}</p>
                <ul className="space-y-2">
                  {[1, 2, 3, 4].map((n) => (
                    <li
                      key={n}
                      className="flex items-start gap-2 text-sm text-zinc-400 leading-relaxed"
                    >
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                      {t(`case.${c.id}.signal${n}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                <p className="text-white font-semibold">{t('howLabel')}</p>
                <ul className="space-y-2">
                  {[1, 2, 3, 4].map((n) => (
                    <li
                      key={n}
                      className="flex items-start gap-2 text-sm text-zinc-400 leading-relaxed"
                    >
                      <span className={`mt-0.5 font-bold shrink-0 ${c.accent}`}>→</span>
                      {t(`case.${c.id}.how${n}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                <strong className="text-zinc-400">{t('limitStrong')}</strong>{' '}
                {t(`case.${c.id}.limit`)}
              </p>
            </div>

            <div>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/20"
              >
                {t('ctaCaso')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </article>
        ))}

        {/* Footer note */}
        <div className="text-center pt-8 border-t border-zinc-800 space-y-3">
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xl mx-auto">{t('footerNote')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/como-funciona"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              {t('footerCta1')}
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              {t('footerCta2')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
