"use client";

/**
 * Modal de respiración guiada — versión "ligera" del EmergencyShelter.
 *
 * Diferencia con EmergencyShelter: este NO incluye el teléfono de crisis
 * ni los recursos de emergencia. Es la herramienta para momentos de
 * tensión cotidiana — exámenes, antes de una conversación difícil,
 * ataque de ansiedad leve, antes de dormir.
 *
 * El usuario abre, respira el tiempo que quiera (típicamente 3-5 ciclos
 * 4-7-8 = ~60-100s) y vuelve al chat. Sin contadores, sin gamification,
 * sin "logros".
 *
 * Para escalation real → EmergencyShelter con el botón "Demasiado mal
 * para escribir" sigue siendo la ruta correcta.
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { BreathingBox } from "./BreathingBox";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BreathingModal({ open, onClose }: Props) {
  const t = useTranslations("breathingModal");

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("ariaLabel")}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-md"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute top-4 right-4 p-3 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>

      <div className="flex flex-col items-center gap-8 px-6 max-w-md w-full text-center">
        <p className="text-lg md:text-xl font-medium text-zinc-100 leading-relaxed">
          {t("title")}
        </p>

        <BreathingBox size="lg" />

        <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
          {t("instruction")}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
        >
          {t("done")}
        </button>
      </div>
    </div>
  );
}

/**
 * Pill trigger discreta para abrir el modal. Pensada para vivir en la
 * misma barra que EmergencyShelter, Incognito, MentorPrefs, DataSummary.
 */
export function BreathingTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const t = useTranslations("breathingModal");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("trigger")}
      title={t("trigger")}
      className={
        className ??
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-900/50 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600/60 transition-colors"
      }
    >
      <span aria-hidden>🌬️</span>
      <span>{t("trigger")}</span>
    </button>
  );
}
