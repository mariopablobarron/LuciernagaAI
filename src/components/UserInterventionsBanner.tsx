"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HeartHandshake, X, CheckCircle2 } from "lucide-react";

type Intervention = {
  id: string;
  type: string;
  content: string;
  status: "sent" | "read" | "resolved";
  sentAt: string;
  adminId: string;
};

/**
 * Shows pending clinical interventions to the user as a dismissable banner
 * at the top of the app. Silently no-ops if there are no pending items.
 *
 * An intervention is a message from the clinical team (or the automated
 * triage, e.g. after a severe PHQ-9 result). It must reach the user —
 * unlike marketing messages, these are clinically relevant and should
 * not be hidden behind notifications.
 *
 * Mounted in src/app/app/page.tsx. Self-contained, no props.
 */
export function UserInterventionsBanner() {
  const [items, setItems] = useState<Intervention[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const markedReadRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user/interventions", {
        credentials: "include",
      });
      if (!res.ok) return;
      const json = (await res.json()) as {
        success: boolean;
        interventions: Intervention[];
      };
      setItems(json.interventions ?? []);
    } catch {
      // Silent — never break the app because of this
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Mark the currently-top intervention as "read" once the user has
  // clearly seen it (after 2s of display). This preserves the "resolved"
  // status for explicit acknowledgement.
  useEffect(() => {
    if (items.length === 0) return;
    const top = items[0];
    if (top.status !== "sent") return;
    if (markedReadRef.current.has(top.id)) return;
    const t = setTimeout(() => {
      markedReadRef.current.add(top.id);
      void fetch("/api/user/interventions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: top.id, status: "read" }),
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [items]);

  async function resolve(id: string) {
    setBusy(id);
    try {
      await fetch("/api/user/interventions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "resolved" }),
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // Silent
    } finally {
      setBusy(null);
    }
  }

  if (!loaded || items.length === 0) return null;

  const top = items[0];
  const typeLabel =
    top.type === "resource"
      ? "Recurso del equipo"
      : top.type === "recommendation"
        ? "Recomendación"
        : top.type === "assessment"
          ? "Evaluación sugerida"
          : "Mensaje del equipo";

  return (
    <div className="mb-3 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-zinc-900/60 to-zinc-950 p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-full bg-rose-500/20 p-2">
          <HeartHandshake className="h-4 w-4 text-rose-300" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-300">
              {typeLabel}
            </p>
            {items.length > 1 && (
              <span className="text-[10px] text-zinc-500">
                {items.length} pendientes
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-zinc-100 whitespace-pre-wrap">
            {top.content}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => resolve(top.id)}
              disabled={busy === top.id}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {busy === top.id ? "Marcando..." : "Entendido"}
            </button>
            <button
              type="button"
              onClick={() => resolve(top.id)}
              disabled={busy === top.id}
              aria-label="Cerrar"
              className="rounded-xl p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
