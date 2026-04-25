"use client";

import { useEffect, useState } from "react";

/**
 * Hook que detecta si hay una versión nueva del servidor disponible.
 *
 * Compara la versión inyectada en build (NEXT_PUBLIC_BUILD_VERSION) con la que
 * devuelve el endpoint /api/version cada N minutos. Si difieren, devuelve true
 * y el componente que lo consuma puede mostrar un banner.
 *
 * - No corre en development (ruido innecesario en HMR).
 * - No corre si la pestaña está oculta (ahorra peticiones).
 * - Maneja errores silenciosamente (no romper UX por un fallo de red).
 */

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useVersionCheck(): boolean {
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;

    const initialVersion = process.env.NEXT_PUBLIC_BUILD_VERSION;
    if (!initialVersion) return;

    let cancelled = false;

    async function check() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store", credentials: "omit" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (cancelled) return;
        if (data.version && data.version !== initialVersion) {
          setHasNewVersion(true);
        }
      } catch {
        // Silent: errores de red no deben romper la UX.
      }
    }

    // Primera comprobación a los 30s para no impactar el TTI.
    const firstTimer = setTimeout(check, 30 * 1000);
    const interval = setInterval(check, POLL_INTERVAL_MS);

    // Vuelve a comprobar al volver a foco (cuando el usuario regresa a la pestaña).
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearTimeout(firstTimer);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return hasNewVersion;
}
