'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';
import Header from '@/components/home/Header';
import Footer from '@/components/home/Footer';
import HeartbeatParticles from '@/components/effects/HeartbeatParticles';

function ChatMockup() {
  const t = useTranslations('chatMockup');
  const messages = [
    { role: 'user', text: t('msg1User') },
    { role: 'ai', text: t('msg2Ai') },
    { role: 'user', text: t('msg3User') },
    { role: 'ai', text: t('msg4Ai') },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-linear-to-br from-violet-500/20 via-fuchsia-500/15 to-cyan-500/10 rounded-3xl blur-2xl" />
      <div className="relative rounded-2xl border border-zinc-700/60 bg-zinc-900/80 backdrop-blur-sm overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-violet-600/80 text-white rounded-tr-sm'
                  : 'bg-zinc-800 text-zinc-100 border border-zinc-700/50 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="flex items-center gap-1 px-3.5 py-2 bg-zinc-800 rounded-2xl rounded-tl-sm border border-zinc-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/40 rounded-xl px-4 py-2.5">
            <span className="flex-1 text-sm text-zinc-600">{t('placeholder')}</span>
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES_KEYS = ['noJudgment', 'realState', 'concreteAction'] as const;
const FEATURE_ICONS = ['🎯', '⚡', '✓'];
const FEATURE_COLORS = [
  { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
];

export default function LandingPageI18n() {
  const t = useTranslations();
  const locale = useLocale();
  const otherLocale = locale === 'es' ? 'en' : 'es';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <HeartbeatParticles />
      <Header />

      {/* Language switcher — inside header area, not overlapping */}
      <div className="absolute top-5 right-20 md:right-72 z-40">
        <Link
          href={`/${otherLocale}`}
          className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-xs font-medium text-zinc-400 hover:text-white hover:border-violet-500/40 transition-all backdrop-blur-sm"
        >
          {otherLocale === 'en' ? 'EN' : 'ES'}
        </Link>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute top-1/2 right-0 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-cyan-500/8 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-20 md:pb-28">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/40 bg-violet-500/8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <span className="text-xs font-medium text-violet-300">{t('hero.badge')}</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                  {t('hero.title')}{' '}
                  <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                    {t('hero.titleHighlight')}
                  </span>
                </h1>
                <p className="text-lg text-zinc-300 leading-relaxed max-w-lg">
                  {t('hero.subtitle')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/unirse"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25"
                >
                  {t('hero.cta')} <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white transition-all"
                >
                  {t('hero.ctaSecondary')}
                </button>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex -space-x-2.5">
                  {['V', 'M', 'P', 'A', 'L'].map((initial, i) => (
                    <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white border-2 border-zinc-950 text-xs ring-1 ring-zinc-800 ${
                      ['bg-violet-500', 'bg-fuchsia-500', 'bg-violet-600', 'bg-cyan-600', 'bg-cyan-500'][i]
                    }`}>
                      {initial}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm text-zinc-300 font-medium">
                    <span className="text-white font-bold">{t('hero.socialProof')}</span> {t('hero.socialProofText')}
                  </p>
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-amber-400 text-xs">★</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-zinc-500">{t('hero.langNote')}</p>
            </div>

            <div className="hidden md:block">
              <ChatMockup />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 border-t border-zinc-800/60 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">
              {t('features.sectionLabel')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('features.title')}</h2>
            <p className="text-zinc-300 text-lg max-w-xl mx-auto leading-relaxed">{t('features.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES_KEYS.map((key, i) => (
              <div key={key} className={`group p-8 rounded-2xl border bg-zinc-900/40 backdrop-blur-sm hover:bg-zinc-900/70 transition-all ${FEATURE_COLORS[i].border}`}>
                <div className={`w-12 h-12 rounded-xl ${FEATURE_COLORS[i].bg} flex items-center justify-center mb-5 text-xl`}>
                  {FEATURE_ICONS[i]}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t(`features.${key}.title`)}</h3>
                <p className="text-zinc-300 text-base leading-relaxed">{t(`features.${key}.description`)}</p>
                <div className="mt-6 h-0.5 w-0 bg-linear-to-r from-violet-400 to-cyan-400 group-hover:w-full transition-all duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-zinc-900/30 border-y border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-3">{t('howItWorks.sectionLabel')}</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('howItWorks.title')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {(['step1', 'step2', 'step3'] as const).map((step, i) => (
              <div key={step} className="text-center space-y-3">
                <div className="text-4xl font-bold bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  0{i + 1}
                </div>
                <h3 className="text-lg font-bold text-white">{t(`howItWorks.${step}.title`)}</h3>
                <p className="text-zinc-300 text-base leading-relaxed">{t(`howItWorks.${step}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
            {t('finalCta.title1')}
            <br />
            <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              {t('finalCta.title2')}
            </span>
          </h2>
          <p className="text-lg text-zinc-300 leading-relaxed">{t('finalCta.subtitle')}</p>
          <div className="pt-2">
            <Link
              href="/unirse"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
            >
              {t('finalCta.cta')} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-xs text-zinc-500">{t('finalCta.disclaimer')}</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
