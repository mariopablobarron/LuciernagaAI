'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

// Estructura visual fija. Copy desde "professionals.*" en messages.
const BENEFITS = [
  { id: 'panel', icon: ClipboardList },
  { id: 'risk', icon: ShieldAlert },
  { id: 'notes', icon: FileText },
  { id: 'diary', icon: BookOpen },
  { id: 'interventions', icon: Users },
  { id: 'privacy', icon: Lock },
] as const;

const PRINCIPLES = [1, 2, 3, 4] as const;
const USE_CASES = [1, 2, 3] as const;

export default function ParaPsicologasPage() {
  const t = useTranslations('professionals');

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
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Honestidad primero */}
      <section className="max-w-3xl mx-auto px-4 pb-8">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            {t('honestyTitle')}
          </div>
          <ul className="space-y-2 text-sm text-zinc-400 leading-relaxed">
            {[1, 2, 3].map((n) => (
              <li key={n}>
                <strong className="text-white">{t(`honesty${n}Strong`)}</strong>{' '}
                {t(`honesty${n}`)}
              </li>
            ))}
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
            <h2 className="text-2xl font-bold text-white">{t('benefitsTitle')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center">
                  <b.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-white font-semibold">{t(`benefit.${b.id}.title`)}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{t(`benefit.${b.id}.desc`)}</p>
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
            <h2 className="text-2xl font-bold text-white">{t('frameworkTitle')}</h2>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8 space-y-4">
            <p className="text-zinc-400 leading-relaxed">{t('frameworkIntro')}</p>
            <ul className="space-y-3">
              {PRINCIPLES.map((n) => (
                <li key={n} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  <div>
                    <p className="text-white font-semibold">{t(`principle${n}Title`)}</p>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {t(`principle${n}Desc`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-sm text-zinc-500 leading-relaxed pt-2 border-t border-zinc-800">
              {t('frameworkProhibitedPre')}{' '}
              <strong className="text-zinc-300">{t('frameworkProhibitedStrong')}</strong>{' '}
              {t('frameworkProhibitedCont')}{' '}
              <Link
                href="/como-funciona"
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                {t('frameworkLinkText')}
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
            <h2 className="text-2xl font-bold text-white">{t('useCasesTitle')}</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {USE_CASES.map((n) => (
              <div
                key={n}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2"
              >
                <p className="text-white font-semibold">{t(`useCase${n}.title`)}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{t(`useCase${n}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold text-white">{t('ctaTitle')}</h3>
          <p className="text-zinc-400 leading-relaxed max-w-2xl mx-auto">{t('ctaDesc')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/contact?motivo=profesional"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/20 text-lg"
            >
              {t('ctaPrimary')} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/como-funciona"
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
