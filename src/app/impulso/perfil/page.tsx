'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function PerfilPage() {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-2xl space-y-8`}>
        <Link href="/impulso" className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <div className={`${COMPONENTS.card} p-12 text-center space-y-4`}>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Tu Perfil</h1>
          <p className="text-zinc-400">Visualiza tu progreso y estadísticas personales</p>
        </div>
      </div>
    </div>
  );
}
