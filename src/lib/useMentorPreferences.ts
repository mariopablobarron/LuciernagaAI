"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Preferencias explícitas del usuario sobre cómo quiere que le hable el
 * mentor. Persiste en localStorage para que sobreviva entre tabs/recargas.
 *
 * - noInterpretation: si true, el mentor NO interpreta ni analiza.
 *   Algunos usuarios solo quieren ser escuchados, no diagnosticados.
 * - verbosity: 1-5, donde 3 = comportamiento actual (default, no
 *   inyecta nada al prompt). 1 = mínimo, 5 = máximo.
 *
 * Estas prefs viajan en el body de cada llamada a /api/chat y se
 * inyectan al system prompt via buildCoachPrompt.
 */

const STORAGE_KEY = "tmm:mentor-prefs";

export type MentorPreferences = {
  noInterpretation: boolean;
  verbosity: number; // 1-5
};

const DEFAULTS: MentorPreferences = {
  noInterpretation: false,
  verbosity: 3,
};

function load(): MentorPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<MentorPreferences>;
    return {
      noInterpretation: typeof parsed.noInterpretation === "boolean" ? parsed.noInterpretation : DEFAULTS.noInterpretation,
      verbosity:
        typeof parsed.verbosity === "number" && parsed.verbosity >= 1 && parsed.verbosity <= 5
          ? Math.round(parsed.verbosity)
          : DEFAULTS.verbosity,
    };
  } catch {
    return DEFAULTS;
  }
}

function save(prefs: MentorPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* localStorage no disponible o cuota llena — silently ignore */
  }
}

export function useMentorPreferences(): {
  prefs: MentorPreferences;
  setNoInterpretation: (v: boolean) => void;
  setVerbosity: (v: number) => void;
  reset: () => void;
  /** Forma compacta para enviar al endpoint /api/chat. Devuelve null si están en defaults. */
  toApiPayload: () => { noInterpretation?: boolean; verbosity?: number } | null;
} {
  const [prefs, setPrefs] = useState<MentorPreferences>(DEFAULTS);

  useEffect(() => {
    setPrefs(load());
  }, []);

  const setNoInterpretation = useCallback((value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, noInterpretation: value };
      save(next);
      return next;
    });
  }, []);

  const setVerbosity = useCallback((value: number) => {
    setPrefs((prev) => {
      const clamped = Math.max(1, Math.min(5, Math.round(value)));
      const next = { ...prev, verbosity: clamped };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULTS);
    save(DEFAULTS);
  }, []);

  const toApiPayload = useCallback(() => {
    const payload: { noInterpretation?: boolean; verbosity?: number } = {};
    if (prefs.noInterpretation) payload.noInterpretation = true;
    if (prefs.verbosity !== 3) payload.verbosity = prefs.verbosity;
    return Object.keys(payload).length > 0 ? payload : null;
  }, [prefs]);

  return { prefs, setNoInterpretation, setVerbosity, reset, toApiPayload };
}
