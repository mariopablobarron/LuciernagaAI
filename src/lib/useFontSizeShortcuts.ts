"use client";

/**
 * Atajos de teclado para cambiar el tamaño de fuente del producto.
 *
 *   Ctrl/Cmd + =  (o +)  → subir un nivel (max 4)
 *   Ctrl/Cmd + -          → bajar un nivel (min 0)
 *   Ctrl/Cmd + 0          → resetear a nivel 0 (default)
 *
 * Muestra un toast efímero con el nivel actual (1s, auto-dismiss).
 *
 * Reutiliza el sistema de useAccessibility() — los atajos persisten en
 * localStorage como cualquier cambio desde el widget. Sin duplicar
 * lógica, sin tocar el widget.
 *
 * Pensado para usuarios con problemas de visión que no quieren abrir
 * un menú cada vez que necesitan ajustar; o usuarios casuales que
 * descubren que pueden hacerlo con teclas.
 */

import { useEffect, useRef, useState } from "react";
import { useAccessibility } from "./accessibility";

const TOAST_DURATION_MS = 1500;

export function useFontSizeShortcuts(): {
  toast: { visible: boolean; level: number } | null;
} {
  const { prefs, update } = useAccessibility();
  const [toast, setToast] = useState<{ visible: boolean; level: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (level: number) => {
    setToast({ visible: true, level });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, TOAST_DURATION_MS);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onKey = (e: KeyboardEvent) => {
      // Solo aceptar combinaciones con modifier (Ctrl en Win/Linux, Cmd en Mac).
      if (!e.ctrlKey && !e.metaKey) return;

      // No interferir con campos de texto enfocados — el usuario puede estar
      // escribiendo en el chat y querer usar Ctrl+0 para algo distinto.
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd + = (o +): subir
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        const next = Math.min(4, prefs.fontSize + 1);
        if (next !== prefs.fontSize) {
          update({ fontSize: next });
          showToast(next);
        }
        return;
      }
      // Ctrl/Cmd + -: bajar
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        const next = Math.max(0, prefs.fontSize - 1);
        if (next !== prefs.fontSize) {
          update({ fontSize: next });
          showToast(next);
        }
        return;
      }
      // Ctrl/Cmd + 0: reset
      if (e.key === "0") {
        e.preventDefault();
        if (prefs.fontSize !== 0) {
          update({ fontSize: 0 });
          showToast(0);
        }
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs.fontSize, update]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { toast };
}
