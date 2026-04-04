'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from '@/styles/design-system';

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_INVALID: 'El email no es válido.',
  EMAIL_TAKEN: 'Ya existe una cuenta con ese email.',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
  SIGNUP_FAILED: 'Error al crear la cuenta. Inténtalo de nuevo.',
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(ERROR_MESSAGES[data.error ?? ''] ?? ERROR_MESSAGES.SIGNUP_FAILED);
        return;
      }
      router.push('/app');
    } catch {
      setError(ERROR_MESSAGES.SIGNUP_FAILED);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Empieza tu viaje</h1>
          <p className="text-zinc-400">Crea tu cuenta en Luciérnaga</p>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" required className="rounded border-zinc-700 bg-zinc-900 mt-0.5" />
            <span className="text-sm text-zinc-400">
              Acepto los{' '}
              <Link href="/terms" className="text-cyan-400 hover:text-cyan-300">Términos</Link>
              {' '}y la{' '}
              <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">Privacidad</Link>
            </span>
          </label>

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
