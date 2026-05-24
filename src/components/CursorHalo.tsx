"use client";

/**
 * Design Spell — halo radial sutil que sigue el cursor dentro del área
 * del chat. Da sensación de presencia/acompañamiento sin ser invasivo.
 *
 * Diseño:
 *  - Solo mouse (touch events excluidos): no aporta nada en táctil y
 *    además mantiene la performance de scroll en móvil intacta.
 *  - El halo es un radial-gradient muy suave (24px de radio, opacity
 *    bajo, blur 12px). NO marca un círculo duro — es luz que respira.
 *  - Se renderiza como hijo absoluto dentro del área del chat, con
 *    pointer-events: none para no robar clicks.
 *  - Off completo con prefers-reduced-motion y las clases a11y.
 *  - Throttle implícito vía requestAnimationFrame — máximo 1 update
 *    por frame, suave sin saturar.
 *
 * Inspirado en patrones de designspells.com.
 */

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Referencia al contenedor donde el halo debe vivir y trackear. */
  containerRef: React.RefObject<HTMLElement | null>;
};

export function CursorHalo({ containerRef }: Props) {
  const haloRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    // Respeta prefers-reduced-motion del sistema. Las clases manuales
    // a11y-reduced-motion / a11y-quiet-read se respetan via CSS.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const flush = () => {
      rafRef.current = null;
      const pending = pendingRef.current;
      const halo = haloRef.current;
      if (!pending || !halo) return;
      halo.style.transform = `translate3d(${pending.x - 12}px, ${pending.y - 12}px, 0)`;
    };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      pendingRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(flush);
    };

    const onEnter = () => setVisible(true);
    const onLeave = () => setVisible(false);

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseenter", onEnter);
    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseenter", onEnter);
      container.removeEventListener("mouseleave", onLeave);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef]);

  return (
    <div
      ref={haloRef}
      aria-hidden="true"
      className="tmm-cursor-halo pointer-events-none absolute top-0 left-0 h-6 w-6 rounded-full"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
        background: "radial-gradient(circle, rgba(120,200,255,0.18) 0%, rgba(120,200,255,0) 70%)",
        filter: "blur(8px)",
        willChange: "transform, opacity",
      }}
    />
  );
}
