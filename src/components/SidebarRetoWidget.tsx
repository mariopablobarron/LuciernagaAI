"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Flame, XCircle } from "lucide-react";

type RetoData = {
  id: string;
  title: string;
  type: string;
  completedDays: number;
  totalDays: number;
  status: string;
  checkedInToday: boolean;
  todayDone: boolean;
};

const TYPE_EMOJI: Record<string, string> = {
  ejecucion: "⚡",
  claridad: "🎯",
  disciplina: "🔥",
  energia: "💪",
  social: "🤝",
};

export default function SidebarRetoWidget() {
  const [reto, setReto] = useState<RetoData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/reto-del-dia", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { ok: boolean; reto?: RetoData }) => {
        if (d.ok && d.reto?.status === "active") setReto(d.reto);
      })
      .catch(() => {});
  }, []);

  async function checkin(done: boolean) {
    if (!reto || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/reto-del-dia", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done, note: done ? null : "skip" }),
      });
      const data = (await res.json()) as { ok: boolean; reto?: RetoData };
      if (data.ok && data.reto) setReto(data.reto);
    } finally {
      setLoading(false);
    }
  }

  if (!reto) return null;

  const emoji = TYPE_EMOJI[reto.type] ?? "🎯";
  const alreadyDone = reto.checkedInToday && reto.todayDone;

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-950/10 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
          Reto del día
        </p>
        <span className="flex items-center gap-0.5 text-[10px] text-zinc-600">
          <Flame className="h-2.5 w-2.5 text-orange-500" />
          {reto.completedDays}/{reto.totalDays}
        </span>
      </div>

      <p className="text-xs font-medium leading-snug text-zinc-200">
        {emoji} {reto.title}
      </p>

      {/* Progress bar */}
      <div className="flex gap-0.5">
        {Array.from({ length: Math.min(reto.totalDays, 10) }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < reto.completedDays ? "bg-violet-400" : "bg-zinc-800"
            }`}
          />
        ))}
      </div>

      {reto.checkedInToday ? (
        <div
          className={`flex items-center gap-1.5 text-xs ${
            alreadyDone ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          {alreadyDone ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          {alreadyDone ? "Completado hoy" : "No completado"}
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void checkin(true)}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3 w-3" /> Lo hice
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void checkin(false)}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900/40 py-1.5 text-[11px] text-zinc-400 transition hover:border-zinc-600 disabled:opacity-50"
          >
            <XCircle className="h-3 w-3" /> No pude
          </button>
        </div>
      )}
    </div>
  );
}
