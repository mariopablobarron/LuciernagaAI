"use client";

import { useTranslations } from "next-intl";
import { ExternalLink, Stethoscope, X } from "lucide-react";
import { useState } from "react";
import type { EscalationCategory } from "@/lib/escalation-detector";

type Props = {
  category: Exclude<EscalationCategory, null>;
  /** Locale del usuario para que el link al directorio respete idioma. */
  locale: string;
  onDismiss?: () => void;
};

/**
 * Mapping locale → URL del directorio internacional. Hoy todos van a
 * findahelpline.com/countries/<locale> que tiene directorio por país
 * en 100+ países. Si en el futuro queremos catálogo propio, sustituir.
 */
function directoryUrl(locale: string): string {
  return `https://findahelpline.com/?utm_source=tresmilmillonesdelatidos&utm_medium=escalation_banner&lang=${encodeURIComponent(locale)}`;
}

/**
 * Banner que aparece debajo del último mensaje del usuario cuando el
 * detector dispara. Tono cálido, sin alarmar — el objetivo es validar
 * el momento del usuario y abrir la puerta a profesional, no asustar.
 *
 * El banner es DISMISSIBLE: el usuario puede cerrarlo si prefiere
 * seguir solo con el mentor. Respetar agency es importante.
 */
export function EscalationBanner({ category, locale, onDismiss }: Props) {
  const t = useTranslations("escalation");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label={t("ariaLabel")}
      className="mx-1 mt-2 rounded-2xl border border-amber-700/30 bg-amber-950/20 p-4 relative"
    >
      <button
        type="button"
        onClick={() => { setDismissed(true); onDismiss?.(); }}
        aria-label={t("dismiss")}
        className="absolute top-2 right-2 p-1.5 rounded-full text-amber-700/70 hover:text-amber-300 hover:bg-amber-900/30 transition-colors"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/30">
          <Stethoscope className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-100 mb-1">
            {t("title")}
          </p>
          <p className="text-xs text-amber-200/80 leading-relaxed mb-3">
            {t(`reason.${category}`)}
          </p>
          <a
            href={directoryUrl(locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 underline underline-offset-4 hover:text-amber-100 transition-colors"
          >
            {t("ctaFindProfessional")}
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
          <p className="mt-3 text-[10px] text-amber-200/50 leading-relaxed">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
