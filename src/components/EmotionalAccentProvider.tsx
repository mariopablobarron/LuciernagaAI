"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

// Mapea el estado del usuario al atributo que CSS lee como selector:
//   [data-emotion="bloqueo"] { --accent-emotion: var(--emotion-blocked); }
// Si state === "neutral", se limpia el atributo y el acento vuelve al
// primary (violet) por defecto.
const VALID_STATES = new Set(["bloqueo", "ansiedad", "duda", "claridad"]);

const HINT_SEEN_KEY = "tml_emotional_accent_hint_seen";

const STATE_COPY: Record<string, string> = {
  bloqueo: "Hoy te noto bloqueado. Ese color acompaña.",
  ansiedad: "Hoy te noto ansioso. El ámbar camina contigo.",
  duda: "Hoy te noto en duda. El violeta te sostiene.",
  claridad: "Hoy tienes claridad. El cian lo refleja.",
};

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
  const [hintState, setHintState] = useState<string | null>(null);

  useEffect(() => {
    // Solo activo dentro de la plataforma (/app/*). Fuera de ahí la marca
    // mantiene el violeta corporativo sin reflejar estado personal.
    if (!pathname?.startsWith("/app")) {
      applyAccent(null);
      return;
    }

    let cancelled = false;

    const handleState = (state: string | null) => {
      if (cancelled) return;
      applyAccent(state);
      if (!state || !VALID_STATES.has(state)) return;
      try {
        if (window.localStorage.getItem(HINT_SEEN_KEY)) return;
      } catch {
        return;
      }
      setHintState(state);
    };

    void fetchState().then(handleState);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchState().then(handleState);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(HINT_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setHintState(null);
  };

  if (!hintState || !pathname?.startsWith("/app")) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-xs rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 pr-8 shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ borderLeft: "3px solid var(--accent-emotion)" }}
    >
      <p className="text-sm font-medium text-zinc-100">
        {STATE_COPY[hintState]}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        El color de la plataforma cambia contigo. No es decoración: es una
        forma de que te sientas escuchado.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute right-2 top-2 rounded-md p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
