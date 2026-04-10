"use client";

import { useState, useEffect, useCallback } from "react";

export type A11yPreferences = {
  fontSize: number;        // 0-4 (0 = default)
  highContrast: boolean;
  reducedMotion: boolean;
  dyslexiaFont: boolean;
  linkHighlight: boolean;
  bigCursor: boolean;
  textSpacing: boolean;
};

const STORAGE_KEY = "a11y-preferences";

const DEFAULT_PREFS: A11yPreferences = {
  fontSize: 0,
  highContrast: false,
  reducedMotion: false,
  dyslexiaFont: false,
  linkHighlight: false,
  bigCursor: false,
  textSpacing: false,
};

function loadPrefs(): A11yPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: A11yPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* quota exceeded — silently ignore */ }
}

function applyToDOM(prefs: A11yPreferences) {
  const root = document.documentElement;

  // Font size: remove all, add current
  root.classList.remove("a11y-font-1", "a11y-font-2", "a11y-font-3", "a11y-font-4");
  if (prefs.fontSize > 0) {
    root.classList.add(`a11y-font-${prefs.fontSize}`);
  }

  // Toggle classes
  root.classList.toggle("a11y-high-contrast", prefs.highContrast);
  root.classList.toggle("a11y-reduced-motion", prefs.reducedMotion);
  root.classList.toggle("a11y-dyslexia-font", prefs.dyslexiaFont);
  root.classList.toggle("a11y-link-highlight", prefs.linkHighlight);
  root.classList.toggle("a11y-big-cursor", prefs.bigCursor);
  root.classList.toggle("a11y-text-spacing", prefs.textSpacing);
}

export function useAccessibility() {
  const [prefs, setPrefs] = useState<A11yPreferences>(DEFAULT_PREFS);

  // Load on mount
  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    applyToDOM(loaded);
  }, []);

  const update = useCallback((partial: Partial<A11yPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      applyToDOM(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    savePrefs(DEFAULT_PREFS);
    applyToDOM(DEFAULT_PREFS);
    setPrefs(DEFAULT_PREFS);
  }, []);

  return { prefs, update, reset };
}
