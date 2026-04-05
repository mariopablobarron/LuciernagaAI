"use client";

import { useEffect, useState } from "react";

type Particle = {
  id: number;
  x: number;
  startY: number;
  size: number;
  riseDuration: number;
  pulseDuration: number;
  delay: number;
  opacity: number;
  color: string;
};

// Brand palette — violet / fuchsia / cyan / rose
const COLORS = [
  "rgba(167,139,250,1)",  // violet-400
  "rgba(232,121,249,1)",  // fuchsia-400
  "rgba(34,211,238,1)",   // cyan-400
  "rgba(251,113,133,1)",  // rose-400
  "rgba(192,132,252,1)",  // purple-400
];

export default function HeartbeatParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const COUNT = 18;
    const generated: Particle[] = Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      // distribute horizontally with a bit of noise so they spread naturally
      x: (i / COUNT) * 102 + (Math.random() - 0.5) * 9,
      // start in the lower 80 % of the viewport so rise is visible
      startY: 22 + Math.random() * 74,
      size: 0.55 + Math.random() * 0.95,         // 0.55–1.5 rem
      riseDuration: 11 + Math.random() * 13,      // 11–24 s per cycle
      pulseDuration: 0.95 + Math.random() * 0.75, // 0.95–1.7 s heartbeat
      delay: i * 1.1 + Math.random() * 4,         // staggered start
      opacity: 0.06 + Math.random() * 0.13,       // 0.06–0.19 (very subtle)
      color: COLORS[i % COLORS.length],
    }));
    setParticles(generated); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!particles.length) return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        /*
         * Two-layer animation:
         *   outer div  → hb-rise   (translateY + fade-out over full cycle)
         *   inner span → hb-pulse  (lub-dub scale, independent rhythm)
         */
        <div
          key={p.id}
          className="absolute hb-rise"
          style={{
            left: `${p.x}%`,
            top: `${p.startY}%`,
            animationDuration: `${p.riseDuration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
            willChange: "transform, opacity",
          }}
        >
          <span
            className="block hb-pulse"
            style={{
              fontSize: `${p.size}rem`,
              color: p.color,
              animationDuration: `${p.pulseDuration}s`,
              animationDelay: `${p.delay}s`,
              willChange: "transform",
            }}
          >
            ♥
          </span>
        </div>
      ))}
    </div>
  );
}
