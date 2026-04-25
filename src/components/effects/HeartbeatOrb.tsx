"use client";

/**
 * HeartbeatOrb — esfera radial cinematográfica con pulso lub-dub real.
 *
 * Capas:
 *  - halo exterior coral muy difuso (respira lento)
 *  - aro ámbar medio (ritmo lub-dub)
 *  - núcleo dorado (pulso fuerte sincronizado)
 *  - anillos concéntricos que se expanden y desvanecen
 */
export default function HeartbeatOrb({
  className = "",
  size = 560,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* anillos expansivos */}
      <div className="absolute inset-0 hb-orb-ring" />
      <div className="absolute inset-0 hb-orb-ring hb-orb-ring--delay" />

      {/* halo exterior coral */}
      <div
        className="absolute inset-0 rounded-full hb-orb-halo"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(224,78,58,0.35) 0%, rgba(224,78,58,0.12) 35%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      {/* aro ámbar medio */}
      <div
        className="absolute rounded-full hb-orb-mid"
        style={{
          inset: "18%",
          background:
            "radial-gradient(circle at 50% 50%, rgba(212,165,116,0.55) 0%, rgba(212,165,116,0.2) 50%, transparent 80%)",
          filter: "blur(20px)",
        }}
      />

      {/* núcleo dorado */}
      <div
        className="absolute rounded-full hb-orb-core"
        style={{
          inset: "38%",
          background:
            "radial-gradient(circle at 45% 40%, #F5EEE4 0%, #D4A574 25%, #C49A2C 60%, #6B2818 100%)",
          boxShadow:
            "0 0 60px 10px rgba(224,78,58,0.45), inset 0 0 40px rgba(245,238,228,0.3)",
        }}
      />

      {/* highlight especular */}
      <div
        className="absolute rounded-full"
        style={{
          inset: "40%",
          background:
            "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, transparent 25%)",
          mixBlendMode: "screen",
        }}
      />

      <style jsx>{`
        /* Lub-dub: pulso fuerte (0%), pequeño rebote (15%), reposo largo. ~1.1s ciclo */
        @keyframes hb-lubdub {
          0% { transform: scale(1); }
          7% { transform: scale(1.12); }
          14% { transform: scale(1.02); }
          21% { transform: scale(1.08); }
          30% { transform: scale(1); }
          100% { transform: scale(1); }
        }
        @keyframes hb-halo-breathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes hb-ring-expand {
          0% { transform: scale(0.4); opacity: 0; border-color: rgba(224,78,58,0.55); }
          15% { opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; border-color: rgba(212,165,116,0.05); }
        }
        :global(.hb-orb-halo) { animation: hb-halo-breathe 4.4s ease-in-out infinite; }
        :global(.hb-orb-mid) { animation: hb-lubdub 1.1s ease-out infinite; transform-origin: center; }
        :global(.hb-orb-core) { animation: hb-lubdub 1.1s ease-out infinite; transform-origin: center; }
        :global(.hb-orb-ring) {
          border-radius: 50%;
          border: 1px solid rgba(212,165,116,0.4);
          animation: hb-ring-expand 3.3s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        :global(.hb-orb-ring--delay) {
          animation-delay: 1.65s;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.hb-orb-halo),
          :global(.hb-orb-mid),
          :global(.hb-orb-core),
          :global(.hb-orb-ring) {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
