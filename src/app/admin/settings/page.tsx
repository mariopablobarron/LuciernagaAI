'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Mail, Database } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function AdminSettingsPage() {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Configuración Admin</h1>
        </div>

        {/* Email Configuration */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Email</h2>
          </div>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div>
              <p className="font-semibold text-white mb-2">Servidor SMTP</p>
              <input type="text" className={`${COMPONENTS.inputField} w-full`} placeholder="smtp.example.com" />
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Puerto</p>
              <input type="number" className={`${COMPONENTS.inputField} w-full`} placeholder="587" />
            </div>
          </div>
        </div>

        {/* Database Configuration */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Base de datos</h2>
          </div>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="p-4 bg-zinc-900/50 rounded-lg">
              <p className="text-sm text-zinc-400">
                <strong>Status:</strong> <span className="text-emerald-400">✓ Conectado</span>
              </p>
              <p className="text-sm text-zinc-400 mt-1">
                <strong>Versión:</strong> PostgreSQL 14.2
              </p>
            </div>
            <button className={`${COMPONENTS.buttonSecondary} w-full`}>
              Ejecutar respaldo
            </button>
          </div>
        </div>

        {/* Security */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Seguridad</h2>
          </div>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <label className="flex items-center justify-between py-2">
              <span className="text-white font-semibold">Two-factor authentication</span>
              <input type="checkbox" defaultChecked className="rounded border-zinc-700 bg-zinc-900 accent-cyan-500" />
            </label>
            <label className="flex items-center justify-between py-2">
              <span className="text-white font-semibold">Rate limiting</span>
              <input type="checkbox" defaultChecked className="rounded border-zinc-700 bg-zinc-900 accent-cyan-500" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
