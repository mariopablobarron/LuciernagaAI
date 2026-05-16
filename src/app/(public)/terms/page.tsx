'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

// 13 secciones legales con IDs estables. Copy desde messages.terms.section.<id>.*
// Cada sección puede tener: intro (párrafo previo), items[] (lista), outro1..N (párrafos posteriores).
// rich tags soportados en items/intros/outros: <strong>, <code>, <link>, <mailto>.
type SectionDef = {
  id: string;
  hasIntro?: boolean;
  itemsCount?: number;
  outroCount?: number;
  linkHref?: string;
  mailtoHref?: string;
};

const SECTIONS: SectionDef[] = [
  { id: 'aceptacion', hasIntro: true },
  { id: 'descripcion', hasIntro: true },
  { id: 'aviso', hasIntro: true, outroCount: 1, itemsCount: 3 },
  { id: 'limitacion', hasIntro: true, outroCount: 1 },
  { id: 'disponibilidad', hasIntro: true },
  { id: 'uso', hasIntro: true, itemsCount: 4 },
  { id: 'propiedad', hasIntro: true, outroCount: 2 },
  { id: 'pagos', hasIntro: true, outroCount: 3 },
  { id: 'privacidad', hasIntro: true, linkHref: '/privacy' },
  { id: 'modificaciones', hasIntro: true },
  { id: 'legislacion', hasIntro: true },
  { id: 'lssi', hasIntro: true, itemsCount: 5, mailtoHref: 'mailto:hola@tresmilmillonesdelatidos.es', linkHref: 'https://tresmilmillonesdelatidos.es' },
  { id: 'contacto', hasIntro: true, mailtoHref: 'mailto:hola@tresmilmillonesdelatidos.es' },
];

function richTags(linkHref?: string, mailtoHref?: string): Record<string, (chunks: ReactNode) => ReactNode> {
  return {
    strong: (chunks) => <strong className="text-white">{chunks}</strong>,
    strongAmber: (chunks) => <strong className="text-amber-400">{chunks}</strong>,
    code: (chunks) => <span className="font-mono text-zinc-300">{chunks}</span>,
    link: (chunks) => linkHref ? (
      linkHref.startsWith('http') ? (
        <a href={linkHref} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
          {chunks}
        </a>
      ) : (
        <a href={linkHref} className="text-cyan-400 hover:underline">{chunks}</a>
      )
    ) : <>{chunks}</>,
    mailto: (chunks) => mailtoHref ? (
      <a href={mailtoHref} className="text-cyan-400 hover:underline">{chunks}</a>
    ) : <>{chunks}</>,
  };
}

export default function TermsPage() {
  const t = useTranslations('terms');

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} py-20 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        <h1 className={`${TYPOGRAPHY.h1} text-white`}>{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('lastUpdated')}</p>

        <div className={`${COMPONENTS.card} p-8 space-y-6`}>
          {SECTIONS.map((s, idx) => {
            const tags = richTags(s.linkHref, s.mailtoHref);
            return (
              <section
                key={s.id}
                className={`space-y-4 ${idx > 0 ? 'border-t border-zinc-800 pt-6' : ''}`}
              >
                <h2 className={`${TYPOGRAPHY.h2} text-white`}>
                  {idx + 1}. {t(`section.${s.id}.title`)}
                </h2>

                {s.hasIntro && (
                  <p className="text-zinc-300 leading-relaxed">
                    {t.rich(`section.${s.id}.intro`, tags)}
                  </p>
                )}

                {s.itemsCount && s.itemsCount > 0 && (
                  <ul className="space-y-1 text-zinc-300">
                    {Array.from({ length: s.itemsCount }).map((_, i) => (
                      <li key={i}>{t.rich(`section.${s.id}.item${i + 1}`, tags)}</li>
                    ))}
                  </ul>
                )}

                {s.outroCount && s.outroCount > 0 && Array.from({ length: s.outroCount }).map((_, i) => (
                  <p key={i} className="text-zinc-300 leading-relaxed">
                    {t.rich(`section.${s.id}.outro${i + 1}`, tags)}
                  </p>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
