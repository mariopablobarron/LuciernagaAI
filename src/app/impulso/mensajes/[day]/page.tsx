'use client';

import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function MessageDetailPage({ params }: { params: { day: string } }) {
  const day = parseInt(params.day);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/impulso/mensajes" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`${TYPOGRAPHY.h1} text-white`}>Tu primera semana</h1>
            <p className="text-zinc-400 flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              Día {day} del programa
            </p>
          </div>
        </div>

        {/* Message Content */}
        <div className={`${COMPONENTS.card} p-8 space-y-6`}>
          <div className="prose prose-invert max-w-none space-y-6">
            <div>
              <h2 className={`${TYPOGRAPHY.h2} text-white mb-4`}>Tu primer paso</h2>
              <p className="text-zinc-300 leading-relaxed">
                El hecho de que estés aquí, leyendo esto, significa que algo en ti quiere cambiar. 
                No es un pensamiento pequeño. Es todo.
              </p>
            </div>

            <div className="border-t border-zinc-800 pt-6">
              <h2 className={`${TYPOGRAPHY.h2} text-white mb-4`}>Lo que aprendiste</h2>
              <p className="text-zinc-300 leading-relaxed mb-3">
                En esta primera semana, descubriste algo importante: que tus patrones no son 
                definitivos. Son hábitos. Y los hábitos se pueden cambiar.
              </p>
              <ul className="space-y-2 text-zinc-300">
                <li>✓ Identificaste tu patrón principal</li>
                <li>✓ Completaste 7 check-ins</li>
                <li>✓ Tomaste al menos un pequeño paso cada día</li>
              </ul>
            </div>

            <div className="border-t border-zinc-800 pt-6">
              <h2 className={`${TYPOGRAPHY.h2} text-white mb-4`}>Ahora viene lo real</h2>
              <p className="text-zinc-300 leading-relaxed">
                Los próximos 14 días van a ser diferentes. Ya no es novedad. Ahora es rutina. 
                Y la rutina es donde el cambio real sucede.
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <h3 className="font-semibold text-white">Tu progreso</h3>
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Programa completado</span>
                <span className="text-cyan-400 font-semibold">33%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full w-[33%] bg-gradient-to-r from-violet-500 to-cyan-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/impulso" className={`${COMPONENTS.buttonPrimary} flex-1 text-center`}>
            Continuar
          </Link>
          <Link href="/impulso/mensajes" className={`${COMPONENTS.buttonSecondary} flex-1 text-center`}>
            Ver todos los mensajes
          </Link>
        </div>
      </div>
    </div>
  );
}
