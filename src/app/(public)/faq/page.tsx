'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, ChevronDown, HelpCircle } from 'lucide-react';

// Estructura plana de grupos con IDs estables. El copy completo vive en
// messages/{es,en,pt,fr}.json bajo "faq.<groupId>.<itemId>.{q,a}".
const GROUPS = [
  { id: 'basico', items: ['what', 'naming', 'vsChatGPT', 'noPsy', 'wellState'] },
  { id: 'empezar', items: ['register', 'whyEmail', 'attachAnon'] },
  {
    id: 'funciona',
    items: [
      'when',
      'time',
      'memory',
      'enneagram',
      'weeklyLetter',
      'teamLetter',
      'exercises',
      'structured',
    ],
  },
  { id: 'comunidad', items: ['individual', 'join', 'inside'] },
  { id: 'privacidad', items: ['whoReads', 'circleAnon', 'training', 'exportDelete'] },
  { id: 'precios', items: ['free', 'pro', 'cancel', 'pause', 'mobile'] },
  { id: 'limites', items: ['vsTherapy', 'crisis', 'trustedContact', 'aiMistakes'] },
  { id: 'proyecto', items: ['team', 'languages', 'pros'] },
] as const;

export default function FaqPage() {
  const t = useTranslations('faq');

  // JSON-LD FAQPage — Google rich snippets. Itera la misma estructura GROUPS
  // y lee del catálogo i18n para el locale activo del request.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GROUPS.flatMap((g) =>
      g.items.map((itemId) => ({
        '@type': 'Question',
        name: t(`${g.id}.${itemId}.q`),
        acceptedAnswer: { '@type': 'Answer', text: t(`${g.id}.${itemId}.a`) },
      })),
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/8 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <p className="text-base font-semibold uppercase tracking-widest text-violet-400">
            {t('eyebrow')}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            {t('title')}{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              {t('titleHighlight')}
            </span>
          </h1>
          <p className="text-xl text-zinc-300 leading-relaxed max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          <p className="text-base text-zinc-400">
            {t('notFoundPre')}{' '}
            <Link
              href="/contact"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-semibold"
            >
              {t('notFoundLink')}
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ groups */}
      <section className="max-w-3xl mx-auto px-4 pb-16 space-y-12">
        {GROUPS.map((group) => (
          <FaqGroup key={group.id} groupId={group.id} items={[...group.items]} />
        ))}

        {/* CTA */}
        <div className="text-center pt-12 space-y-5 border-t border-zinc-800/60">
          <div className="pt-8 space-y-2">
            <p className="text-2xl font-bold text-white">{t('ctaTitle')}</p>
            <p className="text-base text-zinc-400 max-w-md mx-auto">{t('ctaSubtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25 text-lg"
            >
              {t('ctaButton')} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-base text-zinc-500 pt-4">
            <HelpCircle className="inline w-4 h-4 text-cyan-500 mr-1" />
            {t('ctaQuestionPre')}{' '}
            <Link
              href="/contact"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-semibold"
            >
              {t('ctaQuestionLink')}
            </Link>{' '}
            {t('ctaQuestionSuf')}
          </p>
        </div>
      </section>
    </>
  );
}

function FaqGroup({ groupId, items }: { groupId: string; items: string[] }) {
  const t = useTranslations('faq');
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">{t(`${groupId}.title`)}</h2>
      <div className="space-y-3">
        {items.map((itemId) => (
          <FaqItem
            key={itemId}
            q={t(`${groupId}.${itemId}.q`)}
            a={t(`${groupId}.${itemId}.a`)}
          />
        ))}
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 text-left px-5 py-4 hover:bg-zinc-900/70 transition-colors"
        aria-expanded={open}
      >
        <span className="text-white font-semibold">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-zinc-500 shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-5 pb-5 text-zinc-400 leading-relaxed">{a}</div>}
    </div>
  );
}
