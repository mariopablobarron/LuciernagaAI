"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, X, Phone } from "lucide-react";

const EMERGENCY_NUMBERS = [
  { country: "España", number: "024", label: "Línea de atención a la conducta suicida" },
  { country: "España", number: "112", label: "Emergencias" },
  { country: "Latinoamérica", number: "988", label: "Suicide & Crisis Lifeline (US)" },
];

export default function ClinicalDisclaimer() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-white/5 transition-colors"
        title="Información clínica"
        aria-label="Disclaimer clínico"
      >
        <ShieldCheck className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Información importante</h2>
              </div>
              <button
                onClick={close}
                className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded-md hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  <strong className="text-white">Tres Mil Millones de Latidos</strong> es una herramienta
                  de coaching y autoconocimiento con inteligencia artificial.
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  <strong className="text-amber-400">No sustituye</strong> terapia psicológica,
                  psiquiátrica ni intervención profesional de salud mental.
                </p>
              </div>

              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-red-300">
                  Si estás en crisis o peligro inmediato:
                </p>
                {EMERGENCY_NUMBERS.map((e) => (
                  <a
                    key={e.number}
                    href={`tel:${e.number}`}
                    className="flex items-center gap-3 rounded-lg bg-red-500/10 px-3 py-2.5 hover:bg-red-500/20 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{e.number}</p>
                      <p className="text-xs text-zinc-400">{e.label} ({e.country})</p>
                    </div>
                  </a>
                ))}
              </div>

              <p className="text-xs text-zinc-600 text-center">
                Al usar esta aplicación aceptas estos términos.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
