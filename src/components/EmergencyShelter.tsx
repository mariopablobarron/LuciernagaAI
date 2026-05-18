"use client";

/**
 * EmergencyShelter — modal para usuarios que están "demasiado mal para escribir".
 *
 * Diseño deliberadamente minimalista:
 *  - Cero campos. Cero elecciones. Cero scroll.
 *  - Una caja de respiración 4-7-8 animada.
 *  - Un número de teléfono grande, clickable (tel:).
 *  - Una frase corta.
 *  - Botón para volver al chat.
 *
 * Trigger: botón "Demasiado mal para escribir" en el chat, siempre visible.
 *
 * Hotlines: usa `getHotlinesForCountry` para mostrar el número del país del
 * usuario (header CF-IPCountry). Default España si no se detecta.
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Phone, X } from "lucide-react";
import { getHotlinesForCountry, type CountryHotlines } from "@/lib/crisis-hotlines";
import { BreathingBox } from "./BreathingBox";

type Props = {
  open: boolean;
  onClose: () => void;
  /** ISO 3166-1 alpha-2 del país del usuario. Si no se sabe, default ES. */
  countryCode?: string | null;
};

export default function EmergencyShelter({ open, onClose, countryCode }: Props) {
  const t = useTranslations("emergencyShelter");

  const hotlines: CountryHotlines = getHotlinesForCountry(countryCode);

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll cuando está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const phoneHref = `tel:${hotlines.suicidePrevention.number.replace(/\s+/g, "")}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("ariaLabel")}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-md"
    >
      {/* Botón cerrar discreto, esquina superior derecha. */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute top-4 right-4 p-3 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>

      <div className="flex flex-col items-center gap-10 px-6 max-w-md w-full text-center">
        {/* Frase corta. No hay título — el contexto del overlay habla por sí solo. */}
        <p className="text-xl md:text-2xl font-medium text-zinc-100 leading-relaxed">
          {t("phrase")}
        </p>

        {/* Caja de respiración 4-7-8 — componente reutilizable. */}
        <BreathingBox size="md" />

        {/* Teléfono crisis: grande, una línea, click → llamada. */}
        <a
          href={phoneHref}
          className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-600 text-white text-lg font-semibold shadow-lg shadow-red-600/30 hover:bg-red-500 active:scale-[0.98] transition-all"
        >
          <Phone className="w-5 h-5" aria-hidden="true" />
          <span>
            {t("callNow")} <span className="font-mono">{hotlines.suicidePrevention.number}</span>
          </span>
        </a>

        {/* Subtítulo de la hotline (nombre + disponibilidad). */}
        <p className="text-xs text-zinc-500 -mt-6">
          {hotlines.suicidePrevention.name}
          {hotlines.suicidePrevention.available ? ` · ${hotlines.suicidePrevention.available}` : ""}
        </p>

        {/* Volver al chat — secundario, discreto. */}
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
        >
          {t("back")}
        </button>
      </div>
    </div>
  );
}

/**
 * Botón trigger para abrir el shelter. Pensado para ser visible siempre
 * en el chat, con copy claro pero no alarmista.
 */
export function EmergencyShelterTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const t = useTranslations("emergencyShelter");
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ??
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/40 border border-red-700/40 text-xs font-medium text-red-300 hover:bg-red-900/50 hover:border-red-600/60 transition-colors"
      }
    >
      {t("trigger")}
    </button>
  );
}
