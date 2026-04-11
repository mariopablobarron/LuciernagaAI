"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TourStep = {
  /** CSS selector for the element to highlight */
  target: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
};

type GuidedTourProps = {
  tourId: string;
  steps: TourStep[];
  delay?: number;
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

function getViewportRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Skip elements that are hidden or off-screen
  if (r.width === 0 || r.height === 0 || r.right < 0 || r.bottom < 0) return null;
  // Return viewport-relative coords (for fixed positioning)
  return { top: r.top, left: r.left, width: r.width, height: r.height };
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
  const [rect, setRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[current];
  const isLast = current === steps.length - 1;

  const finish = useCallback(() => {
    setActive(false);
    markTourDone(tourId);
    onComplete?.();
  }, [tourId, onComplete]);

  // Find next valid step (skip steps whose target doesn't exist)
  const findNextVisibleStep = useCallback((from: number): number => {
    for (let i = from; i < steps.length; i++) {
      if (getViewportRect(steps[i].target)) return i;
    }
    return -1; // no more visible steps
  }, [steps]);

  // Start tour after delay
  useEffect(() => {
    if (isTourDone(tourId) || steps.length === 0) return;
    const timer = setTimeout(() => {
      const firstVisible = findNextVisibleStep(0);
      if (firstVisible >= 0) {
        setCurrent(firstVisible);
        setActive(true);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [tourId, steps.length, delay, findNextVisibleStep]);

  // Update rect when step changes
  useEffect(() => {
    if (!active || !step) return;

    function update() {
      const r = getViewportRect(step.target);
      if (r) {
        setRect(r);
        // Scroll element into view if needed
        const el = document.querySelector(step.target);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    update();
    // Reposition on scroll/resize
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, step, current]);

  const next = useCallback(() => {
    const nextIdx = findNextVisibleStep(current + 1);
    if (nextIdx < 0) {
      finish();
    } else {
      setCurrent(nextIdx);
    }
  }, [current, findNextVisibleStep, finish]);

  // Escape to dismiss
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active || !step || !rect) return null;

  const PAD = 8;
  const TOOLTIP_W = 320;

  // Calculate tooltip position (viewport-relative)
  const preferred = step.placement ?? "bottom";
  let ttTop = 0;
  let ttLeft = 0;

  const gap = 14;
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;

  if (preferred === "bottom" || preferred === "top") {
    ttLeft = Math.max(12, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, viewW - TOOLTIP_W - 12));
    if (preferred === "bottom" && rect.top + rect.height + gap + 160 < viewH) {
      ttTop = rect.top + rect.height + gap;
    } else {
      ttTop = Math.max(12, rect.top - gap - 160);
    }
  } else {
    ttTop = Math.max(12, rect.top + rect.height / 2 - 80);
    if (preferred === "right" && rect.left + rect.width + gap + TOOLTIP_W < viewW) {
      ttLeft = rect.left + rect.width + gap;
    } else {
      ttLeft = Math.max(12, rect.left - TOOLTIP_W - gap);
    }
  }

  // Count visible steps for progress indicator
  const visibleStepIndices: number[] = [];
  for (let i = 0; i < steps.length; i++) {
    if (getViewportRect(steps[i].target)) visibleStepIndices.push(i);
  }
  const currentVisibleIdx = visibleStepIndices.indexOf(current);
  const totalVisible = visibleStepIndices.length;
  const isLastVisible = currentVisibleIdx === totalVisible - 1;

  return (
    <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: "none" }}>
      {/* Dark overlay with cutout for target */}
      <div
        className="absolute inset-0"
        style={{
          pointerEvents: "all",
          background: `radial-gradient(
            ellipse ${rect.width + PAD * 4}px ${rect.height + PAD * 4}px
            at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px,
            transparent 0%,
            transparent 50%,
            rgba(0,0,0,0.7) 51%
          )`,
        }}
        onClick={finish}
      />

      {/* Highlight ring */}
      <div
        className="absolute rounded-xl ring-2 ring-violet-500 ring-offset-2 ring-offset-transparent transition-all duration-300"
        style={{
          pointerEvents: "none",
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/50 p-5 transition-all duration-200"
        style={{
          pointerEvents: "all",
          top: ttTop,
          left: ttLeft,
          width: TOOLTIP_W,
          zIndex: 9999,
        }}
      >
        <button
          onClick={finish}
          className="absolute top-3 right-3 p-1 text-zinc-500 hover:text-white transition-colors rounded-md hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-400">
          Paso {currentVisibleIdx + 1} de {totalVisible}
        </p>
        <h3 className="mt-2 text-sm font-semibold text-white">{step.title}</h3>
        <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={finish} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            Saltar tour
          </button>
          <button
            onClick={isLastVisible ? finish : next}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors"
          >
            {isLastVisible ? "Empezar" : "Siguiente"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {totalVisible > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {visibleStepIndices.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentVisibleIdx ? "w-4 bg-violet-500" : i < currentVisibleIdx ? "w-1.5 bg-violet-500/40" : "w-1.5 bg-zinc-700"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reset utilities ────────────────────────────────────────────────────────

export function resetTour(tourId: string) {
  localStorage.removeItem(STORAGE_PREFIX + tourId);
}

export function resetAllTours() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
}
