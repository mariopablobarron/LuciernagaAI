'use client';

import Link from 'next/link';
import { ArrowLeft, Bell, Lock, Eye, Globe } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function SettingsPage() {
  return (
    <div className={`bg-linear-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/app" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Configuración</h1>
        </div>

        {/* Notifications Section */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
          </div>

          <div className="space-y-4 border-t border-zinc-800 pt-4">
            {[
              { label: 'Recordatorios de check-in', desc: 'Notificaciones diarias para check-ins' },
              { label: 'Nuevos insights', desc: 'Cuando tengas nuevas recomendaciones' },
              { label: 'Objetivos completados', desc: 'Celebraciones cuando termines un objetivo' },
              { label: 'Actualizaciones importantes', desc: 'Cambios y nuevas funciones' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-zinc-700 bg-zinc-900 accent-cyan-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Section */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Privacidad</h2>
          </div>

          <div className="space-y-4 border-t border-zinc-800 pt-4">
            {[
              { label: 'Perfil visible', desc: 'Otros usuarios pueden ver tu perfil público' },
              { label: 'Compartir estadísticas', desc: 'Permitir que se usen tus datos anónimos para mejorar el producto' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-zinc-700 bg-zinc-900 accent-cyan-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Security Section */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Seguridad</h2>
          </div>

          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <button className={`${COMPONENTS.buttonSecondary} w-full`}>
              Cambiar contraseña
            </button>
            <button className={`${COMPONENTS.buttonSecondary} w-full`}>
              Activar autenticación de dos factores
            </button>
            <button className={`${COMPONENTS.buttonSecondary} w-full`}>
              Ver sesiones activas
            </button>
          </div>
        </div>

        {/* Theme Section */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Preferencias</h2>
          </div>

          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <div>
              <p className="font-semibold text-white mb-3">Idioma</p>
              <select className={`${COMPONENTS.inputField} w-full`}>
                <option>Español</option>
                <option>English</option>
                <option>Português</option>
              </select>
            </div>
            <div>
              <p className="font-semibold text-white mb-3">Zona horaria</p>
              <select className={`${COMPONENTS.inputField} w-full`}>
                <option>America/Argentina/Buenos_Aires</option>
                <option>America/Mexico_City</option>
                <option>Europe/Madrid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={`${COMPONENTS.card} p-6 space-y-3 border-l-4 border-l-red-500`}>
          <h2 className="text-lg font-semibold text-red-400">Zona de peligro</h2>
          <p className="text-sm text-zinc-400">Estas acciones no se pueden deshacer.</p>
          <button className="w-full py-2 px-4 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors font-semibold">
            Eliminar mi cuenta y todos mis datos
          </button>
        </div>
      </div>
    </div>
  );
}
