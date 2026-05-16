'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight, MessageCircle, Target, Brain, Flame, BookOpen,
  BarChart3, Shield, Download, Bell, Sparkles, ChevronRight,
  Heart, CheckCircle2, Map, PenLine, Users, Wind,
} from 'lucide-react';

// Estructura visual fija. Copy desde messages.guide.*  (title/subtitle/step/feature)
// Cada sección puede ser de tipo 'steps' (lista numerada) o 'features' (grid).
type GuideSection = {
  id: string;
  icon: typeof Sparkles;
  color: string;
  bg: string;
  border: string;
  variant: 'steps' | 'features';
  count: number;
  // Para sección con link en algún step concreto:
  stepLinks?: Record<number, { href: string }>;
  // Para features: iconos por índice.
  featureIcons?: typeof Sparkles[];
};

const SECTIONS: GuideSection[] = [
  {
    id: 'start',
    icon: Sparkles,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    variant: 'steps',
    count: 4,
    stepLinks: { 0: { href: '/app' } },
  },
  {
    id: 'chat',
    icon: MessageCircle,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    variant: 'features',
    count: 4,
    featureIcons: [Brain, Target, Sparkles, BookOpen],
  },
  {
    id: 'checkin',
    icon: Heart,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    variant: 'steps',
    count: 4,
  },
  {
    id: 'diario',
    icon: PenLine,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    variant: 'features',
    count: 3,
    featureIcons: [PenLine, Heart, Target],
  },
  {
    id: 'metas',
    icon: Target,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    variant: 'features',
    count: 4,
    featureIcons: [Target, CheckCircle2, Flame, BarChart3],
  },
  {
    id: 'respirar',
    icon: Wind,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    variant: 'features',
    count: 2,
    featureIcons: [Wind, Heart],
  },
  {
    id: 'comunidad',
    icon: Users,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    variant: 'features',
    count: 3,
    featureIcons: [Users, Heart, Target],
  },
  {
    id: 'journeys',
    icon: Map,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    variant: 'steps',
    count: 4,
  },
  {
    id: 'settings',
    icon: Bell,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    variant: 'features',
    count: 4,
    featureIcons: [Sparkles, Bell, Download, Shield],
  },
];

const FAQ_KEYS = ['psicologo', 'datos', 'planes', 'telegram', 'impulso', 'precio'] as const;

export default function GuiaPage() {
  const t = useTranslations('guide');

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold">
            {t('title')}{' '}
            <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              {t('titleHighlight')}
            </span>
          </h1>
          <p className="text-lg text-zinc-300 leading-relaxed max-w-xl mx-auto">
            {t('subtitle')}
          </p>

          {/* Quick nav */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-white hover:border-violet-500/40 transition-all"
              >
                {t(`section.${s.id}.shortLabel`)}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-4 pb-20 space-y-16">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-11 h-11 rounded-xl ${section.bg} border ${section.border} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${section.color}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{t(`section.${section.id}.title`)}</h2>
                  <p className="text-sm text-zinc-400 mt-1">{t(`section.${section.id}.subtitle`)}</p>
                </div>
              </div>

              {/* Steps variant */}
              {section.variant === 'steps' && (
                <div className="space-y-3 ml-14">
                  {Array.from({ length: section.count }).map((_, i) => {
                    const link = section.stepLinks?.[i];
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-zinc-400">{i + 1}</span>
                        </span>
                        <div>
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            {t(`section.${section.id}.step${i + 1}`)}
                          </p>
                          {link && (
                            <Link
                              href={link.href}
                              className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-violet-400 hover:text-violet-300"
                            >
                              {t(`section.${section.id}.step${i + 1}LinkText`)}{' '}
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Features variant */}
              {section.variant === 'features' && section.featureIcons && (
                <div className="grid sm:grid-cols-2 gap-3 ml-14">
                  {section.featureIcons.map((FIcon, i) => (
                    <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FIcon className={`w-4 h-4 ${section.color}`} />
                        <p className="text-sm font-semibold text-white">
                          {t(`section.${section.id}.feature${i + 1}.label`)}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {t(`section.${section.id}.feature${i + 1}.desc`)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-white mb-6">{t('faqTitle')}</h2>
          <div className="space-y-4">
            {FAQ_KEYS.map((key) => (
              <details key={key} className="group rounded-xl border border-zinc-800 bg-zinc-900/50">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-white">
                  {t(`faq.${key}.q`)}
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">{t(`faq.${key}.a`)}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-8">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
          >
            {t('cta')} <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </>
  );
}
