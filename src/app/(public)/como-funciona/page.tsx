'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

// Estructura visual fija (icons + colores + numeración). El copy viene de
// messages/{es,en,pt,fr}.json bajo "howTo.phase.<id>" y "howTo.principle.<id>".
const PHASES = [
  { id: 'validar', n: '01', icon: HeartHandshake, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { id: 'ordenar', n: '02', icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { id: 'interpelar', n: '03', icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { id: 'actuar', n: '04', icon: Footprints, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'cerrar', n: '05', icon: Target, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
] as const;

const PRINCIPLES = ['interpelar', 'porque', 'localGlobal', 'gafas', 'inside', 'progress'] as const;

const NOT_DO_KEYS = ['notDo1', 'notDo2', 'notDo3', 'notDo4', 'notDo5', 'notDo6'] as const;

export default function MetodoPage() {
  const t = useTranslations('howTo');

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-fuchsia-500/8 blur-3xl" />
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
            {t('titleEnd')}
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          <div className="pt-2">
            <LastUpdated iso="2026-04-15" reviewedBy={t('lastReviewed')} />
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
            <h2 className="text-2xl font-bold text-white">{t('pipelineTitle')}</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed">{t('pipelineSubtitle')}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {PHASES.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <span className="text-xs font-mono text-zinc-600">{s.n}</span>
                </div>
                <p className="text-white font-semibold">{t(`phase.${s.id}.title`)}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{t(`phase.${s.id}.desc`)}</p>
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
            <h2 className="text-2xl font-bold text-white">{t('principlesTitle')}</h2>
          </div>
          <div className="space-y-3">
            {PRINCIPLES.map((id) => (
              <div
                key={id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
              >
                <p className="text-white font-semibold mb-1">{t(`principle.${id}.title`)}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{t(`principle.${id}.desc`)}</p>
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
            <h2 className="text-2xl font-bold text-white">{t('adaptTitle')}</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed">{t('adaptSubtitle')}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-5 space-y-2">
              <p className="text-base font-bold text-white">{t('enneagram.title')}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{t('enneagram.desc')}</p>
              <Link
                href="/profile/eneagrama"
                className="inline-flex items-center gap-1 text-sm text-fuchsia-300 hover:text-fuchsia-200 pt-1"
              >
                {t('enneagram.cta')} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-2">
              <p className="text-base font-bold text-white">{t('teamLetter.title')}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{t('teamLetter.desc')}</p>
            </div>
          </div>
        </div>

        {/* Qué NO hacemos */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-zinc-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('notDoTitle')}</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed">{t('notDoSubtitle')}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {NOT_DO_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <span className="mt-0.5 text-zinc-600 font-bold shrink-0">✕</span>
                <p className="text-sm text-zinc-400 leading-relaxed">{t(key)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-8 space-y-4">
          <p className="text-zinc-500">{t('ctaNote')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
            >
              {t('ctaPrimary')} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/sobre-nosotros"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
