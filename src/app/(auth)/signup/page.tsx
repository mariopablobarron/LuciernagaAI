'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, ArrowRight, MessageCircle } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from '@/styles/design-system';
import { trackEvent } from '@/lib/analytics';
import { trackMetaEvent } from '@/lib/meta-pixel';
import { getUtmParams } from '@/lib/utm';

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_INVALID: 'El email no es válido.',
  EMAIL_TAKEN: 'Ya existe una cuenta con ese email.',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
  SIGNUP_FAILED: 'Error al crear la cuenta. Inténtalo de nuevo.',
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [telegramLink, setTelegramLink] = useState('');

  useEffect(() => {
    const prefill = searchParams.get('email');
    if (prefill) setEmail(prefill);
  }, [searchParams]);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signedUp, setSignedUp] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const utm = getUtmParams();
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, phone: phone || undefined, password, utm }),
      });
      const data = (await res.json()) as { success: boolean; error?: string; telegramLink?: string };
      if (!res.ok || !data.success) {
        setError(ERROR_MESSAGES[data.error ?? ''] ?? ERROR_MESSAGES.SIGNUP_FAILED);
        return;
      }
      if (data.telegramLink) setTelegramLink(data.telegramLink);
      trackEvent('signup_completed');
      trackMetaEvent('CompleteRegistration', { content_name: 'signup' });
      setSignedUp(true);
    } catch {
      setError(ERROR_MESSAGES.SIGNUP_FAILED);
    } finally {
      setLoading(false);
    }
  }

  if (signedUp) {
    return (
      <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-violet-400" />
          </div>
          <div className="space-y-2">
            <h1 className={`${TYPOGRAPHY.h1} text-white`}>Cuenta creada</h1>
            <p className="text-zinc-400">
              Hemos enviado un enlace de verificación a <strong className="text-white">{email}</strong>.
            </p>
          </div>

          {telegramLink && (
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6 space-y-3 hover:bg-cyan-500/15 transition-colors"
            >
              <div className="flex items-center justify-center gap-3">
                <MessageCircle className="w-6 h-6 text-cyan-400" />
                <span className="text-lg font-bold text-white">Llévame contigo en Telegram</span>
              </div>
              <p className="text-sm text-zinc-400">
                Haz clic para conectar tu cuenta. Te acompañaré desde ahí — sin abrir la web.
              </p>
            </a>
          )}

          <div className={`${COMPONENTS.card} p-6 space-y-4`}>
            <p className="text-sm text-zinc-500">No encuentras el email? Revisa la carpeta de spam.</p>
            <button
              onClick={() => router.push('/app')}
              className={`${COMPONENTS.buttonPrimary} w-full py-3 text-base inline-flex items-center justify-center gap-2`}
            >
              Continuar a la app <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="text-3xl mb-1">💓</div>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Primer latido.</h1>
          <p className="text-zinc-400">El primero de muchos que van a contar.</p>
        </div>

        <form onSubmit={handleSubmit} className={`${COMPONENTS.card} p-8 space-y-6`}>
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-semibold text-white">Nombre</label>
            <input
              id="name" type="text" value={name} autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className={COMPONENTS.inputField}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold text-white">Email</label>
            <input
              id="email" type="email" value={email} required autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className={COMPONENTS.inputField}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-semibold text-white">
              Teléfono <span className="text-zinc-500 font-normal">(opcional)</span>
            </label>
            <input
              id="phone" type="tel" value={phone} autoComplete="tel"
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 612 345 678"
              className={COMPONENTS.inputField}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-white">Contraseña</label>
            <div className="relative">
              <input
                id="password" type={showPassword ? 'text' : 'password'} value={password} required
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
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white">
              Confirma tu contraseña
            </label>
            <input
              id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword}
              required autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={COMPONENTS.inputField}
            />
          </div>

          <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Tres Mil Millones de Latidos es un producto en desarrollo activo.
              Al registrarte, aceptas que tus datos conversacionales y emocionales
              se usen de forma anonimizada para mejorar la plataforma.
              Puedes eliminar toda tu informacion en cualquier momento.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" required className="rounded border-zinc-700 bg-zinc-900 mt-0.5" />
              <span className="text-sm text-zinc-400">
                Acepto los{' '}
                <Link href="/terms" className="text-cyan-400 hover:text-cyan-300">Términos</Link>
                {' '}y la{' '}
                <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">Privacidad</Link>
                {' '}y entiendo que es un producto en fase de pruebas
              </span>
            </label>
          </div>

          <button
            type="submit" disabled={loading}
            className={`${COMPONENTS.buttonPrimary} w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-zinc-400">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
