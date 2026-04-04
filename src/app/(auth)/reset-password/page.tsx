"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from "@/styles/design-system";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === confirmPassword && password.length >= 8) {
      setSubmitted(true);
    }
  };

  if (!token) {
    return (
      <div
        className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} flex items-center justify-center px-4`}
      >
        <div className={`${COMPONENTS.card} p-8 text-center max-w-md`}>
          <h1 className={`${TYPOGRAPHY.h1} text-white mb-4`}>Link inválido</h1>
          <p className="text-zinc-400">Este link de reseteo no es válido o ha expirado.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}
    >
      <div className="w-full max-w-md space-y-8">
        {!submitted ? (
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className={`${TYPOGRAPHY.h1} text-white`}>Nueva contraseña</h1>
              <p className="text-zinc-400">Elige una contraseña fuerte para tu cuenta</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className={`${COMPONENTS.card} p-8 space-y-6`}>
              {/* New Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-white">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className={COMPONENTS.inputField}
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white">
                  Confirma tu contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className={COMPONENTS.inputField}
                />
              </div>

              {password !== confirmPassword && password && confirmPassword && (
                <p className="text-xs text-red-400">Las contraseñas no coinciden</p>
              )}

              <button
                type="submit"
                disabled={password !== confirmPassword || password.length < 8}
                className={`${COMPONENTS.buttonPrimary} w-full disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Resetear contraseña
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Success */}
            <div className="text-center space-y-4">
              <div className="text-5xl">✓</div>
              <h1 className={`${TYPOGRAPHY.h1} text-white`}>¡Listo!</h1>
              <p className="text-zinc-400">Tu contraseña ha sido actualizada exitosamente</p>
            </div>

            {/* CTA */}
            <Link href="/login" className={`${COMPONENTS.buttonPrimary} block w-full text-center`}>
              Inicia sesión con tu nueva contraseña
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
