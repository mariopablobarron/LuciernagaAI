"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import TestimonialsSection from "@/components/home/TestimonialsSection";

// IDs estables para steps, planes y mensajes del chat-mock. Copy externalizado a messages.landing.*
const STEPS = ['describe', 'detect', 'next'] as const;
const PLANS = [
  { id: 'free', href: '/signup', featured: false, featureCount: 4 },
  { id: 'impulso', href: '#', featured: true, featureCount: 6 },
] as const;
const MOCK_MESSAGES = [
  { id: 'm1', role: 'user' as const },
  { id: 'm2', role: 'ai' as const },
  { id: 'm3', role: 'user' as const },
  { id: 'm4', role: 'ai' as const },
];

export default function LandingPage() {
  const t = useTranslations('landing');

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* HERO */}
      <section className="relative min-h-[calc(100vh-80px)] grid md:grid-cols-2 gap-12 items-center px-4 py-24 max-w-6xl mx-auto">
        {/* Left */}
        <div className="space-y-8 order-2 md:order-1">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              {t('eyebrow')}
            </p>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              {t('title')}{" "}
              <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                {t('titleHighlight')}
              </span>
            </h1>
          </div>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-lg">
            {t('subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-violet-500 to-fuchsia-500 text-white font-semibold rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25"
            >
              {t('ctaPrimary')} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/unirse"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-zinc-700 text-white font-semibold rounded-xl hover:bg-zinc-900/50 hover:border-zinc-600 transition-colors"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>

        {/* Right: Chat mock */}
        <div className="hidden md:block order-1 md:order-2">
          <div className="card-surface p-6 space-y-4 max-h-96 overflow-hidden relative">
            <div className="absolute inset-0 -z-10 bg-linear-to-br from-violet-500/15 via-transparent to-fuchsia-500/15 blur-2xl" />
            <div className="space-y-3">
              {MOCK_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-xl text-sm ${
                      msg.role === "user"
                        ? "bg-violet-500/20 border border-violet-500/30 text-white"
                        : "bg-zinc-800/50 border border-zinc-700 text-zinc-300"
                    }`}
                  >
                    {t(`chatMock.${msg.id}`)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="py-20 px-4 bg-zinc-900/30 border-y border-zinc-800"
      >
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold text-violet-400 uppercase tracking-wider">
              {t('howEyebrow')}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold">{t('howTitle')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((id, idx) => (
              <div key={id} className="card-surface p-8 text-center space-y-4">
                <div className="text-5xl font-bold bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {idx + 1}
                </div>
                <h3 className="text-xl font-bold">{t(`step.${id}.title`)}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{t(`step.${id}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS + STATS */}
      <TestimonialsSection />

      {/* PRICING */}
      <section className="py-20 px-4 bg-zinc-900/30 border-y border-zinc-800">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold text-violet-400 uppercase tracking-wider">
              {t('plansEyebrow')}
            </p>
            <h2 className="text-4xl font-bold">{t('plansTitle')}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-8 space-y-6 ${
                  plan.featured
                    ? "ring-1 ring-violet-500/60 bg-violet-500/5 border-violet-500/30"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <div>
                  <h3 className="text-2xl font-bold">{t(`plan.${plan.id}.title`)}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{t(`plan.${plan.id}.description`)}</p>
                </div>
                <p className="text-3xl font-bold">{t(`plan.${plan.id}.price`)}</p>
                <ul className="space-y-3">
                  {Array.from({ length: plan.featureCount }).map((_, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="text-violet-400 font-bold">✓</span>
                      {t(`plan.${plan.id}.feature${i + 1}`)}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-center transition-all block text-sm ${
                    plan.featured
                      ? "bg-linear-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400"
                      : "border border-zinc-700 text-white hover:bg-zinc-900 hover:border-zinc-600"
                  }`}
                >
                  {t(`plan.${plan.id}.cta`)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative min-h-96 flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 blur-3xl" />
        </div>
        <div className="max-w-3xl text-center space-y-6">
          <h2 className="text-5xl md:text-6xl font-bold">{t('finalTitle')}</h2>
          <p className="text-lg text-zinc-400">{t('finalSubtitle')}</p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-linear-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all hover:shadow-lg hover:shadow-fuchsia-500/40"
          >
            {t('finalCta')} <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-zinc-600 pt-4">{t('finalDisclaimer')}</p>
        </div>
      </section>

    </div>
  );
}
