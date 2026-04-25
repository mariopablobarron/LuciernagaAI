"use client";

/**
 * EditorialPulse — visual cinematográfico monocromo.
 * ECG horizontal con un único acento ámbar que recorre la línea, sin
 * ruido de partículas. Pensado para hero editorial: contención, no decoración.
 */
export default function EditorialPulse({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative w-full overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        className="w-full h-full block"
      >
        <defs>
          <linearGradient id="ep-fade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#0a0a0a" stopOpacity="1" />
            <stop offset="8%" stopColor="#0a0a0a" stopOpacity="0" />
            <stop offset="92%" stopColor="#0a0a0a" stopOpacity="0" />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
          </linearGradient>
          <filter id="ep-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* línea base muy sutil */}
        <path
          d="M 0 100 L 1200 100"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
          fill="none"
        />

        {/* trazo ECG completo, blanco hueso */}
        <path
          id="ep-path"
          d="M 0 100 L 240 100 L 280 100 L 300 80 L 320 130 L 340 40 L 360 160 L 380 90 L 400 100 L 720 100 L 760 100 L 780 80 L 800 130 L 820 40 L 840 160 L 860 90 L 880 100 L 1200 100"
          stroke="rgba(245,238,228,0.55)"
          strokeWidth="1.25"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* recorrido luminoso ámbar — dash animado */}
        <path
          d="M 0 100 L 240 100 L 280 100 L 300 80 L 320 130 L 340 40 L 360 160 L 380 90 L 400 100 L 720 100 L 760 100 L 780 80 L 800 130 L 820 40 L 840 160 L 860 90 L 880 100 L 1200 100"
          stroke="#D4A574"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="120 1500"
          filter="url(#ep-glow)"
          className="ep-trace"
        />

        {/* máscara de fundido en los bordes */}
        <rect x="0" y="0" width="1200" height="200" fill="url(#ep-fade)" />
      </svg>

      <style jsx>{`
        :global(.ep-trace) {
          animation: ep-march 7s linear infinite;
        }
        @keyframes ep-march {
          from {
            stroke-dashoffset: 1620;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.ep-trace) {
            animation: none;
            opacity: 0.35;
          }
        }
      `}</style>
    </div>
  );
}
