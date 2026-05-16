'use client';

import Link from "next/link";
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Check,
  X as XIcon,
  HelpCircle,
  Scale,
  Shield,
  Stethoscope,
} from "lucide-react";

// Estructura visual fija con IDs estables. Copy desde messages/{es,en,pt,fr}.json
// bajo "comparison.row.<id>.{criterio,producto,chatgpt,terapia,meditacion}".
// El "tone" de cada celda se mantiene aquí (es marker visual, no copy).
const ROW_TONES = {
  purpose:             { producto: 'neutral', chatgpt: 'neutral', terapia: 'neutral', meditacion: 'neutral' },
  framework:           { producto: 'good',    chatgpt: 'bad',     terapia: 'warn',    meditacion: 'neutral' },
  crisisDetection:     { producto: 'good',    chatgpt: 'warn',    terapia: 'warn',    meditacion: 'bad' },
  clinicalSupervision: { producto: 'good',    chatgpt: 'bad',     terapia: 'good',    meditacion: 'bad' },
  context:             { producto: 'good',    chatgpt: 'warn',    terapia: 'good',    meditacion: 'bad' },
  actions:             { producto: 'good',    chatgpt: 'warn',    terapia: 'warn',    meditacion: 'neutral' },
  community:           { producto: 'good',    chatgpt: 'bad',     terapia: 'warn',    meditacion: 'warn' },
  availability:        { producto: 'good',    chatgpt: 'good',    terapia: 'warn',    meditacion: 'good' },
  privacy:             { producto: 'good',    chatgpt: 'warn',    terapia: 'good',    meditacion: 'warn' },
  price:               { producto: 'good',    chatgpt: 'good',    terapia: 'bad',     meditacion: 'warn' },
  replaceTherapy:      { producto: 'neutral', chatgpt: 'warn',    terapia: 'good',    meditacion: 'neutral' },
} as const;

const ROW_IDS = Object.keys(ROW_TONES) as Array<keyof typeof ROW_TONES>;
type Tone = 'good' | 'warn' | 'bad' | 'neutral';
type Column = 'producto' | 'chatgpt' | 'terapia' | 'meditacion';

export default function ComparativaPage() {
  const t = useTranslations('comparison');

  // JSON-LD ItemList + FAQPage dinámicos por locale (rich snippets)
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('title'),
    description: t('subtitle'),
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('colProducto'), url: 'https://tresmilmillonesdelatidos.es' },
      { '@type': 'ListItem', position: 2, name: t('colChatGPT') },
      { '@type': 'ListItem', position: 3, name: t('colTerapia') },
      { '@type': 'ListItem', position: 4, name: t('colMeditacion') },
    ],
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [1, 2, 3, 4, 5].map((n) => ({
      '@type': 'Question',
      name: t(`faqQ${n}`),
      acceptedAnswer: { '@type': 'Answer', text: t(`faqA${n}`) },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="min-h-screen bg-zinc-950 text-white">
        {/* Hero */}
        <section className="relative py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
              {t('eyebrow')}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-white">
              {t('title')}
            </h1>
            <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
            <p className="text-xs text-zinc-600">
              {t('lastUpdated', { date: t('lastUpdatedDate') })}
            </p>
          </div>
        </section>

        {/* Tabla comparativa */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <Scale className="w-4 h-4 text-violet-300" />
              <h2 className="text-sm font-semibold text-white">{t('tableTitle')}</h2>
            </div>

            {/* Mobile: stacked cards */}
            <div className="md:hidden divide-y divide-zinc-800">
              {ROW_IDS.map((rowId) => (
                <div key={rowId} className="px-4 py-4 space-y-2.5">
                  <p className="text-sm font-bold text-white">{t(`row.${rowId}.criterio`)}</p>
                  <div className="space-y-1.5">
                    {(['producto', 'chatgpt', 'terapia', 'meditacion'] as const).map((col) => (
                      <CardRow
                        key={col}
                        label={t(
                          col === 'producto' ? 'colProducto'
                          : col === 'chatgpt' ? 'colChatGPT'
                          : col === 'terapia' ? 'colTerapia'
                          : 'colMeditacion'
                        )}
                        text={t(`row.${rowId}.${col}`)}
                        tone={ROW_TONES[rowId][col] as Tone}
                        highlight={col === 'producto'}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-3 font-semibold">{t('colCriterio')}</th>
                    <th className="px-3 py-3 font-semibold text-violet-300">{t('colProducto')}</th>
                    <th className="px-3 py-3 font-semibold">{t('colChatGPT')}</th>
                    <th className="px-3 py-3 font-semibold">{t('colTerapia')}</th>
                    <th className="px-3 py-3 font-semibold">{t('colMeditacion')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ROW_IDS.map((rowId) => (
                    <tr key={rowId} className="border-b border-zinc-900 align-top">
                      <th
                        scope="row"
                        className="px-3 py-2 text-xs font-semibold text-white align-top whitespace-nowrap"
                      >
                        {t(`row.${rowId}.criterio`)}
                      </th>
                      {(['producto', 'chatgpt', 'terapia', 'meditacion'] as const).map((col) => (
                        <Cell
                          key={col}
                          text={t(`row.${rowId}.${col}`)}
                          tone={ROW_TONES[rowId][col] as Tone}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Secciones largas — formato que los LLM citan */}
        <section className="max-w-3xl mx-auto px-4 pb-16 space-y-12">
          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-400" />
              {t('section1.title')}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              <strong className="text-white">{t('section1.p1Strong')}</strong> {t('section1.p1')}
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              <strong className="text-white">{t('section1.p2Strong')}</strong> {t('section1.p2')}
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              <strong className="text-white">{t('section1.p3Strong')}</strong> {t('section1.p3')}{' '}
              <Link
                href="/para-profesionales"
                className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
              >
                {t('section1.p3Link')}
              </Link>
              {t('section1.p3Suffix')}
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-400" />
              {t('section2.title')}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t('section2.p1')}{' '}
              <strong className="text-white">{t('section2.p1Strong')}</strong>
              {t('section2.p1Cont')}{' '}
              <strong className="text-white">{t('section2.p1Strong2')}</strong>{' '}
              {t('section2.p1End')}
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('section2.p2')}</p>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">{t('section3.title')}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t('section3.p1')}{' '}
              <strong className="text-white">{t('section3.p1Strong')}</strong>
              {t('section3.p1Cont')}
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {t('section3.p2')}{' '}
              <strong className="text-white">{t('section3.p2Strong')}</strong>
              {t('section3.p2Cont')}
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">{t('section4.title')}</h2>
            <ul className="space-y-2 text-sm text-zinc-400 leading-relaxed">
              {[1, 2, 3, 4].map((n) => (
                <li key={n}>
                  <strong className="text-white">{t(`section4.item${n}Strong`)}</strong>{' '}
                  {t(`section4.item${n}`)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA final */}
        <section className="max-w-3xl mx-auto px-4 pb-20 text-center space-y-5">
          <h2 className="text-xl md:text-2xl font-bold text-white">{t('ctaTitle')}</h2>
          <p className="text-sm text-zinc-400">{t('ctaSubtitle')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/como-funciona"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-500/40 text-violet-200 hover:bg-violet-500/10 transition-colors"
            >
              {t('ctaPrimary')} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all"
            >
              {t('ctaSecondary')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}

function toneIcon(tone: Tone, size: 'sm' | 'md' = 'sm') {
  const cls = size === 'sm' ? 'w-3.5 h-3.5 mr-1' : 'w-4 h-4';
  if (tone === 'good') return <Check className={`inline text-emerald-400 ${cls}`} />;
  if (tone === 'bad') return <XIcon className={`inline text-red-400 ${cls}`} />;
  if (tone === 'warn') return <HelpCircle className={`inline text-amber-400 ${cls}`} />;
  return null;
}

function Cell({ text, tone }: { text: string; tone: Tone }) {
  return (
    <td className="px-3 py-2 align-top text-xs text-zinc-300 leading-relaxed">
      {toneIcon(tone)}
      {text}
    </td>
  );
}

function CardRow({
  label,
  text,
  tone,
  highlight = false,
}: {
  label: string;
  text: string;
  tone: Tone;
  highlight?: boolean;
}) {
  const icon = tone === 'good' ? (
    <Check className="shrink-0 w-4 h-4 text-emerald-400" />
  ) : tone === 'bad' ? (
    <XIcon className="shrink-0 w-4 h-4 text-red-400" />
  ) : tone === 'warn' ? (
    <HelpCircle className="shrink-0 w-4 h-4 text-amber-400" />
  ) : (
    <span className="shrink-0 w-4 h-4 inline-flex items-center justify-center text-zinc-600">·</span>
  );
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-zinc-900/60 px-3 py-2">
      {icon}
      <div className="min-w-0 flex-1">
        <p
          className={`text-[11px] font-semibold uppercase tracking-wide ${
            highlight ? 'text-violet-300' : 'text-zinc-500'
          }`}
        >
          {label}
        </p>
        <p className="text-sm text-zinc-300 leading-snug mt-0.5">{text}</p>
      </div>
    </div>
  );
}
