'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle, Target, Clock } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default async function RetoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/impulso" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Morning Momentum</h1>
        </div>

        {/* Challenge Info */}
        <div className={`${COMPONENTS.card} p-8 space-y-6`}>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className={`${TYPOGRAPHY.h2} text-white`}>Objetivo</h2>
              <p className="text-zinc-300">Crear una rutina matinal consistente de 30 minutos</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-semibold">
              ✓ Activo
            </span>
          </div>

          {/* Progress */}
          <div className="border-t border-zinc-800 pt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">Progreso</span>
                <span className="text-zinc-400">15/21 días</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full w-[71%] bg-gradient-to-r from-violet-500 to-cyan-400" />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t border-zinc-800 pt-6 space-y-3">
            <p className="text-white font-semibold">Próximos pasos</p>
            <div className="space-y-2">
              {[
                { day: 'Hoy', text: 'Completar rutina matinal', done: false },
                { day: 'Mañana', text: 'Agregar meditación de 5 minutos', done: false },
                { day: 'En 3 días', text: 'Alcanzar 18 días consecutivos', done: false },
              ].map((step) => (
                <div key={step.day} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg">
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    step.done ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-white">{step.text}</p>
                    <p className="text-xs text-zinc-500">{step.day}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`${COMPONENTS.card} p-6 space-y-3`}>
          <button className={`${COMPONENTS.buttonPrimary} w-full`}>
            Marcar como completado hoy
          </button>
          <button className={`${COMPONENTS.buttonSecondary} w-full`}>
            Ver historial
          </button>
        </div>
      </div>
    </div>
  );
}
