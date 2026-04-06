'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Target, CheckCircle, Clock } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

type GoalAction = {
  id: string;
  description: string;
  completed: boolean;
  createdAt: string;
};

type ActiveGoal = {
  id: string;
  title: string;
  status: string;
  completedCount: number;
  totalCount: number;
  progress: number;
  actions: GoalAction[];
};

export default function GoalsPage() {
  const [goal, setGoal] = useState<ActiveGoal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/goals', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { success?: boolean; goal?: ActiveGoal | null } | null) => {
        if (!cancelled) setGoal(data?.goal ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-4xl space-y-8`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Mi objetivo activo</h1>
          <Link href="/app" className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2 self-start sm:self-auto`}>
            <Plus className="w-4 h-4" />
            Nuevo en chat
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse h-40 bg-zinc-800/60 rounded-2xl" />
            <div className="animate-pulse h-24 bg-zinc-800/60 rounded-2xl" />
          </div>
        ) : !goal ? (
          <div className={`${COMPONENTS.card} p-12 text-center space-y-4`}>
            <Target className="w-12 h-12 text-zinc-600 mx-auto" />
            <p className="text-zinc-400 text-lg">No tienes un objetivo activo.</p>
            <p className="text-zinc-600 text-sm">
              Cuéntale a Tres Mil Millones de Latidos lo que quieres lograr y te ayudará a definirlo.
            </p>
            <Link
              href="/app"
              className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Definir objetivo en chat
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Goal Card */}
            <div className={`${COMPONENTS.card} p-6 space-y-4`}>
              <div className="flex items-start gap-3">
                <Target
                  className={`w-5 h-5 mt-1 shrink-0 ${
                    goal.status === 'completed'
                      ? 'text-emerald-400'
                      : goal.status === 'paused'
                        ? 'text-yellow-400'
                        : 'text-cyan-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-lg">{goal.title}</h3>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      goal.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : goal.status === 'paused'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-cyan-500/10 text-cyan-400'
                    }`}
                  >
                    {goal.status === 'completed'
                      ? '✓ Completado'
                      : goal.status === 'paused'
                        ? 'Pausado'
                        : 'En progreso'}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">
                    {goal.completedCount} de {goal.totalCount} acciones
                  </span>
                  <span className="text-zinc-500">{goal.progress}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-cyan-500 to-violet-500 transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            {goal.actions.length > 0 && (
              <div className={`${COMPONENTS.card} p-6 space-y-3`}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-violet-400" />
                  <h3 className="font-semibold text-white">Acciones</h3>
                </div>
                <div className="space-y-2">
                  {goal.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0"
                    >
                      {action.completed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-zinc-600 shrink-0 mt-0.5" />
                      )}
                      <p
                        className={`text-sm leading-snug ${
                          action.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'
                        }`}
                      >
                        {action.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
