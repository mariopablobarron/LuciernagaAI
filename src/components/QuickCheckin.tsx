"use client";

import { useState } from "react";

const MOODS = [
  { emoji: "🤩", label: "Genial", value: 5, color: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" },
  { emoji: "😊", label: "Bien", value: 4, color: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" },
  { emoji: "😐", label: "Regular", value: 3, color: "bg-zinc-500/15 border-zinc-500/40 text-zinc-300" },
  { emoji: "😔", label: "Bajo", value: 2, color: "bg-amber-500/15 border-amber-500/40 text-amber-300" },
  { emoji: "😞", label: "Mal", value: 1, color: "bg-red-500/15 border-red-500/40 text-red-300" },
] as const;

type Props = {
  userId?: string;
  onComplete?: () => void;
};

export default function QuickCheckin({ onComplete }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSelect(value: number) {
    if (loading || sent) return;
    setSelected(value);
    setLoading(true);
    try {
      const mood = MOODS.find((m) => m.value === value);
      await fetch("/api/checkin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: mood?.label ?? "Regular", mood: mood?.label.toLowerCase() ?? "regular", energyLevel: value }),
      });
      setSent(true);
      onComplete?.();
    } catch {
      // silently fail — check-in is best-effort
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    const mood = MOODS.find((m) => m.value === selected);
    return (
      <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 ${mood?.color ?? "border-border bg-muted/40"}`}>
        <span className="text-base">{mood?.emoji ?? "✓"}</span>
        <p className="text-sm text-muted-foreground">Check-in registrado. ¡Gracias!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground mb-2.5">¿Cómo estás hoy?</p>
      <div className="flex items-center gap-1.5">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            disabled={loading}
            onClick={() => void handleSelect(mood.value)}
            aria-label={mood.label}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 transition hover:scale-105 active:scale-95 disabled:opacity-50 border ${
              selected === mood.value ? mood.color : "border-transparent hover:bg-accent"
            }`}
          >
            <span className="text-lg">{mood.emoji}</span>
            <span className="text-[10px] text-muted-foreground">{mood.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
