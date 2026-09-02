import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Check, Gift, ArrowRight } from 'lucide-react';
import { buildAlternates } from '@/lib/seo-alternates';

// generateMetadata dinámica: lee del locale activo (cookie NEXT_LOCALE) y
// devuelve title/description traducidos. Sin esto, los SEO de /precios
// siempre serían en español aunque el usuario navegue por /pt o /fr.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pricing');
  const title = t('metaTitle');
  const description = t('metaDescription');
  const ogDescription = t('metaOgDescription');
  const twitterDescription = t('metaTwitterDescription');

  return {
    title,
    description,
    alternates: buildAlternates('/precios'),
    openGraph: {
      title,
      description: ogDescription,
      type: 'website',
      siteName: 'Tres Mil Millones de Latidos',
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: twitterDescription,
      images: ['/opengraph-image'],
    },
    robots: { index: true, follow: true },
  };
}

// 10 features del plan Pro, mapeadas a feature1..10 en messages.
const FEATURE_KEYS = [
  'feature1',
  'feature2',
  'feature3',
  'feature4',
  'feature5',
  'feature6',
  'feature7',
  'feature8',
  'feature9',
  'feature10',
] as const;

// 3 planes futuros y 5 preguntas frecuentes — IDs estables.
const FUTURE_PLANS = ['free', 'pro', 'proAnnual'] as const;
const FAQ_KEYS = ['free', 'data', 'afterMvp', 'psy', 'mobile'] as const;

export default function PreciosPage() {
  const t = useTranslations('pricing');

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
          {t('eyebrow')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold">{t('title')}</h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">{t('subtitle')}</p>
      </div>

      {/* MVP offer card */}
      <div className="rounded-2xl border-2 border-violet-500/60 bg-violet-500/5 p-8 sm:p-10 space-y-6 relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
            {t('mvpBadge')}
          </span>
        </div>

        <div className="text-center space-y-2 pt-4">
          <div className="flex items-center justify-center gap-3">
            <Gift className="w-6 h-6 text-violet-400" />
            <p className="text-sm font-medium text-violet-400">{t('mvpPlanLabel')}</p>
          </div>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black text-white">{t('mvpPriceMain')}</span>
            <span className="text-zinc-500">{t('mvpPriceUnit')}</span>
          </div>
          <p className="text-sm text-zinc-400">{t('mvpSubnote')}</p>
        </div>

        <ul className="grid sm:grid-cols-2 gap-3 pt-2">
          {FEATURE_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-3 text-sm text-zinc-300">
              <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              {t(key)}
            </li>
          ))}
        </ul>

        <div className="pt-4">
          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-base"
          >
            {t('mvpCta')} <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-zinc-600 text-center mt-3">{t('mvpCtaFootnote')}</p>
        </div>
      </div>

      {/* Why free — honesty block */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🧪</span>
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">{t('whyTitle')}</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">{t('whyP1')}</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{t('whyP2')}</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{t('whyP3')}</p>
          </div>
        </div>
      </div>

      {/* Future pricing reference */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center">{t('futureTitle')}</h2>
        <p className="text-sm text-zinc-500 text-center max-w-md mx-auto">
          {t('futureSubtitle')}
        </p>
        <div className="grid sm:grid-cols-3 gap-4 pt-2">
          {FUTURE_PLANS.map((planKey) => (
            <div
              key={planKey}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2"
            >
              <p className="text-sm font-semibold text-white">{t(`futurePlan.${planKey}.name`)}</p>
              <p className="text-lg font-bold text-violet-400">{t(`futurePlan.${planKey}.price`)}</p>
              <p className="text-xs text-zinc-500">{t(`futurePlan.${planKey}.desc`)}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-3 max-w-lg mx-auto">
          <p className="text-sm font-semibold text-white text-center">{t('whyProTitle')}</p>
          <p className="text-xs text-zinc-400 leading-relaxed text-center">{t('whyProDesc')}</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-center mb-6">{t('faqTitle')}</h2>
        {FAQ_KEYS.map((key) => (
          <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="font-semibold text-white text-sm mb-2">{t(`faq.${key}.q`)}</p>
            <p className="text-sm text-zinc-400">{t(`faq.${key}.a`)}</p>
          </div>
        ))}
      </div>

      {/* CTA bottom */}
      <div className="text-center pt-4">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-lg"
        >
          {t('ctaBottom')} <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
