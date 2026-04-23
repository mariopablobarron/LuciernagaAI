"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Mapea el estado del usuario al atributo que CSS lee como selector:
//   [data-emotion="bloqueo"] { --accent-emotion: var(--emotion-blocked); }
// Si state === "neutral" o "claridad mixta", se limpia el atributo y el
// acento vuelve al primary (violet) por defecto.
const VALID_STATES = new Set(["bloqueo", "ansiedad", "duda", "claridad"]);

type StateResponse = {
  success: boolean;
  state?: string;
};

async function fetchState(): Promise<string | null> {
  try {
    const res = await fetch("/api/user/state", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as StateResponse;
    if (!data.success || !data.state) return null;
    return data.state;
  } catch {
    return null;
  }
}

function applyAccent(state: string | null) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (state && VALID_STATES.has(state)) {
    html.setAttribute("data-emotion", state);
  } else {
    html.removeAttribute("data-emotion");
  }
}

export default function EmotionalAccentProvider() {
  const pathname = usePathname();

  useEffect(() => {
    // Solo activo dentro de la plataforma (/app/*). Fuera de ahí la marca
    // mantiene el violeta corporativo sin reflejar estado personal.
    if (!pathname?.startsWith("/app")) {
      applyAccent(null);
      return;
    }

    let cancelled = false;
    void fetchState().then((state) => {
      if (!cancelled) applyAccent(state);
    });

    // Refresco al volver a la pestaña (por si el estado cambió en otra sesión)
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchState().then((state) => {
          if (!cancelled) applyAccent(state);
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return null;
}
