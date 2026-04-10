"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X, Smartphone } from "lucide-react";

/**
 * PWA Install Prompt — shows a banner on mobile after 30s inviting
 * the user to add the app to their home screen.
 *
 * - Captures the `beforeinstallprompt` event (Chrome/Edge/Samsung)
 * - On iOS Safari, shows manual instructions (no native prompt)
 * - Remembers dismissal for 7 days via localStorage
 * - Only shows on mobile devices
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa_install_dismissed";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 30_000; // 30 seconds

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (isNaN(ts)) return false;
  return Date.now() - ts < DISMISS_DAYS * 86400000;
}

function dismiss() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function InstallPWA() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Don't show if already installed, not mobile, or dismissed
    if (isStandalone() || !isMobile() || isDismissed()) return;

    // Capture the beforeinstallprompt event (Chrome/Edge/Samsung)
    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handlePrompt);

    // Show banner after delay
    const timer = setTimeout(() => {
      if (!isDismissed() && !isStandalone()) {
        setShow(true);
      }
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      // Chrome/Edge — native prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS()) {
      // iOS — show manual instructions
      setShowIOSGuide(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    dismiss();
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
      <div className="mx-auto max-w-md rounded-2xl border border-violet-500/30 bg-zinc-900/95 backdrop-blur-lg p-4 shadow-2xl shadow-violet-500/10">
        {!showIOSGuide ? (
          <>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30">
                <Smartphone className="h-5 w-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  Accede mas rapido
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Instala Tres Mil Millones de Latidos en tu movil como una app.
                  Sin descargas, sin tienda.
                </p>
              </div>
              <button onClick={handleDismiss} className="shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition-colors"
              >
                <Download className="h-4 w-4" />
                {isIOS() ? "Ver como instalar" : "Instalar app"}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-xl border border-zinc-700 px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Ahora no
              </button>
            </div>
          </>
        ) : (
          /* iOS manual guide */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Como instalar en iPhone</p>
              <button onClick={handleDismiss} className="text-zinc-600 hover:text-zinc-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3">
                <span className="text-lg">1.</span>
                <p>Pulsa el boton <strong className="text-white">Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra de Safari</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3">
                <span className="text-lg">2.</span>
                <p>Desplaza hacia abajo y pulsa <strong className="text-white">&quot;Anadir a pantalla de inicio&quot;</strong></p>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3">
                <span className="text-lg">3.</span>
                <p>Pulsa <strong className="text-white">&quot;Anadir&quot;</strong> y listo</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="w-full rounded-xl bg-zinc-800 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors">
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
