'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from '@/styles/design-system';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md space-y-8">
        {/* Back button */}
        <Link href="/login" className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver a login
        </Link>

        {!submitted ? (
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className={`${TYPOGRAPHY.h1} text-white`}>¿Olvidaste tu contraseña?</h1>
              <p className="text-zinc-400">Te enviaremos un link para resetearla</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className={`${COMPONENTS.card} p-8 space-y-6`}>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-white">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className={COMPONENTS.inputField}
                />
              </div>

              <button
                type="submit"
                className={`${COMPONENTS.buttonPrimary} w-full`}
              >
                Enviar link de reseteo
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Success message */}
            <div className="text-center space-y-4">
              <div className="text-5xl">✓</div>
              <h1 className={`${TYPOGRAPHY.h1} text-white`}>Email enviado</h1>
              <p className="text-zinc-400">
                Hemos enviado un link de reseteo a <strong>{email}</strong>
              </p>
            </div>

            {/* Info card */}
            <div className={`${COMPONENTS.card} p-6 space-y-3`}>
              <p className="font-semibold text-white">¿Qué hacer ahora?</p>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>✓ Revisa tu email (incluyendo spam)</li>
                <li>✓ Haz clic en el link de reseteo</li>
                <li>✓ Crea una nueva contraseña</li>
              </ul>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <button
                onClick={() => setSubmitted(false)}
                className={`${COMPONENTS.buttonSecondary} w-full`}
              >
                Probar con otro email
              </button>
              <Link
                href="/login"
                className={`${COMPONENTS.buttonPrimary} block w-full text-center`}
              >
                Volver a login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
