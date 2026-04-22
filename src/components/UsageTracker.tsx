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
  if (pathname.startsWith("/chat") || pathname.startsWith("/app/chat")) return "chat";
  return "app";
}

async function sendHeartbeat(
  surface: "chat" | "app",
  sessionId: string | null,
): Promise<string | null> {
  try {
    const res = await fetch("/api/usage/heartbeat", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surface, sessionId }),
      keepalive: true,
    });
    if (!res.ok) return sessionId;
    const data = (await res.json().catch(() => null)) as { sessionId?: string } | null;
    return data?.sessionId ?? sessionId;
  } catch {
    return sessionId;
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
      const next = await sendHeartbeat(surface, sessionIdRef.current);
      if (cancelled) return;
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

    void tick();
    timer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [pathname]);

  return null;
}
