"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Flame, ChevronRight, Sparkles } from "lucide-react";

type RetoData = {
  id: string;
  title: string;
  instructions: string;
  successMetric: string;
  type: string;
  estimatedMinutes: number;
  dayNumber: number;
  totalDays: number;
  completedDays: number;
  progress: number;
  status: string;
  checkedInToday: boolean;
  todayDone: boolean;
  validationNote: string | null;
};

const TYPE_EMOJI: Record<string, string> = {
  ejecucion: "⚡",
  claridad: "🎯",
  disciplina: "🔥",
  energia: "💪",
  social: "🤝",
};

type Props = {
  userId?: string;
  onFailed?: (retoTitle: string) => void;
  onCompleted?: () => void;
};

export default function RetoDiario({ userId, onFailed, onCompleted }: Props) {
  const [reto, setReto] = useState<RetoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [noReto, setNoReto] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [justActed, setJustActed] = useState<"done" | "skip" | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch("/api/user/reto-del-dia", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { ok: boolean; reto?: RetoData }) => {
        if (d.ok && d.reto && d.reto.status === "active") {
          setReto(d.reto);
        } else if (d.ok) {
          setNoReto(true);
        }
      })
      .catch(() => {});
  }, [userId]);

  async function generateReto() {
    if (generating) return;
    setGenerating(true);
    setNoReto(false);
    try {
      const res = await fetch("/api/user/reto-del-dia", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { ok: boolean; reto?: RetoData; error?: string };
      if (data.ok && data.reto) {
        setReto(data.reto);
      } else {
        setNoReto(true);
      }
    } catch {
      setNoReto(true);
    } finally {
      setGenerating(false);
    }
  }

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
      const data = (await res.json()) as {
        ok: boolean;
        reto?: RetoData;
        justCompleted?: boolean;
      };
      if (data.ok && data.reto) {
        setReto(data.reto);
        setJustActed(done ? "done" : "skip");
        if (!done) onFailed?.(reto.title);
        if (data.justCompleted) {
          onCompleted?.();
          // Backend auto-generates next challenge; show generating state after brief delay
          setTimeout(() => {
            setReto(null);
            setGenerating(true);
            fetch("/api/user/reto-del-dia", { credentials: "include" })
              .then((r) => r.json())
              .then((d: { ok: boolean; reto?: RetoData }) => {
                if (d.ok && d.reto?.status === "active") setReto(d.reto);
                else setNoReto(true);
              })
              .catch(() => setNoReto(true))
              .finally(() => setGenerating(false));
          }, 3000);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (!reto && !noReto && !generating) return null;

  // ── No active challenge: generate prompt ─────────────────────────────────────
  if (!reto) {
    return (
      <div className="mx-3 mt-3 overflow-hidden rounded-2xl border border-violet-500/15 bg-violet-950/10 px-4 py-3">
        {generating ? (
          <div className="flex items-center gap-2 text-sm text-violet-400">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Generando tu reto personalizado...
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-violet-400">Sin reto activo</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Analizo tu historial y creo un reto a tu medida.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void generateReto()}
              className="shrink-0 flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" /> Generar
            </button>
          </div>
        )}
      </div>
    );
  }

  const emoji = TYPE_EMOJI[reto.type] ?? "🎯";
  const alreadyDone = reto.checkedInToday && reto.todayDone;
  const alreadySkipped = reto.checkedInToday && !reto.todayDone;

  // ── Already checked in: compact status ──────────────────────────────────────
  if (reto.checkedInToday) {
    return (
      <div
        className={`mx-3 mt-3 flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm ${
          alreadyDone
            ? "border-emerald-500/20 bg-emerald-950/20"
            : "border-amber-500/20 bg-amber-950/15"
        }`}
      >
        {alreadyDone ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-amber-400" />
        )}
        <span className={alreadyDone ? "text-emerald-300" : "text-amber-300"}>
          {emoji} {reto.title}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs text-zinc-600">
          <Flame className="h-3 w-3 text-orange-500" />
          {reto.completedDays}/{reto.totalDays}
        </span>
      </div>
    );
  }

  // ── Pending check-in ─────────────────────────────────────────────────────────
  return (
    <div className="mx-3 mt-3 overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-950/15">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-lg">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              Reto del día · Día {reto.dayNumber} de {reto.totalDays}
            </p>
          </div>
          <p className="mt-0.5 truncate text-sm font-medium text-zinc-200">{reto.title}</p>
        </div>
        {/* Progress dots */}
        <div className="flex shrink-0 items-center gap-1">
          {Array.from({ length: Math.min(reto.totalDays, 7) }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i < reto.completedDays ? "bg-violet-400" : "bg-zinc-700"
              }`}
            />
          ))}
          {reto.totalDays > 7 && (
            <span className="text-[10px] text-zinc-600">+{reto.totalDays - 7}</span>
          )}
        </div>
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-zinc-600 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {/* Expanded: instructions + buttons */}
      {expanded && (
        <div className="border-t border-violet-500/10 px-4 pb-4 pt-3 space-y-4">
          <p className="text-sm text-zinc-400 leading-relaxed">{reto.instructions}</p>
          <p className="text-xs text-violet-400/70 italic">
            Métrica de éxito: {reto.successMetric}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => void checkin(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Lo hice ✓
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void checkin(false)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/40 py-2.5 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-300 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              No pude
            </button>
          </div>
        </div>
      )}

      {/* Collapsed quick-action buttons */}
      {!expanded && (
        <div className="flex gap-2 border-t border-violet-500/10 px-4 pb-3 pt-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => void checkin(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Lo hice
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void checkin(false)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/40 py-2 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" /> No pude
          </button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-400 transition"
          >
            Ver
          </button>
        </div>
      )}
    </div>
  );
}
