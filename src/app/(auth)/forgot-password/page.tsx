'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from '@/styles/design-system';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success to avoid email enumeration
      setSubmitted(true);
    } catch {
      setError(t('forgot.errorSend'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md space-y-8">
        <div>
          <Link href="/login" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm mb-6 py-2">
            <ArrowLeft className="w-4 h-4" />
            {t('forgot.back')}
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>{t('forgot.title')}</h1>
          <p className="text-zinc-400 mt-2">{t('forgot.subtitle')}</p>
        </div>

        {submitted ? (
          <div className={`${COMPONENTS.card} p-8 space-y-4 text-center`}>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-semibold text-white">{t('forgot.doneTitle')}</h2>
            <p className="text-zinc-400 text-sm">{t('forgot.doneBody')}</p>
            <Link href="/login" className="block text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
              {t('forgot.back')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={`${COMPONENTS.card} p-8 space-y-6`}>
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-white">{t('shared.emailLabel')}</label>
              <input
                id="email" type="email" value={email} required autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('shared.emailPlaceholder')}
                className={COMPONENTS.inputField}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className={`${COMPONENTS.buttonPrimary} w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {loading ? t('forgot.submitting') : t('forgot.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
