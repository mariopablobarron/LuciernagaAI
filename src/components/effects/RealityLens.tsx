"use client";

import { type ReactNode, useCallback, useRef, useState } from "react";

interface RealityLensProps {
  surface: ReactNode;
  revealed: ReactNode;
  size?: number;
  className?: string;
}

export default function RealityLens({
  surface,
  revealed,
  size = 150,
  className,
}: RealityLensProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );
  const [tapped, setTapped] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [reducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const radius = size / 2;

  const updatePos = useCallback(
    (clientX: number, clientY: number) => {
      if (rafRef.current || !containerRef.current) return;
      rafRef.current = true;
      requestAnimationFrame(() => {
        const rect = containerRef.current!.getBoundingClientRect();
        setPos({ x: clientX - rect.left, y: clientY - rect.top });
        setHasInteracted(true);
        rafRef.current = false;
      });
    },
    [],
  );

  const handleMouse = useCallback(
    (e: React.MouseEvent) => updatePos(e.clientX, e.clientY),
    [updatePos],
  );

  const handleTouch = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (t) updatePos(t.clientX, t.clientY);
    },
    [updatePos],
  );

  // Reduced motion: simple split view
  if (reducedMotion) {
    return (
      <div className={`grid grid-cols-2 gap-4 ${className ?? ""}`}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Lo que ves</p>
          {surface}
        </div>
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-violet-400">Lo que hay</p>
          {revealed}
        </div>
      </div>
    );
  }

  const clipPath = isMobile
    ? tapped
      ? `circle(${radius}px at 50% 50%)`
      : "circle(0px at 50% 50%)"
    : hasInteracted
      ? `circle(${radius}px at ${pos.x}px ${pos.y}px)`
      : "circle(0px at 50% 50%)";

  return (
    <div
      ref={containerRef}
      className={`relative cursor-crosshair select-none overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 ${className ?? ""}`}
      onMouseMove={!isMobile ? handleMouse : undefined}
      onMouseLeave={() => { if (!isMobile) setHasInteracted(false); }}
      onTouchStart={isMobile ? () => setTapped((v) => !v) : undefined}
      onTouchMove={isMobile ? handleTouch : undefined}
      role="region"
      aria-label="Lente de realidad: mueve el cursor para revelar otra perspectiva"
    >
      {/* Hint */}
      {!hasInteracted && !tapped && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-zinc-600 animate-pulse">
            {isMobile ? "Toca para revelar" : "Mueve el cursor para revelar"}
          </p>
        </div>
      )}

      {/* Surface layer */}
      <div className="p-5">{surface}</div>

      {/* Revealed layer (masked) */}
      <div
        className="absolute inset-0 p-5 transition-[clip-path] duration-100 ease-out"
        style={{
          clipPath,
          willChange: "clip-path",
          background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,234,0.05))",
        }}
      >
        {revealed}
      </div>

      {/* Lens ring (decorative) */}
      {hasInteracted && !isMobile && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-violet-500/40"
          style={{
            width: size,
            height: size,
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 20px rgba(139,92,246,0.2), inset 0 0 15px rgba(6,182,234,0.08)",
          }}
        />
      )}
    </div>
  );
}
