"use client";

import { useState } from "react";

const MOODS = [
  { emoji: "😄", label: "Bien", value: 4 },
  { emoji: "😐", label: "Regular", value: 2 },
  { emoji: "😔", label: "Mal", value: 0 },
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
      await fetch("/api/checkin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energyLevel: value }),
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
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-2.5">
        <span className="text-base">{MOODS.find((m) => m.value === selected)?.emoji ?? "✓"}</span>
        <p className="text-sm text-muted-foreground">Check-in registrado. ¡Gracias!</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-2.5">
      <p className="text-xs font-medium text-muted-foreground shrink-0">¿Cómo estás hoy?</p>
      <div className="flex items-center gap-1">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            disabled={loading}
            onClick={() => void handleSelect(mood.value)}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-sm transition hover:bg-accent active:scale-95 disabled:opacity-50 ${
              selected === mood.value ? "bg-accent ring-1 ring-primary/30" : ""
            }`}
            title={mood.label}
          >
            <span>{mood.emoji}</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">{mood.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
