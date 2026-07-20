'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

// Estructura visual fija (icons + colores) — el contenido viene de i18n.
// Cada sección tiene 4 commits y 0-3 "nunca" (último bloque solo tiene commits).
const SECTIONS = [
  {
    id: 'ia',
    icon: Cpu,
    accent: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    // commit5 = transparencia de inferencia emocional (AI Act art. 50.3).
    commitsCount: 5,
    neverCount: 3,
  },
  {
    id: 'datos',
    icon: Lock,
    accent: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    commitsCount: 4,
    neverCount: 3,
  },
  {
    id: 'dependencia',
    icon: HeartHandshake,
    accent: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    commitsCount: 4,
    neverCount: 3,
  },
  {
    id: 'limitesClinicos',
    icon: ShieldAlert,
    accent: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    commitsCount: 4,
    neverCount: 3,
  },
  {
    id: 'responsabilidad',
    icon: UserCheck,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    commitsCount: 4,
    neverCount: 0,
  },
] as const;

export default function EticaPage() {
  const t = useTranslations('ethics');

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
            {t('eyebrow')}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            {t('title')}{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {t('titleHighlight')}
            </span>
            {t('titleEnd')}
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            {t('subtitle')}
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
                {t(`${s.id}.title`)}
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
                {t(`${s.id}.title`)}
              </h2>
            </div>

            <p className="text-zinc-400 leading-relaxed">{t(`${s.id}.lead`)}</p>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                {t('weDoLabel')}
              </p>
              {Array.from({ length: s.commitsCount }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
                >
                  <span className={`mt-0.5 font-bold shrink-0 ${s.accent}`}>✓</span>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {t(`${s.id}.commit${n}`)}
                  </p>
                </div>
              ))}
            </div>

            {s.neverCount > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  {t('weNeverLabel')}
                </p>
                {Array.from({ length: s.neverCount }, (_, i) => i + 1).map((n) => (
                  <div
                    key={n}
                    className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-4"
                  >
                    <Ban className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {t(`${s.id}.never${n}`)}
                    </p>
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
            {t('ctaNote')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/contact?motivo=etica"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/20 text-lg"
            >
              {t('ctaReport')} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              {t('ctaPrivacy')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
