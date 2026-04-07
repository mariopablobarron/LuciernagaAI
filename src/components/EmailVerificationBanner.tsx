"use client";

import { useState } from "react";
import { Mail, X, RefreshCw } from "lucide-react";

type Props = {
  emailVerified: boolean;
  isAnonymous: boolean;
  email?: string;
};

export function EmailVerificationBanner({ emailVerified, isAnonymous, email }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Don't show for anonymous users (they don't have a real email)
  // Don't show if already verified or dismissed
  if (isAnonymous || emailVerified || dismissed) return null;

  async function handleResend() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST", credentials: "include" });
      const data = (await res.json()) as { success?: boolean };
      if (data.success) setResent(true);
    } catch {
      // Silent fail — user can try again
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <Mail className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="flex-1 text-amber-200">
        {resent ? (
          <span>Email de verificacion reenviado a <strong>{email}</strong>. Revisa tu bandeja.</span>
        ) : (
          <span>
            Verifica tu email para completar el registro.{" "}
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:text-amber-100 underline underline-offset-2 disabled:opacity-50"
            >
              {resending ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
              {resending ? "Enviando..." : "Reenviar email"}
            </button>
          </span>
        )}
      </div>
      <button onClick={() => setDismissed(true)} className="p-1 text-amber-500 hover:text-amber-300 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
