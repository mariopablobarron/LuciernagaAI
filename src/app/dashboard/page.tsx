'use client';

import { MetricCard } from '@/components/shared/MetricCard';
import { StateCard } from '@/components/shared/StateCard';
import { RecommendationsCard } from '@/components/shared/RecommendationsCard';
import Link from 'next/link';
import { Plus, Flame } from 'lucide-react';

export default function DashboardPage() {
  // Mock data - en producción vendría del API
  const mockData = {
    conversationCount: 12,
    actionsCompleted: 8,
    totalActions: 12,
    currentState: 'clarity' as const,
    streak: 7,
    bestStreak: 15,
    activeGoal: {
      title: 'Completar proyecto X',
      actions: [
        { id: '1', description: 'Escribir descripción del proyecto', completed: true },
        { id: '2', description: 'Crear estructura de carpetas', completed: true },
        { id: '3', description: 'Setup base de datos', completed: false },
        { id: '4', description: 'Implementar autenticación', completed: false },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Tu progreso</h1>
          <p className="text-zinc-400">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard label="Conversaciones" value={mockData.conversationCount} />
          <MetricCard
            label="Acciones completadas"
            value={`${mockData.actionsCompleted}/${mockData.totalActions}`}
            type="progress"
            progressValue={(mockData.actionsCompleted / mockData.totalActions) * 100}
          />
          <MetricCard label="Estado actual" value="Claro" type="badge" badgeColor="clarity" />
          <MetricCard
            label="Racha"
            value={`${mockData.streak} días`}
            icon={<Flame className="w-5 h-5 text-amber-500" />}
          />
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Active Goal */}
          <div className="md:col-span-2 space-y-6">
            <div className="card-surface p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{mockData.activeGoal.title}</h2>
                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-purple-500/50 text-purple-300 hover:text-fuchsia-300 hover:border-fuchsia-500/50 hover:bg-purple-500/10 transition-all text-sm">
                  <Plus className="w-4 h-4" />
                  Agregar acción
                </button>
              </div>

              {/* Actions Checklist */}
              <div className="space-y-3">
                {mockData.activeGoal.actions.map((action) => (
                  <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={action.completed}
                      readOnly
                      className="mt-1 w-5 h-5 rounded border-zinc-700 bg-zinc-900 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${action.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
                        {action.description}
                      </p>
                    </div>
                    {action.completed && <span className="text-emerald-500 text-sm font-semibold flex-shrink-0">✓</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card-surface p-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">Mejor racha</p>
                <p className="text-3xl font-bold text-white">{mockData.bestStreak}</p>
                <p className="text-xs text-zinc-500">días</p>
              </div>
              <div className="card-surface p-6 text-center space-y-2">
                <p className="text-sm text-cyan-400">Progreso total</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">67%</p>
                <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden mt-2 border border-purple-500/30">
                  <div className="h-full w-2/3 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 shadow-lg shadow-fuchsia-500/50" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile & Insights */}
          <div className="space-y-6">
            {/* Emotional Profile */}
            <StateCard
              state="clarity"
              pattern="Enfoque y acción"
              energyLevel={4}
              description="Estás en una buena posición para avanzar. Mantén el ritmo."
            />

            {/* Recommendations - Dynamic based on state */}
            <RecommendationsCard state={mockData.currentState} />

            {/* CTA */}
            <Link
              href="/app"
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 text-center"
            >
              Ir al chat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
