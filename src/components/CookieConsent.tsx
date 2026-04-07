"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't made a choice yet
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === null) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "false");
    setVisible(false);
    // Disable GA4 by setting the opt-out window property
    // gtag respects window['ga-disable-MEASUREMENT_ID']
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const w = window as unknown as Record<string, unknown>;
    if (gaId) {
      w[`ga-disable-${gaId}`] = true;
    }
    // Remove fbq if loaded
    if ("fbq" in window) {
      delete w.fbq;
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de cookies"
      className="fixed inset-x-0 bottom-0 z-[9999] border-t border-zinc-700 bg-zinc-900/95 px-4 py-4 backdrop-blur-sm sm:px-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm leading-relaxed text-zinc-300">
          Usamos cookies para mejorar tu experiencia. Al continuar, aceptas nuestra{" "}
          <a href="/privacy" className="underline underline-offset-2 text-indigo-400 hover:text-indigo-300">
            politica de cookies
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={reject}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            Rechazar
          </button>
          <button
            onClick={accept}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
