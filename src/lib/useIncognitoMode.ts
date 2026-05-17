"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Modo incógnito frontend — el usuario activa "no recordar nada" en este
 * dispositivo/sesión. Cuando está ON:
 *  - No se persisten drafts en localStorage.
 *  - No se restaura la última conversación al volver.
 *  - Se muestra banner permanente para que el usuario sepa el estado.
 *
 * Storage: `localStorage.tmm:incognito` (boolean string). Único valor que
 * usamos para que el toggle SÍ persista entre tabs/recargas — si no, el
 * usuario tendría que reactivarlo cada vez, contradictorio.
 *
 * Limitaciones honestas:
 *  - La BD del servidor SÍ guarda mensajes durante la sesión (necesario
 *    para que el LLM tenga historial). Para borrar realmente, ver feature
 *    #1 (borrado con swipe) o setting de auto-purge.
 *  - Si el usuario activa incógnito DESPUÉS de chatear, los mensajes
 *    previos siguen en BD. Para garantía total: activar incógnito antes
 *    del primer mensaje.
 */

const STORAGE_KEY = "tmm:incognito";

export function useIncognitoMode(): {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
} {
  // SSR-safe: false inicial; cliente sincroniza tras mount.
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setEnabledState(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage no disponible (Safari en privado, etc.) — incógnito
      // efectivamente forzado por el navegador.
      setEnabledState(false);
    }
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    if (typeof window === "undefined") return;
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY, "1");
        // Limpiar drafts existentes al activar (clean slate).
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("chat-draft:") || key === "chat-draft") {
            localStorage.removeItem(key);
          }
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore — sin localStorage, igualmente honramos el estado en memoria
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  return { enabled, setEnabled, toggle };
}
