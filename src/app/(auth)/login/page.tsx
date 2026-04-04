'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from '@/styles/design-system';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Bienvenido de vuelta</h1>
          <p className="text-zinc-400">Accede a tu cuenta de Luciernaga</p>
        </div>

        {/* Form */}
        <form className={`${COMPONENTS.card} p-8 space-y-6`}>
          {/* Email */}
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
              className={COMPONENTS.inputField}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-white">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={COMPONENTS.inputField}
            />
          </div>

          {/* Remember & Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-zinc-700 bg-zinc-900" />
              <span className="text-zinc-400">Recuérdame</span>
            </label>
            <Link href="/forgot-password" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            animated
          >
            Inicia sesión
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-zinc-950 text-zinc-500">O</span>
          </div>
        </div>

        {/* Sign up link */}
        <div className="text-center">
          <p className="text-zinc-400">
            ¿No tienes cuenta?{' '}
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>

        {/* Legal */}
        <p className="text-xs text-zinc-600 text-center">
          Al ingresar, aceptas nuestros{' '}
          <Link href="/terms" className="text-cyan-400 hover:text-cyan-300">
            Términos
          </Link>
          {' '}y{' '}
          <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">
            Privacidad
          </Link>
        </p>
      </div>
    </div>
  );
}
