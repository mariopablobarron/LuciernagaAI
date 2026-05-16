'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Heart, Sparkles, Globe, Shield, User } from 'lucide-react';

const PRINCIPLES = [
  'interpelar',
  'porque',
  'gafas',
  'localGlobal',
  'inside',
  'progress',
] as const;

const COMMITMENT_KEYS = ['commitment1', 'commitment2', 'commitment3', 'commitment4'] as const;

export default function SobreNosotrosPage() {
  const t = useTranslations('about');

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
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Origin story */}
      <section className="max-w-3xl mx-auto px-4 pb-16 space-y-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('questionTitle')}</h2>
          </div>
          <div className="space-y-4 text-zinc-400 leading-relaxed">
            <p>{t('questionP1')}</p>
            <p>{t('questionP2')}</p>
            <p>
              <strong className="text-white">{t('questionP3Pre')}</strong> {t('questionP3')}
            </p>
          </div>
        </div>

        {/* Philosophy */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('philosophyTitle')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {PRINCIPLES.map((key) => (
              <div
                key={key}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-2"
              >
                <p className="text-sm font-semibold text-white">{t(`philosophy.${key}.title`)}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {t(`philosophy.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Startidea */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-fuchsia-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('behindTitle')}</h2>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <p className="text-lg font-bold text-white">{t('startidea.name')}</p>
                <p className="text-sm text-zinc-500">{t('startidea.tagline')}</p>
              </div>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              {t('startidea.p1Pre')}{' '}
              <a
                href="https://startidea.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                Startidea
              </a>
              {t('startidea.p1')}
            </p>
            <p className="text-zinc-400 leading-relaxed">
              {t('startidea.p2Pre')}{' '}
              <strong className="text-white">{t('startidea.p2Strong')}</strong>
            </p>
            <p className="text-zinc-400 leading-relaxed">{t('startidea.p3')}</p>
          </div>
        </div>

        {/* Founder */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('founderTitle')}</h2>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                <p className="text-lg font-bold text-white">{t('founder.name')}</p>
                <p className="text-sm text-zinc-500">{t('founder.role')}</p>
              </div>
            </div>
            <p className="text-zinc-400 leading-relaxed">{t('founder.p1')}</p>
            <p className="text-zinc-400 leading-relaxed">{t('founder.p2')}</p>
            <p className="text-zinc-400 leading-relaxed">
              <strong className="text-white">{t('founder.p3Strong')}</strong> {t('founder.p3')}
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('commitmentsTitle')}</h2>
          </div>
          <div className="space-y-3">
            {COMMITMENT_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
              >
                <span className="mt-0.5 text-emerald-400 font-bold text-sm shrink-0">✓</span>
                <p className="text-sm text-zinc-400 leading-relaxed">{t(key)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-8 space-y-4">
          <p className="text-zinc-500">
            <Heart className="inline w-4 h-4 text-cyan-500 mr-1" />
            {t('ctaNote')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
            >
              {t('ctaPrimary')} <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="https://startidea.es"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
            >
              {t('ctaSecondary')} <Globe className="w-4 h-4" />
            </a>
          </div>
          <p className="pt-6 text-sm text-zinc-500">
            {t('profNote')}{' '}
            <Link
              href="/para-profesionales"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
            >
              {t('profLink')}
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
