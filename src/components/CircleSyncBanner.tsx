"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";

/**
 * Banner shown in the cafetería / community entry when the user's circle
 * has an active or imminent (≤2h away) synchronous session. Silent if
 * there's none — zero noise.
 */
export function CircleSyncBanner() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/community/circle/sync/current", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return null;
        const j = (await r.json()) as { sessionId: string | null };
        return j.sessionId;
      })
      .then((id) => {
        if (!cancelled) setSessionId(id);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !sessionId) return null;

  return (
    <Link
      href={`/community/circle/sync/${sessionId}`}
      className="group block rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/15 via-zinc-900/60 to-zinc-950 p-4 shadow-lg hover:border-violet-400/60 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-full bg-violet-500/20 p-2">
          <Users className="h-4 w-4 text-violet-300" />
        </div>
        <div className="flex-1 space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">
            Tu círculo se está reuniendo
          </p>
          <p className="text-sm text-zinc-100">
            Entra al espacio sincrónico. Pocos minutos, una pregunta, vuestras voces escribiéndose a la vez.
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-violet-300 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
