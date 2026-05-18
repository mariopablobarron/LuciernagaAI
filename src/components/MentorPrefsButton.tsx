"use client";

/**
 * Botón de preferencias del mentor — toggle "no interpretes" + slider
 * verbosidad. Visible junto al shelter / incógnito encima del input.
 *
 * Las preferencias se persisten en localStorage (useMentorPreferences)
 * y viajan en cada body al endpoint /api/chat → coach.ts las inyecta
 * al system prompt.
 */

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Sliders, X } from "lucide-react";
import { useMentorPreferences } from "@/lib/useMentorPreferences";

export function MentorPrefsButton() {
  const t = useTranslations("mentorPrefs");
  const { prefs, setNoInterpretation, setVerbosity, reset } = useMentorPreferences();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Cerrar al click fuera o Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Indicador: si hay alguna pref activa, el botón pinta distinto.
  const isCustomized = prefs.noInterpretation || prefs.verbosity !== 3;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-pressed={open}
        aria-expanded={open}
        aria-label={t("trigger")}
        title={t("trigger")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          isCustomized
            ? "bg-indigo-950/50 border border-indigo-600/50 text-indigo-200 hover:bg-indigo-900/60"
            : "bg-zinc-900/50 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600/60"
        }`}
      >
        <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{t("trigger")}</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t("panelTitle")}
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[280px] sm:w-[320px] rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl p-4 z-50"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white">{t("panelTitle")}</h4>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Toggle: no me interpretes */}
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={prefs.noInterpretation}
              onChange={(e) => setNoInterpretation(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-offset-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100">{t("noInterpretation.label")}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t("noInterpretation.description")}</p>
            </div>
          </label>

          {/* Slider: verbosidad */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-medium text-zinc-100">{t("verbosity.label")}</p>
              <span className="text-xs font-mono text-indigo-300">{prefs.verbosity}/5</span>
            </div>
            <p className="text-xs text-zinc-500 mb-2">{t(`verbosity.description.${prefs.verbosity}`)}</p>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={prefs.verbosity}
              onChange={(e) => setVerbosity(Number(e.target.value))}
              aria-label={t("verbosity.label")}
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
              <span>{t("verbosity.minLabel")}</span>
              <span>{t("verbosity.maxLabel")}</span>
            </div>
          </div>

          {/* Reset si hay algo modificado */}
          {isCustomized && (
            <button
              type="button"
              onClick={reset}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
            >
              {t("reset")}
            </button>
          )}

          <p className="mt-3 text-[10px] text-zinc-600 leading-relaxed">
            {t("disclosure")}
          </p>
        </div>
      )}
    </div>
  );
}
