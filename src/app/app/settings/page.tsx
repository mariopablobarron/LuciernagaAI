'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Bell, Users } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function AppSettingsPage() {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-2xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/app" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Configuración del workspace</h1>
        </div>

        {/* Workspace Info */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <h2 className="text-lg font-semibold text-white">Mi workspace</h2>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Nombre</p>
              <p className="text-white font-semibold">Mi viaje personal</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Creado hace</p>
              <p className="text-white font-semibold">3 meses</p>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Privacidad</h2>
          </div>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <label className="flex items-center justify-between py-2">
              <span className="text-white font-semibold">Modo privado</span>
              <input type="checkbox" defaultChecked className="rounded border-zinc-700 bg-zinc-900 accent-cyan-500" />
            </label>
            <p className="text-xs text-zinc-500">Tus conversaciones no serán compartidas ni analizadas</p>
          </div>
        </div>

        {/* Notifications */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
          </div>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <label className="flex items-center justify-between py-2">
              <span className="text-white font-semibold">Email notifications</span>
              <input type="checkbox" defaultChecked className="rounded border-zinc-700 bg-zinc-900 accent-cyan-500" />
            </label>
          </div>
        </div>

        {/* Workspace Actions */}
        <div className={`${COMPONENTS.card} p-6 space-y-3 border-l-4 border-l-red-500`}>
          <h2 className="text-lg font-semibold text-red-400">Peligro</h2>
          <p className="text-sm text-zinc-400">Estas acciones no se pueden deshacer.</p>
          <button className="w-full py-2 px-4 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors font-semibold">
            Eliminar este workspace
          </button>
        </div>
      </div>
    </div>
  );
}
