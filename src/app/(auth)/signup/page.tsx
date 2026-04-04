'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TYPOGRAPHY, COMPONENTS, GRADIENTS } from '@/styles/design-system';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Empieza tu viaje</h1>
          <p className="text-zinc-400">Crea tu cuenta en Luciernaga</p>
        </div>

        {/* Form */}
        <form className={`${COMPONENTS.card} p-8 space-y-6`}>
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-semibold text-white">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Tu nombre"
              className={COMPONENTS.inputField}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold text-white">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
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
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              className={COMPONENTS.inputField}
            />
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="rounded border-zinc-700 bg-zinc-900 mt-0.5" required />
            <span className="text-sm text-zinc-400">
              Acepto los{' '}
              <Link href="/terms" className="text-cyan-400 hover:text-cyan-300">
                Términos
              </Link>
              {' '}y la{' '}
              <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">
                Privacidad
              </Link>
            </span>
          </label>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            animated
          >
            Crear cuenta
          </Button>
        </form>

        {/* Sign in link */}
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
