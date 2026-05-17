'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from '@/styles/design-system';
import { useSfx } from '@/lib/useSfx';
import { trackEvent } from '@/lib/analytics';
import { trackMetaEvent } from '@/lib/meta-pixel';

// Códigos backend → keys en messages.auth.shared.errors.
const KNOWN_ERROR_CODES = new Set([
  "EMAIL_INVALID", "INVALID_CREDENTIALS", "LOGIN_FAILED",
  "oauth_invalid_state", "oauth_failed", "google_not_configured",
]);

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const sfx = useSfx();
  const justVerified = searchParams.get('verified') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const oauthError = searchParams.get('error');
  const initialError = oauthError
    ? (KNOWN_ERROR_CODES.has(oauthError) ? t(`shared.errors.${oauthError}`) : t('shared.errors.generic'))
    : '';
  const [error, setError] = useState(initialError);

  function errorMessage(code: string | undefined): string {
    if (code && KNOWN_ERROR_CODES.has(code)) return t(`shared.errors.${code}`);
    return t('shared.errors.LOGIN_FAILED');
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(errorMessage(data.error));
        return;
      }
      sfx.play('heartbeat');
      trackEvent('login_completed');
      trackMetaEvent('Login');
      router.push('/app');
    } catch {
      setError(t('shared.errors.LOGIN_FAILED'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="text-3xl mb-1">💓</div>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>{t('login.title')}</h1>
          <p className="text-zinc-400">{t('login.subtitle')}</p>
        </div>

        {justVerified && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{t('login.justVerified')}</span>
          </div>
        )}

        <div className={`${COMPONENTS.card} p-8 space-y-6`}>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- OAuth flow requires full page navigation, not client-side routing */}
          <a
            href="/api/auth/google"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {t('shared.continueWithGoogle')}
          </a>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">{t('shared.orWithEmail')}</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
        </div>

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

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-white">{t('shared.passwordLabel')}</label>
            <div className="relative">
              <input
                id="password" type={showPassword ? 'text' : 'password'} value={password} required
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('shared.passwordPlaceholder')}
                className={`${COMPONENTS.inputField} pr-11`}
              />
              <button
                type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label={showPassword ? t('shared.hidePassword') : t('shared.showPassword')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end text-sm">
            <Link href="/forgot-password" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              {t('login.forgotLink')}
            </Link>
          </div>

          <button
            type="submit" disabled={loading}
            className={`${COMPONENTS.buttonPrimary} w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <div className="text-center">
          <p className="text-zinc-400">
            {t('login.noAccount')}{' '}
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              {t('login.signupLink')}
            </Link>
          </p>
        </div>
        <p className="text-xs text-zinc-600 text-center">
          {t('login.termsLine')}{' '}
          <Link href="/terms" className="text-cyan-400 hover:text-cyan-300">{t('login.termsLink')}</Link>
          {' '}{t('login.and')}{' '}
          <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">{t('login.privacyLink')}</Link>
        </p>
      </div>
    </div>
  );
}
