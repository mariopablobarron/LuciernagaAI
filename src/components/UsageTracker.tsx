"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Manda un heartbeat cada HEARTBEAT_INTERVAL_MS mientras la pestaña esté
// visible. El servidor agrupa heartbeats consecutivos en una UsageSession y
// corta la sesión tras 90 s sin actividad.
const HEARTBEAT_INTERVAL_MS = 30_000;
const SESSION_STORAGE_KEY = "tml_usage_session_id";

function inferSurface(pathname: string | null): "chat" | "app" {
  if (!pathname) return "app";
  // /app y /app/conversations/* son superficies de chat (la home de /app
  // renderiza <Chat/>). El resto (/app/goals, /app/diario, /app/comunidad…)
  // cae en "app" como herramientas paralelas al mentor.
  if (pathname === "/app" || pathname.startsWith("/app/conversations")) return "chat";
  if (pathname.startsWith("/chat")) return "chat";
  return "app";
}

async function sendHeartbeat(
  surface: "chat" | "app",
  sessionId: string | null,
): Promise<{ sessionId: string | null; unauthenticated: boolean }> {
  try {
    const res = await fetch("/api/usage/heartbeat", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surface, sessionId }),
      keepalive: true,
    });
    if (res.status === 401) return { sessionId, unauthenticated: true };
    if (!res.ok) return { sessionId, unauthenticated: false };
    const data = (await res.json().catch(() => null)) as { sessionId?: string } | null;
    return { sessionId: data?.sessionId ?? sessionId, unauthenticated: false };
  } catch {
    return { sessionId, unauthenticated: false };
  }
}

export default function UsageTracker() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(null);
  const pathnameRef = useRef<string | null>(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Excluimos admin — no queremos sesiones de admin distorsionando métricas
    if (pathname?.startsWith("/admin")) return;

    // Solo trackeamos superficies de producto (/app, /chat): son las únicas
    // con identidad. En marketing (landing, precios, blog…) el visitante es
    // anónimo y el endpoint devolvía 401 cada 30 s — consola llena de errores
    // y peticiones inútiles (auditoría UX 2026-07-04).
    const isProductSurface =
      pathname === "/app" || pathname?.startsWith("/app/") || pathname?.startsWith("/chat");
    if (!isProductSurface) return;

    if (typeof window === "undefined") return;

    try {
      sessionIdRef.current = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      sessionIdRef.current = null;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") return;
      const surface = inferSurface(pathnameRef.current);
      const result = await sendHeartbeat(surface, sessionIdRef.current);
      if (cancelled) return;
      // Sin identidad (401) no hay nada que medir: paramos el polling en este
      // mount. Al navegar (cambio de pathname) el efecto se rearma y reintenta.
      if (result.unauthenticated) {
        if (timer) clearInterval(timer);
        timer = null;
        return;
      }
      const next = result.sessionId;
      if (next && next !== sessionIdRef.current) {
        sessionIdRef.current = next;
        try {
          window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void tick();
      }
    };

    // Envío "best-effort" al cerrar/navegar fuera — sendBeacon sobrevive al
    // teardown de la página. Acorta la última sesión en vez de esperar al
    // idle timeout de 90 s del servidor.
    const handlePageHide = () => {
      if (!sessionIdRef.current) return;
      const surface = inferSurface(pathnameRef.current);
      const payload = JSON.stringify({ surface, sessionId: sessionIdRef.current });
      try {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon?.("/api/usage/heartbeat", blob);
      } catch {
        /* ignore */
      }
    };

    void tick();
    timer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [pathname]);

  return null;
}
