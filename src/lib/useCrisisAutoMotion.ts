"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Reduce motion automático tras crisis.
 *
 * Cuando el sistema detecta que la conversación ha entrado en estado de
 * crisis (panel rojo con teléfonos, variant: "crisis" en algún mensaje
 * reciente), activamos `html.a11y-reduced-motion-auto` durante 30
 * minutos. CSS la trata igual que `a11y-reduced-motion` (clase manual
 * del AccessibilityWidget), pero como clases SEPARADAS para no pisar
 * la preferencia explícita del usuario.
 *
 * Filosofía: en un episodio de crisis emocional, las animaciones del
 * producto (gradientes pulsando, dots animados, spinners brillantes)
 * pueden saturar más. Bajamos el ritmo visual sin pedir permiso, y
 * volvemos al ritmo normal 30 min después si el usuario no ha
 * configurado a11y manual.
 *
 * Cero UI: silencioso, no se anuncia. Si el usuario abre el a11y
 * widget, su toggle "Reduce motion" sigue mostrando su preferencia
 * personal (no la auto).
 */

type MessageLike = { variant?: string | null };

const RECENT_WINDOW = 3;          // últimos N mensajes a inspeccionar
const AUTO_DURATION_MS = 30 * 60 * 1000; // 30 min

export function useCrisisAutoMotion(messages: ReadonlyArray<MessageLike> | null | undefined): void {
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detección: ¿hay variant="crisis" en últimos N mensajes?
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const recent = messages.slice(-RECENT_WINDOW);
    const hasCrisis = recent.some((m) => m?.variant === "crisis");

    if (!hasCrisis) return;

    // Activar (o re-activar el timer si ya estaba). Resetea la ventana
    // de 30 min cada vez que aparece un nuevo mensaje crisis.
    setActive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActive(false);
      timeoutRef.current = null;
    }, AUTO_DURATION_MS);
  }, [messages]);

  // Cleanup al desmontar.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Aplicar/quitar clase del <html> según estado.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("a11y-reduced-motion-auto", active);
    return () => {
      // Si el componente se desmonta con la clase activa, la dejamos.
      // El cleanup del timer (otro useEffect) maneja la expiración.
    };
  }, [active]);
}
