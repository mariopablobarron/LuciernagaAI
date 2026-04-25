"use client";

import { useEffect, useState } from "react";

type Ember = {
  id: number;
  x: number;
  startY: number;
  size: number;
  riseDuration: number;
  delay: number;
  opacity: number;
  color: string;
  drift: number; // px de deriva horizontal
};

const EMBER_COLORS = [
  "rgba(212,165,116,1)", // ámbar
  "rgba(224,78,58,1)",   // coral
  "rgba(196,154,44,1)",  // dorado quemado
  "rgba(245,238,228,1)", // hueso (chispa blanca ocasional)
];

export default function EmberParticles({ count = 24 }: { count?: number }) {
  const [embers, setEmbers] = useState<Ember[]>([]);

  useEffect(() => {
    const generated: Ember[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      startY: 60 + Math.random() * 50,
      size: 1.5 + Math.random() * 3,
      riseDuration: 14 + Math.random() * 16,
      delay: Math.random() * 18,
      opacity: 0.18 + Math.random() * 0.35,
      color: EMBER_COLORS[i % EMBER_COLORS.length],
      drift: (Math.random() - 0.5) * 80,
    }));
    setEmbers(generated); // eslint-disable-line react-hooks/set-state-in-effect
  }, [count]);

  if (!embers.length) return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      {embers.map((e) => (
        <span
          key={e.id}
          className="absolute block rounded-full ember"
          style={{
            left: `${e.x}%`,
            top: `${e.startY}%`,
            width: `${e.size}px`,
            height: `${e.size}px`,
            background: e.color,
            opacity: e.opacity,
            boxShadow: `0 0 ${e.size * 3}px ${e.color}`,
            animationDuration: `${e.riseDuration}s`,
            animationDelay: `${e.delay}s`,
            // @ts-expect-error custom CSS var
            "--ember-drift": `${e.drift}px`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes ember-rise {
          0% {
            transform: translate(0, 0) scale(0.4);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 0.6;
          }
          100% {
            transform: translate(var(--ember-drift), -110vh) scale(1);
            opacity: 0;
          }
        }
        :global(.ember) {
          animation: ember-rise linear infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.ember) {
            animation: none;
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  );
}
