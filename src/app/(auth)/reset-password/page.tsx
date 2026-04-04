"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from "@/styles/design-system";

const ERROR_MESSAGES: Record<string, string> = {
  TOKEN_REQUIRED: "El enlace no es válido.",
  INVALID_TOKEN: "El enlace no es válido o ya fue usado.",
  EXPIRED_TOKEN: "El enlace ha caducado. Solicita uno nuevo.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  RESET_FAILED: "Error al restablecer. Inténtalo de nuevo.",
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!token) {
      setError(ERROR_MESSAGES.TOKEN_REQUIRED);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(ERROR_MESSAGES[data.error ?? ""] ?? ERROR_MESSAGES.RESET_FAILED);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/app"), 2000);
    } catch {
      setError(ERROR_MESSAGES.RESET_FAILED);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className={`${COMPONENTS.card} p-8 text-center space-y-4`}>
        <p className="text-red-400 text-sm">Enlace inválido. Solicita uno nuevo.</p>
        <Link href="/forgot-password" className="text-cyan-400 hover:text-cyan-300 text-sm">
          Recuperar contraseña
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className={`${COMPONENTS.card} p-8 text-center space-y-4`}>
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-lg font-semibold text-white">¡Contraseña actualizada!</h2>
        <p className="text-zinc-400 text-sm">Redirigiendo a la app…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${COMPONENTS.card} p-8 space-y-6`}>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
          {(error === ERROR_MESSAGES.INVALID_TOKEN || error === ERROR_MESSAGES.EXPIRED_TOKEN) && (
            <span> <Link href="/forgot-password" className="underline text-cyan-400">Solicita uno nuevo</Link>.</span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold text-white">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id="password" type={showPassword ? "text" : "password"} value={password} required
            minLength={8} autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className={`${COMPONENTS.inputField} pr-11`}
          />
          <button
            type="button" onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm" className="block text-sm font-semibold text-white">
          Confirmar contraseña
        </label>
        <input
          id="confirm" type={showPassword ? "text" : "password"} value={confirmPassword} required
          autoComplete="new-password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className={COMPONENTS.inputField}
        />
      </div>

      <button
        type="submit" disabled={loading}
        className={`${COMPONENTS.buttonPrimary} w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {loading ? "Guardando…" : "Establecer nueva contraseña"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Nueva contraseña</h1>
          <p className="text-zinc-400">Elige una contraseña segura para tu cuenta.</p>
        </div>
        <Suspense fallback={<div className="text-zinc-500 text-sm text-center">Cargando…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
