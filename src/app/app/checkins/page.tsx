'use client';

import Link from 'next/link';
import { Calendar, TrendingUp } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function CheckinsPage() {
  const checkins = [
    { date: 'Hoy', state: 'clarity', energy: 4, streak: 7 },
    { date: 'Ayer', state: 'anxious', energy: 3, streak: 6 },
    { date: '3 días atrás', state: 'doubt', energy: 2, streak: 5 },
    { date: '4 días atrás', state: 'clarity', energy: 5, streak: 4 },
    { date: '5 días atrás', state: 'blocked', energy: 2, streak: 3 },
  ];

  const stateColors = {
    clarity: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', label: 'Claro' },
    anxious: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Ansioso' },
    doubt: { bg: 'bg-violet-500/10', text: 'text-violet-400', label: 'Dudoso' },
    blocked: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Bloqueado' },
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Mi historial de check-ins</h1>
          <Link href="/impulso/checkin" className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2`}>
            <Calendar className="w-4 h-4" />
            Nuevo check-in
          </Link>
        </div>

        {/* Stats */}
        <div className={`${LAYOUTS.gridThreeCol}`}>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            <p className="text-3xl font-bold text-cyan-400">7</p>
            <p className="text-sm text-zinc-400">Racha actual</p>
          </div>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            <p className="text-3xl font-bold text-violet-400">21</p>
            <p className="text-sm text-zinc-400">Check-ins total</p>
          </div>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            <p className="text-3xl font-bold text-cyan-400">98%</p>
            <p className="text-sm text-zinc-400">Consistencia</p>
          </div>
        </div>

        {/* Checkins List */}
        <div className="space-y-3">
          {checkins.map((checkin, i) => {
            const colors = stateColors[checkin.state as keyof typeof stateColors];
            return (
              <div key={i} className={`${COMPONENTS.card} p-6 flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-white">{checkin.date}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                        {colors.label}
                      </span>
                      <span className="text-zinc-500">Energía: {checkin.energy}/5</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-cyan-400">{checkin.streak}</p>
                    <p className="text-xs text-zinc-500">días</p>
                  </div>
                  <button className={`${COMPONENTS.buttonSecondary} text-sm`}>
                    Ver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
