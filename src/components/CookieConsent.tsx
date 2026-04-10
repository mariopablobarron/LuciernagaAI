"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "cookie_consent";
const META_STORAGE_KEY = "meta_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [hasChosen, setHasChosen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      setVisible(true);
    } else {
      setHasChosen(true);
      setAnalytics(stored === "true");
      setMarketing(localStorage.getItem(META_STORAGE_KEY) === "true");
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(META_STORAGE_KEY, "true");
    setVisible(false);
    setHasChosen(true);
    setAnalytics(true);
    setMarketing(true);
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "false");
    localStorage.setItem(META_STORAGE_KEY, "false");
    setVisible(false);
    setHasChosen(true);
    setAnalytics(false);
    setMarketing(false);
    disableTracking();
  }

  function savePreferences() {
    localStorage.setItem(STORAGE_KEY, analytics ? "true" : "false");
    localStorage.setItem(META_STORAGE_KEY, marketing ? "true" : "false");
    if (!analytics || !marketing) disableTracking();
    setShowPrefs(false);
    setHasChosen(true);
    window.location.reload();
  }

  function disableTracking() {
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const w = window as unknown as Record<string, unknown>;
    if (gaId) w[`ga-disable-${gaId}`] = true;
    if ("fbq" in window) delete w.fbq;
  }

  // Preference center dialog
  if (showPrefs) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Preferencias de cookies</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Esenciales</p>
                <p className="text-xs text-zinc-500">Necesarias para que la app funcione</p>
              </div>
              <div className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-zinc-400">Siempre activas</div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Analytics (GA4)</p>
                <p className="text-xs text-zinc-500">Nos ayudan a mejorar la experiencia</p>
              </div>
              <button
                onClick={() => setAnalytics((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${analytics ? "bg-indigo-600" : "bg-zinc-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${analytics ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Marketing (Meta Pixel)</p>
                <p className="text-xs text-zinc-500">Publicidad personalizada</p>
              </div>
              <button
                onClick={() => setMarketing((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${marketing ? "bg-indigo-600" : "bg-zinc-700"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${marketing ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowPrefs(false)}
              className="flex-1 rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              onClick={savePreferences}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Guardar
            </button>
          </div>

          <p className="text-center text-xs text-zinc-600">
            <a href="/privacy" className="underline underline-offset-2 hover:text-zinc-400">Politica de privacidad</a>
          </p>
        </div>
      </div>
    );
  }

  // Initial consent banner
  if (visible) {
    return (
      <div
        role="dialog"
        aria-label="Consentimiento de cookies"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-700 bg-zinc-900/95 px-4 py-4 backdrop-blur-sm sm:px-6"
      >
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <p className="flex-1 text-sm leading-relaxed text-zinc-300">
            Usamos cookies para mejorar tu experiencia. Al continuar, aceptas nuestra{" "}
            <a href="/privacy" className="underline underline-offset-2 text-indigo-400 hover:text-indigo-300">
              politica de cookies
            </a>
            .
          </p>
          <div className="flex w-full sm:w-auto shrink-0 flex-col sm:flex-row gap-2">
            <button
              onClick={reject}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              Rechazar
            </button>
            <button
              onClick={() => { setVisible(false); setShowPrefs(true); }}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              Personalizar
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

  // Floating button to reopen preferences (only after initial choice)
  if (hasChosen) {
    return (
      <button
        onClick={() => setShowPrefs(true)}
        className="fixed bottom-4 left-4 z-40 rounded-full border border-zinc-700/50 bg-zinc-800/80 p-3 min-h-11 min-w-11 flex items-center justify-center text-zinc-500 backdrop-blur-sm transition-all hover:border-zinc-600 hover:text-zinc-300"
        title="Preferencias de cookies"
      >
        <Cookie className="h-4 w-4" />
      </button>
    );
  }

  return null;
}
