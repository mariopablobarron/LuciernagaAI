'use client';

import Link from 'next/link';
import { ArrowLeft, MessageCircle, ArrowRight } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function DiagnosticoPage() {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-2xl space-y-8`}>
        <Link href="/impulso" className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <div className={`${COMPONENTS.card} p-12 text-center space-y-4`}>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Diagnóstico</h1>
          <p className="text-zinc-400">Tu perfil emocional basado en tu diagnóstico inicial.</p>
          <p className="text-sm text-zinc-500">Estos datos se actualizan con cada conversación y check-in.</p>
        </div>

        {/* Bridge to chat */}
        <div className={`${COMPONENTS.card} p-6 space-y-4`}>
          <p className="text-sm text-zinc-400 text-center">
            ¿Quieres explorar estos resultados con tu mentor?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/app?context=diagnostico"
              className={`${COMPONENTS.buttonPrimary} flex-1 flex items-center justify-center gap-2`}
            >
              <MessageCircle className="w-4 h-4" />
              Hablar de mi diagnóstico
            </Link>
            <Link
              href="/impulso"
              className={`${COMPONENTS.buttonSecondary} flex-1 flex items-center justify-center gap-2`}
            >
              Ver panel Impulso
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
