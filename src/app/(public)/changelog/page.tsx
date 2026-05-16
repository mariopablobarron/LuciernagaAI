'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Sparkles, Wrench, Shield, Heart } from 'lucide-react';

type Kind = 'nuevo' | 'mejora' | 'seguridad' | 'cuidado';

// Entradas con IDs estables. Copy desde messages.changelog.entry.<id>.{title,body}.
// La fecha es ISO y se formatea según el locale activo.
type Entry = { id: string; date: string; kind: Kind };

const ENTRIES: Entry[] = [
  { id: 'helpPage', date: '2026-04-18', kind: 'cuidado' },
  { id: 'referrals', date: '2026-04-15', kind: 'nuevo' },
  { id: 'rateLimit', date: '2026-04-14', kind: 'seguridad' },
  { id: 'clinicalNotes', date: '2026-04-10', kind: 'mejora' },
];

const KIND_STYLE: Record<
  Kind,
  { icon: typeof Sparkles; text: string; bg: string; border: string }
> = {
  nuevo: { icon: Sparkles, text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  mejora: { icon: Wrench, text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  seguridad: { icon: Shield, text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  cuidado: { icon: Heart, text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
};

const LOCALE_BCP47: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  pt: 'pt-PT',
  fr: 'fr-FR',
};

export default function ChangelogPage() {
  const t = useTranslations('changelog');
  const locale = useLocale();
  const dateFormat = new Intl.DateTimeFormat(LOCALE_BCP47[locale] ?? 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/8 blur-3xl" />
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

      {/* Entries */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="space-y-8">
          {ENTRIES.map((e) => {
            const style = KIND_STYLE[e.kind];
            const Icon = style.icon;
            const d = new Date(e.date);
            return (
              <article
                key={e.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full ${style.bg} border ${style.border} px-3 py-1 text-xs font-semibold ${style.text}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t(`kind.${e.kind}`)}
                  </div>
                  <time dateTime={e.date} className="text-xs text-zinc-500">
                    {dateFormat.format(d)}
                  </time>
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">
                  {t(`entry.${e.id}.title`)}
                </h2>
                <p className="text-zinc-400 leading-relaxed">
                  {t(`entry.${e.id}.body`)}
                </p>
              </article>
            );
          })}
        </div>

        {/* Suggestion */}
        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 text-center space-y-3">
          <p className="text-white font-semibold">{t('suggestionTitle')}</p>
          <p className="text-sm text-zinc-500 leading-relaxed">{t('suggestionDesc')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/20"
            >
              {t('suggestionCta')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
