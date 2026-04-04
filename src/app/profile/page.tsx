'use client';

import Link from 'next/link';
import { ArrowLeft, Mail, Calendar, MapPin, Edit2 } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function ProfilePage() {
  return (
    <div className={`bg-linear-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-2xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/app" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Tu perfil</h1>
        </div>

        {/* Profile Card */}
        <div className={`${COMPONENTS.card} p-8 space-y-6`}>
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-2xl font-bold text-white">
                JD
              </div>
              <div className="space-y-2">
                <h2 className={`${TYPOGRAPHY.h2} text-white`}>Juan Díaz</h2>
                <p className="text-zinc-400">Miembro desde hace 3 meses</p>
              </div>
            </div>
            <Link
              href="/profile/edit"
              className={`${COMPONENTS.buttonSecondary} inline-flex items-center gap-2`}
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Link>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Email</p>
                <p className="text-white font-semibold">juan@example.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-violet-400" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Miembro desde</p>
                <p className="text-white font-semibold">12 de enero, 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Ubicación</p>
                <p className="text-white font-semibold">Buenos Aires, Argentina</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className={`${LAYOUTS.gridThreeCol}`}>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            <p className="text-3xl font-bold text-cyan-400">47</p>
            <p className="text-sm text-zinc-400">Conversaciones</p>
          </div>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            <p className="text-3xl font-bold text-violet-400">12</p>
            <p className="text-sm text-zinc-400">Objetivos completados</p>
          </div>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            <p className="text-3xl font-bold text-cyan-400">23</p>
            <p className="text-sm text-zinc-400">Días consecutivos</p>
          </div>
        </div>

        {/* Account Actions */}
        <div className={`${COMPONENTS.card} p-6 space-y-3`}>
          <h3 className="font-semibold text-white mb-4">Acciones de cuenta</h3>
          <button className={`${COMPONENTS.buttonSecondary} w-full`}>
            Cambiar contraseña
          </button>
          <button className={`${COMPONENTS.buttonSecondary} w-full`}>
            Descargar mis datos
          </button>
          <button className="w-full py-2 px-4 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors font-semibold">
            Eliminar cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
