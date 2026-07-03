"use client";

import { useEffect, useState } from "react";

/**
 * useHideOnScroll — true mientras el usuario hace scroll hacia abajo.
 *
 * Para botones flotantes (widget a11y, reabrir cookies): en móvil tapaban
 * texto del hero, la tarjeta del fundador y enlaces del footer (auditoría UX
 * 2026-07-04). Ocultarlos durante el scroll descendente libera el contenido
 * sin mover su posición (los offsets actuales evitan la barra de chat de /app).
 * Reaparecen al subir o al parar (~900 ms).
 */
export function useHideOnScroll(threshold = 120): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let idle: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY && y > threshold);
      lastY = y;
      clearTimeout(idle);
      idle = setTimeout(() => setHidden(false), 900);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(idle);
    };
  }, [threshold]);

  return hidden;
}
