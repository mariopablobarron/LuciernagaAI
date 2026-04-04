'use client';

import Link from 'next/link';
import { Plus, Target, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function GoalsPage() {
  const goals = [
    {
      id: 1,
      title: 'Escribir 30 páginas de mi libro',
      progress: 18,
      total: 30,
      status: 'active',
      actions: 5,
      dueDate: 'En 3 semanas',
    },
    {
      id: 2,
      title: 'Aprender React avanzado',
      progress: 12,
      total: 20,
      status: 'active',
      actions: 3,
      dueDate: 'En 2 meses',
    },
    {
      id: 3,
      title: 'Implementar proyecto de freelance',
      progress: 8,
      total: 15,
      status: 'paused',
      actions: 2,
      dueDate: 'Aplazado',
    },
    {
      id: 4,
      title: 'Mejorar presentaciones públicas',
      progress: 5,
      total: 5,
      status: 'completed',
      actions: 0,
      dueDate: 'Completado',
    },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-4xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Mis objetivos</h1>
          <button className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2`}>
            <Plus className="w-4 h-4" />
            Nuevo objetivo
          </button>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className={`${COMPONENTS.card} p-6 space-y-4`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Target className={`w-5 h-5 mt-1 flex-shrink-0 ${
                    goal.status === 'completed' ? 'text-emerald-400' :
                    goal.status === 'paused' ? 'text-yellow-400' :
                    'text-cyan-400'
                  }`} />
                  <div>
                    <h3 className="font-semibold text-white">{goal.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1">{goal.dueDate}</p>
                  </div>
                </div>
                <button className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{goal.progress} de {goal.total}</span>
                  <span className="text-zinc-500">{Math.round((goal.progress / goal.total) * 100)}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
                    style={{ width: `${(goal.progress / goal.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Actions & Status */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {goal.actions} acciones
                  </span>
                  <span className={`px-2 py-1 rounded-full font-semibold ${
                    goal.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    goal.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-cyan-500/10 text-cyan-400'
                  }`}>
                    {goal.status === 'completed' ? '✓ Completado' :
                     goal.status === 'paused' ? 'Pausado' :
                     'En progreso'}
                  </span>
                </div>
                <button className={`${COMPONENTS.buttonSecondary} text-xs`}>
                  Ver detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
