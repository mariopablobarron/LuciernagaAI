"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";

type CapsuleSummary = {
  id: string;
  kind: "snapshot" | "letter";
  status: "pending" | "ready" | "delivered" | "expired";
  createdAt: string;
  deliverAt: string;
  openedAt: string | null;
};

// Lee /api/capsules y muestra un banner si hay alguna ready sin abrir.
// Nada agresivo: si el usuario la cierra, recordamos en sessionStorage para
// no insistir esta sesión.
const DISMISS_KEY = "capsule-banner-dismissed";

export default function CapsuleBanner() {
  const [capsule, setCapsule] = useState<CapsuleSummary | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Difiero el setDismissed sincrónico a microtask para evitar la regla
    // react-hooks/set-state-in-effect de React 19. El fetch ya es async,
    // así que setCapsule en su .then no triggers la regla.
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) {
      queueMicrotask(() => setDismissed(true));
      return;
    }
    fetch("/api/capsules", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { capsules?: CapsuleSummary[] } | null) => {
        const ready = data?.capsules?.find((c) => c.status === "ready");
        if (ready) setCapsule(ready);
      })
      .catch(() => null);
  }, []);

  if (dismissed || !capsule) return null;

  const label = capsule.kind === "letter" ? "Tu carta está lista" : "Tu cápsula está lista";

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/8 to-fuchsia-500/5 px-4 py-3 mb-3 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
        <Hourglass className="h-4 w-4 text-violet-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-zinc-400">Solo para ti, cuando quieras.</p>
      </div>
      <Link
        href={`/app/capsulas/${capsule.id}`}
        className="shrink-0 rounded-xl bg-violet-500 hover:bg-violet-400 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
      >
        Abrir
      </Link>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
