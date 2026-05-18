"use client";

/**
 * Hook genérico de swipe horizontal (touch).
 *
 * Devuelve handlers para enganchar al elemento + offset actual para que
 * el componente lo aplique a transform. Cuando el dedo se levanta:
 *   - si el offset supera `threshold`, dispara onTrigger()
 *   - si no, snap a 0
 *
 * Diseño minimalista:
 *  - Solo escucha touch events (no mouse). En desktop el usuario tiene
 *    el botón delete del hover, así que no duplicamos lógica.
 *  - Solo dirección: "left" (la única dirección que ahora hace sentido
 *    para destructivo). Si más adelante hay swipe-right para archivar,
 *    extender el hook.
 *  - Sin animación CSS internal — el componente padre la aplica con
 *    `transform` + `transition` según el offset que devuelve el hook.
 */

import { useCallback, useRef, useState } from "react";

type Options = {
  /** Threshold en pixels para disparar onTrigger al touchend. */
  threshold?: number;
  /** Solo permite swipe hacia la izquierda (negative offset). Default true. */
  leftOnly?: boolean;
  /** Callback al superar el threshold cuando se suelta el dedo. */
  onTrigger: () => void;
  /** Offset máximo visual (limita el viaje aunque el dedo siga). Default 120. */
  maxOffset?: number;
};

export function useSwipeAction({
  threshold = 80,
  leftOnly = true,
  onTrigger,
  maxOffset = 120,
}: Options) {
  const startXRef = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startXRef.current = t.clientX;
    setSwiping(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const t = e.touches[0];
    if (!t) return;
    const delta = t.clientX - startXRef.current;
    // Si leftOnly, ignorar swipes a la derecha (positive delta).
    if (leftOnly && delta > 0) {
      setOffset(0);
      return;
    }
    // Limitar el viaje visual al maxOffset.
    const clamped = Math.max(-maxOffset, Math.min(maxOffset, delta));
    setOffset(clamped);
  }, [leftOnly, maxOffset]);

  const onTouchEnd = useCallback(() => {
    if (startXRef.current === null) return;
    const triggered = Math.abs(offset) >= threshold;
    if (triggered) onTrigger();
    // Reset visual y estado.
    startXRef.current = null;
    setOffset(0);
    setSwiping(false);
  }, [offset, threshold, onTrigger]);

  const onTouchCancel = useCallback(() => {
    startXRef.current = null;
    setOffset(0);
    setSwiping(false);
  }, []);

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    offset,
    swiping,
    /** Progreso 0-1 hacia el threshold. Útil para opacity/scale del reveal. */
    progress: Math.min(1, Math.abs(offset) / threshold),
  };
}
