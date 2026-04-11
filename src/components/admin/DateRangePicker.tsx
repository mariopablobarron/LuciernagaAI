"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

export type DateRange = {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
  label: string;
};

const PRESETS: { label: string; days: number }[] = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 7 },
  { label: "14 días", days: 14 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
  { label: "6 meses", days: 180 },
  { label: "1 año", days: 365 },
];

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);

  function selectPreset(preset: { label: string; days: number }) {
    const to = toISODate(new Date());
    const from = preset.days === 0 ? to : daysAgo(preset.days);
    onChange({ from, to, label: preset.label });
    setOpen(false);
  }

  function applyCustom() {
    if (customFrom && customTo) {
      onChange({ from: customFrom, to: customTo, label: `${customFrom} → ${customTo}` });
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-violet-500/40 transition-colors"
      >
        <Calendar className="h-3.5 w-3.5 text-violet-400" />
        {value.label}
        <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 z-50 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50 p-3 space-y-3">
            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => selectPreset(p)}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    value.label === p.label
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[10px] text-zinc-600">Personalizado</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            {/* Custom date inputs */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 focus:border-violet-500 focus:outline-none"
              />
              <span className="text-xs text-zinc-600">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo}
              className="w-full rounded-lg bg-violet-500 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition-colors"
            >
              Aplicar rango
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Helper to get default range (last 30 days)
export function defaultRange(): DateRange {
  return { from: daysAgo(30), to: toISODate(new Date()), label: "30 días" };
}
