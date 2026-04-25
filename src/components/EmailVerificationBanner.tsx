"use client";

import { useEffect, useState } from "react";
import { Mail, X, RefreshCw } from "lucide-react";

type Props = {
  emailVerified: boolean;
  isAnonymous: boolean;
  email?: string;
};

const DISMISS_KEY = "verify_email_dismissed_at";
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

export function EmailVerificationBanner({ emailVerified, isAnonymous, email }: Props) {
  const [dismissed, setDismissed] = useState(true); // Hide initially to avoid flash; show after check.
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persiste dismiss en localStorage 24h: deja de molestar cada recarga.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      const ts = raw ? Number(raw) : 0;
      if (!ts || Date.now() - ts > DISMISS_COOLDOWN_MS) {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage puede no estar disponible
    }
  }

  if (isAnonymous || emailVerified || dismissed) return null;

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST", credentials: "include" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setResent(true);
      } else if (res.status === 429) {
        setError("Demasiados intentos. Espera un poco antes de reintentar.");
      } else {
        setError("No pudimos enviar el email. Inténtalo de nuevo más tarde.");
      }
    } catch {
      setError("Error de conexión. Revisa tu internet e inténtalo de nuevo.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
      <Mail className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0 text-amber-200">
        {resent ? (
          <span className="truncate block">
            Email reenviado a <strong className="hidden sm:inline">{email}</strong>
            <span className="sm:hidden">tu correo</span>. Revisa tu bandeja.
          </span>
        ) : error ? (
          <span>
            <span className="text-red-300">{error}</span>{" "}
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:text-amber-100 underline underline-offset-2 disabled:opacity-50"
            >
              Reintentar
            </button>
          </span>
        ) : (
          <span>
            <span className="hidden sm:inline">Verifica tu email para completar el registro.</span>
            <span className="sm:hidden">Verifica tu email.</span>{" "}
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:text-amber-100 underline underline-offset-2 disabled:opacity-50"
            >
              {resending ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
              {resending ? "Enviando..." : "Reenviar"}
            </button>
          </span>
        )}
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Recordarme más tarde"
        className="p-1 text-amber-500 hover:text-amber-300 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
