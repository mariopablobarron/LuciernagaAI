"use client";

import { useState, useRef, useEffect } from "react";
import {
  Accessibility, X, Type, Contrast, MonitorOff,
  BookOpenText, Link2, MousePointer, Space, RotateCcw,
  Plus, Minus,
} from "lucide-react";
import { useAccessibility } from "@/lib/accessibility";

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { prefs, update, reset } = useAccessibility();

  // Alt+A to toggle, Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setOpen((v) => {
          if (v) buttonRef.current?.focus();
          return !v;
        });
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Focus trap inside panel
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();
  }, [open]);

  const activeCount = [
    prefs.fontSize > 0,
    prefs.highContrast,
    prefs.reducedMotion,
    prefs.dyslexiaFont,
    prefs.linkHighlight,
    prefs.bigCursor,
    prefs.textSpacing,
  ].filter(Boolean).length;

  return (
    <>
      {/* Floating trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar panel de accesibilidad" : "Abrir panel de accesibilidad"}
        title={open ? "Cerrar panel de accesibilidad" : "Accesibilidad: tamaño de texto, contraste y movimiento"}
        aria-expanded={open}
        aria-controls="a11y-panel"
        className="fixed bottom-36 sm:bottom-20 left-4 z-[9998] flex items-center justify-center w-11 h-11 rounded-full bg-violet-600/90 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25 backdrop-blur-sm transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        <Accessibility className="w-5 h-5" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 text-zinc-950 text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          role="dialog"
          aria-label="Opciones de accesibilidad"
          aria-modal="true"
          className="fixed bottom-48 sm:bottom-32 left-4 right-4 sm:right-auto z-[9998] sm:w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/40"
        >
          {/* Header */}
          <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Accessibility className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Accesibilidad</h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">

            {/* Font size */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Type className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-white">Tamano de texto</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => update({ fontSize: Math.max(0, prefs.fontSize - 1) })}
                  disabled={prefs.fontSize <= 0}
                  aria-label="Reducir tamano de texto"
                  className="p-2 rounded-lg bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex gap-1" role="group" aria-label="Nivel de tamano de texto">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <button
                      key={level}
                      onClick={() => update({ fontSize: level })}
                      aria-label={level === 0 ? "Tamano normal" : `Tamano +${level}`}
                      aria-pressed={prefs.fontSize === level}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        prefs.fontSize === level
                          ? "bg-violet-600 text-white"
                          : "bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {level === 0 ? "A" : `+${level}`}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => update({ fontSize: Math.min(4, prefs.fontSize + 1) })}
                  disabled={prefs.fontSize >= 4}
                  aria-label="Aumentar tamano de texto"
                  className="p-2 rounded-lg bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Toggle options */}
            <ToggleOption
              icon={<Contrast className="w-4 h-4 text-amber-400" />}
              label="Alto contraste"
              description="Aumenta el contraste de colores"
              checked={prefs.highContrast}
              onChange={(v) => update({ highContrast: v })}
            />

            <ToggleOption
              icon={<MonitorOff className="w-4 h-4 text-red-400" />}
              label="Reducir movimiento"
              description="Desactiva animaciones y transiciones"
              checked={prefs.reducedMotion}
              onChange={(v) => update({ reducedMotion: v })}
            />

            <ToggleOption
              icon={<BookOpenText className="w-4 h-4 text-emerald-400" />}
              label="Fuente para dislexia"
              description="Tipografia mas legible para dislexia"
              checked={prefs.dyslexiaFont}
              onChange={(v) => update({ dyslexiaFont: v })}
            />

            <ToggleOption
              icon={<Link2 className="w-4 h-4 text-blue-400" />}
              label="Resaltar enlaces"
              description="Subraya todos los enlaces"
              checked={prefs.linkHighlight}
              onChange={(v) => update({ linkHighlight: v })}
            />

            <ToggleOption
              icon={<MousePointer className="w-4 h-4 text-fuchsia-400" />}
              label="Cursor grande"
              description="Cursor mas grande y visible"
              checked={prefs.bigCursor}
              onChange={(v) => update({ bigCursor: v })}
            />

            <ToggleOption
              icon={<Space className="w-4 h-4 text-violet-400" />}
              label="Espaciado de texto"
              description="Mas espacio entre letras y lineas"
              checked={prefs.textSpacing}
              onChange={(v) => update({ textSpacing: v })}
            />

            {/* Reset button */}
            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-700 text-xs font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer todo
            </button>

            <p className="text-[10px] text-zinc-600 text-center pt-1">
              Las preferencias se guardan en tu navegador
              <br />
              <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[9px] font-mono">Alt + A</kbd> para abrir/cerrar
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* ── ToggleOption sub-component ──────────────────────────────────── */
function ToggleOption({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
        checked
          ? "border-violet-500/40 bg-violet-500/10"
          : "border-zinc-800 bg-zinc-800/40 hover:border-zinc-700"
      }`}
    >
      <div className={`shrink-0 p-2 rounded-lg ${checked ? "bg-violet-500/20" : "bg-zinc-700/50"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white">{label}</p>
        <p className="text-[10px] text-zinc-500 leading-tight">{description}</p>
      </div>
      <div
        className={`shrink-0 w-9 h-5 rounded-full transition-colors ${checked ? "bg-violet-600" : "bg-zinc-700"}`}
      >
        <div
          className={`w-4 h-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
