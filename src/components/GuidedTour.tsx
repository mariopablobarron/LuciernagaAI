"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TourStep = {
  /** CSS selector for the element to highlight (e.g. "[data-tour='chat-input']") */
  target: string;
  /** Short title */
  title: string;
  /** One or two sentences explaining this element */
  body: string;
  /** Preferred side for the tooltip */
  placement?: "top" | "bottom" | "left" | "right";
};

type GuidedTourProps = {
  /** Unique ID used to persist completion in localStorage */
  tourId: string;
  steps: TourStep[];
  /** Delay (ms) before starting the tour after mount. Default 800. */
  delay?: number;
  /** Called when tour completes or is dismissed */
  onComplete?: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = "tour-done:";

function isTourDone(id: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_PREFIX + id) === "1";
}

function markTourDone(id: string) {
  localStorage.setItem(STORAGE_PREFIX + id, "1");
}

type Rect = { top: number; left: number; width: number; height: number };

function getRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
  };
}

function computeTooltipPosition(
  rect: Rect,
  placement: "top" | "bottom" | "left" | "right",
  tooltipWidth: number,
  tooltipHeight: number,
): { top: number; left: number; actualPlacement: "top" | "bottom" | "left" | "right" } {
  const GAP = 12;
  let top = 0;
  let left = 0;
  let actualPlacement = placement;

  const viewW = window.innerWidth;
  const viewH = window.innerHeight + window.scrollY;

  switch (placement) {
    case "bottom":
      top = rect.top + rect.height + GAP;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      if (top + tooltipHeight > viewH) {
        top = rect.top - tooltipHeight - GAP;
        actualPlacement = "top";
      }
      break;
    case "top":
      top = rect.top - tooltipHeight - GAP;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      if (top < 0) {
        top = rect.top + rect.height + GAP;
        actualPlacement = "bottom";
      }
      break;
    case "right":
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left + rect.width + GAP;
      if (left + tooltipWidth > viewW) {
        left = rect.left - tooltipWidth - GAP;
        actualPlacement = "left";
      }
      break;
    case "left":
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - GAP;
      if (left < 0) {
        left = rect.left + rect.width + GAP;
        actualPlacement = "right";
      }
      break;
  }

  // Clamp to viewport
  left = Math.max(8, Math.min(left, viewW - tooltipWidth - 8));
  top = Math.max(8, top);

  return { top, left, actualPlacement };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GuidedTour({
  tourId,
  steps,
  delay = 800,
  onComplete,
}: GuidedTourProps) {
  const [active, setActive] = useState(false);
  const [current, setCurrent] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<"top" | "bottom" | "left" | "right">("bottom");
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[current];
  const isLast = current === steps.length - 1;

  // Start tour after delay (only if not already completed)
  useEffect(() => {
    if (isTourDone(tourId) || steps.length === 0) return;
    const timer = setTimeout(() => setActive(true), delay);
    return () => clearTimeout(timer);
  }, [tourId, steps.length, delay]);

  // Position tooltip when step changes
  const positionTooltip = useCallback(() => {
    if (!active || !step) return;

    const rect = getRect(step.target);
    if (!rect) {
      // Element not found — skip step
      if (isLast) {
        finish();
      } else {
        setCurrent((c) => c + 1);
      }
      return;
    }

    setTargetRect(rect);

    // Scroll element into view
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Wait a tick for scroll + tooltip to render
    requestAnimationFrame(() => {
      const tw = tooltipRef.current?.offsetWidth ?? 320;
      const th = tooltipRef.current?.offsetHeight ?? 150;
      const { top, left, actualPlacement } = computeTooltipPosition(
        rect,
        step.placement ?? "bottom",
        tw,
        th,
      );
      setTooltipPos({ top, left });
      setPlacement(actualPlacement);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, current, step]);

  useEffect(() => {
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    return () => window.removeEventListener("resize", positionTooltip);
  }, [positionTooltip]);

  const finish = useCallback(() => {
    setActive(false);
    markTourDone(tourId);
    onComplete?.();
  }, [tourId, onComplete]);

  const next = useCallback(() => {
    if (isLast) {
      finish();
    } else {
      setCurrent((c) => c + 1);
    }
  }, [isLast, finish]);

  // Escape to dismiss
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active || !step || !targetRect) return null;

  const PAD = 6;

  // Arrow indicator
  const arrowClass = {
    top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-zinc-700",
    bottom: "top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-zinc-700",
    left: "right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-zinc-700",
    right: "left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-zinc-700",
  }[placement];

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Overlay with hole for target element */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - PAD}
              y={targetRect.top - PAD}
              width={targetRect.width + PAD * 2}
              height={targetRect.height + PAD * 2}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: "all" }}
          onClick={finish}
        />
      </svg>

      {/* Highlight ring around target */}
      <div
        className="absolute rounded-xl ring-2 ring-fuchsia-500/60 ring-offset-2 ring-offset-transparent transition-all duration-300 pointer-events-none"
        style={{
          top: targetRect.top - PAD,
          left: targetRect.left - PAD,
          width: targetRect.width + PAD * 2,
          height: targetRect.height + PAD * 2,
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute w-80 rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/50 p-5 animate-in fade-in slide-in-from-bottom-2 duration-200 z-[9999]"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Arrow */}
        <div className={`absolute w-0 h-0 border-[6px] ${arrowClass}`} />

        {/* Close */}
        <button
          onClick={finish}
          className="absolute top-3 right-3 p-1 text-zinc-500 hover:text-white transition-colors rounded-md hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <p className="text-[11px] font-semibold uppercase tracking-widest text-fuchsia-400">
          Paso {current + 1} de {steps.length}
        </p>
        <h3 className="mt-2 text-sm font-semibold text-white">{step.title}</h3>
        <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{step.body}</p>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Saltar tour
          </button>
          <button
            onClick={next}
            className="flex items-center gap-1.5 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white hover:bg-fuchsia-500 transition-colors"
          >
            {isLast ? "Empezar" : "Siguiente"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress dots */}
        {steps.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === current
                    ? "w-4 bg-fuchsia-500"
                    : i < current
                      ? "w-1.5 bg-fuchsia-500/40"
                      : "w-1.5 bg-zinc-700"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reset utility (for settings / help page) ───────────────────────────────

export function resetTour(tourId: string) {
  localStorage.removeItem(STORAGE_PREFIX + tourId);
}

export function resetAllTours() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
}
