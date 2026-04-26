'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from '@/styles/design-system';
import { CURRENT_CONSENT_VERSION } from '@/lib/legal';

export default function ConsentPage() {
  return (
    <Suspense>
      <ConsentForm />
    </Suspense>
  );
}

function ConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from'); // "google", "legacy", etc.
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!accepted) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/user/consent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentVersion: CURRENT_CONSENT_VERSION }),
      });
      const data = (await res.json()) as { success?: boolean };
      if (!res.ok || !data.success) {
        setError('No pudimos registrar tu aceptación. Prueba en un momento.');
        return;
      }
      router.push('/app');
    } catch {
      setError('Sin conexión. Prueba en un momento.');
    } finally {
      setSubmitting(false);
    }
  }

  const heading = from === 'google' ? 'Una cosa más antes de empezar' : 'Hemos actualizado los términos';
  const intro = from === 'google'
    ? 'Antes de entrar al mentor necesitamos que aceptes los términos del servicio. Es la única vez que te lo pediremos.'
    : 'Hemos actualizado los Términos y la Política de Privacidad. Para seguir usando el mentor, necesitamos que aceptes la nueva versión.';

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="text-3xl mb-1">💓</div>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>{heading}</h1>
          <p className="text-zinc-400">{intro}</p>
        </div>

        <form onSubmit={handleSubmit} className={`${COMPONENTS.card} p-8 space-y-6`}>
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Estamos en fase MVP — cada conversación que tienes nos ayuda a mejorar
              el mentor. Tus datos se tratan de forma confidencial y puedes eliminarlos
              en cualquier momento desde Ajustes.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 mt-0.5"
              />
              <span className="text-sm text-zinc-400">
                Acepto los{' '}
                <Link href="/terms" target="_blank" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Términos</Link>
                {' '}y la{' '}
                <Link href="/privacy" target="_blank" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Privacidad</Link>
                {' '}(versión {CURRENT_CONSENT_VERSION}) y entiendo que es un producto en fase de pruebas que no sustituye a un profesional de salud mental.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!accepted || submitting}
            className={`${COMPONENTS.buttonPrimary} w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {submitting ? 'Guardando…' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
