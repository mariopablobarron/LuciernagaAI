"use client";

import { useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useVersionCheck } from "@/lib/useVersionCheck";

/**
 * Banner discreto que aparece cuando se detecta una nueva versión desplegada.
 * Click en "Recargar" recarga la pestaña con `location.reload()` (soft reload
 * que respeta los headers de cache; suficiente para coger los assets nuevos).
 *
 * Se monta en layouts logged-in. Para desactivarlo solo en una pantalla
 * concreta (e.g. flujo crítico de pago), envuélvela con un wrapper que
 * deshabilite el banner si querés.
 */
export function NewVersionBanner() {
  const hasNewVersion = useVersionCheck();

  const handleReload = useCallback(() => {
    if (typeof window !== "undefined") window.location.reload();
  }, []);

  if (!hasNewVersion) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-violet-500/40 bg-zinc-900/95 backdrop-blur-md px-4 py-2.5 shadow-2xl text-sm text-white max-w-[92vw]"
    >
      <RefreshCw className="h-4 w-4 text-violet-300 shrink-0" />
      <span className="text-zinc-200">Hay una nueva versión disponible.</span>
      <button
        type="button"
        onClick={handleReload}
        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 shrink-0"
      >
        Recargar
      </button>
    </div>
  );
}
