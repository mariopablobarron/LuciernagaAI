"use client";

import { type ReactNode, useState } from "react";
import { Glasses } from "lucide-react";

interface GlassesToggleProps {
  before: ReactNode;
  after: ReactNode;
  label?: string;
  className?: string;
}

export default function GlassesToggle({
  before,
  after,
  label = "Ponte las gafas",
  className,
}: GlassesToggleProps) {
  const [on, setOn] = useState(false);

  return (
    <div className={className}>
      <div className="relative min-h-[3rem]">
        {/* Before layer */}
        <div
          className="transition-all duration-500 ease-out"
          style={{
            filter: on ? "blur(4px) grayscale(1)" : "blur(0) grayscale(0)",
            opacity: on ? 0 : 1,
            position: on ? "absolute" : "relative",
            inset: 0,
          }}
        >
          {before}
        </div>

        {/* After layer */}
        <div
          className="transition-all duration-500 ease-out"
          style={{
            filter: on ? "blur(0) grayscale(0)" : "blur(4px) grayscale(1)",
            opacity: on ? 1 : 0,
            position: on ? "relative" : "absolute",
            inset: 0,
          }}
        >
          {after}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOn((v) => !v);
          }
        }}
        aria-pressed={on}
        aria-label={label}
        className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95 ${
          on
            ? "border border-violet-500/50 bg-violet-500/20 text-violet-300"
            : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        }`}
      >
        <Glasses className="h-4 w-4" />
        {on ? "Quitar gafas" : label}
      </button>
    </div>
  );
}
