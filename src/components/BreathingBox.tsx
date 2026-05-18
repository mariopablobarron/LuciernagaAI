"use client";

/**
 * Caja de respiración 4-7-8 — componente reutilizable.
 *
 * Animación de respiración guiada en bucle:
 *   - 4s inhalar (círculo se expande)
 *   - 7s retener (círculo grande)
 *   - 8s exhalar (círculo se contrae)
 *
 * Usado por EmergencyShelter (overlay de crisis) y BreathingModal
 * (acceso permanente desde el chat para momentos de tensión).
 *
 * Props:
 *  - size: "md" (200px) | "lg" (280px). Default md.
 *  - paused: si true, congela la animación en la fase actual.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type BreathPhase = "inhale" | "hold" | "exhale";

const BREATH_DURATIONS: Record<BreathPhase, number> = {
  inhale: 4000,
  hold: 7000,
  exhale: 8000,
};
const BREATH_ORDER: BreathPhase[] = ["inhale", "hold", "exhale"];

const SIZE_MD = { large: 200, small: 100 };
const SIZE_LG = { large: 280, small: 140 };

type Props = {
  size?: "md" | "lg";
  paused?: boolean;
};

export function BreathingBox({ size = "md", paused = false }: Props) {
  const t = useTranslations("emergencyShelter");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phase = BREATH_ORDER[phaseIdx];
  const dims = size === "lg" ? SIZE_LG : SIZE_MD;

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => {
      setPhaseIdx((idx) => (idx + 1) % BREATH_ORDER.length);
    }, BREATH_DURATIONS[phase]);
    return () => clearTimeout(id);
  }, [phase, phaseIdx, paused]);

  const visualSize = phase === "inhale" ? dims.large : phase === "hold" ? dims.large : dims.small;

  return (
    <div
      className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 via-violet-500/20 to-fuchsia-500/15 ring-1 ring-cyan-400/40"
      style={{
        width: visualSize,
        height: visualSize,
        transition: paused
          ? "none"
          : `width ${BREATH_DURATIONS[phase]}ms ease-in-out, height ${BREATH_DURATIONS[phase]}ms ease-in-out`,
      }}
    >
      <span className="text-base font-medium text-zinc-200">
        {t(`breath.${phase}`)}
      </span>
    </div>
  );
}
