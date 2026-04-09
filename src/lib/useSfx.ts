"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Storage key ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "latidos-sfx-enabled";

function readPref(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === "1";
}

// ─── Synth helpers (Web Audio API — no files needed) ─────────────────────────

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as { __latidosCtx?: AudioContext };
  if (!W.__latidosCtx) {
    W.__latidosCtx = new AudioContext();
  }
  return W.__latidosCtx;
}

/** Soft sine tone — used as building block */
function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  vol: number,
  type: OscillatorType = "sine",
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + Math.min(dur * 0.15, 0.04));
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur);
}

// ─── Sound definitions ───────────────────────────────────────────────────────

/** Double-thump heartbeat — the signature sound */
function playHeartbeat(ctx: AudioContext) {
  const t = ctx.currentTime;
  // First beat (low thump)
  tone(ctx, 55, t, 0.12, 0.25);
  tone(ctx, 110, t, 0.08, 0.12);
  // Second beat (slightly higher, softer)
  tone(ctx, 60, t + 0.15, 0.10, 0.18);
  tone(ctx, 120, t + 0.15, 0.06, 0.08);
}

/** Warm rising chime — action completed, check-in saved */
function playSuccess(ctx: AudioContext) {
  const t = ctx.currentTime;
  tone(ctx, 523, t, 0.15, 0.12);        // C5
  tone(ctx, 659, t + 0.1, 0.15, 0.12);  // E5
  tone(ctx, 784, t + 0.2, 0.25, 0.10);  // G5
}

/** Single soft note — new message received */
function playMessage(ctx: AudioContext) {
  const t = ctx.currentTime;
  tone(ctx, 880, t, 0.08, 0.06);        // A5 — subtle ping
  tone(ctx, 1320, t + 0.03, 0.12, 0.04); // E6 harmonic
}

/** Low warm tone — new conversation */
function playOpen(ctx: AudioContext) {
  const t = ctx.currentTime;
  tone(ctx, 262, t, 0.3, 0.10);  // C4
  tone(ctx, 330, t + 0.05, 0.25, 0.07); // E4
}

/** Celebratory arpeggio — milestone reached */
function playMilestone(ctx: AudioContext) {
  const t = ctx.currentTime;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    tone(ctx, freq, t + i * 0.1, 0.3, 0.10);
  });
}

/** Soft click — generic UI interaction */
function playTap(ctx: AudioContext) {
  const t = ctx.currentTime;
  tone(ctx, 600, t, 0.04, 0.05, "triangle");
}

// ─── Map ─────────────────────────────────────────────────────────────────────

const SOUNDS = {
  heartbeat: playHeartbeat,
  success: playSuccess,
  message: playMessage,
  open: playOpen,
  milestone: playMilestone,
  tap: playTap,
} as const;

export type SfxName = keyof typeof SOUNDS;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSfx() {
  const [enabled, setEnabled] = useState(readPref);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const play = useCallback((name: SfxName) => {
    if (!enabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => SOUNDS[name](ctx));
    } else {
      SOUNDS[name](ctx);
    }
  }, []);

  return { enabled, toggle, play };
}
