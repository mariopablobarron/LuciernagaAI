'use client';

import { useState } from 'react';
import { Flame, Zap, Shield, Lock } from 'lucide-react';
import Link from 'next/link';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function ImpulsoPage() {
  const [activeTab, setActiveTab] = useState<'diagnostico' | 'retos' | 'insights' | 'mensajes'>('diagnostico');

  const tabs = [
    { id: 'diagnostico', label: 'Diagnóstico' },
    { id: 'retos', label: 'Retos' },
    { id: 'insights', label: 'Insights' },
    { id: 'mensajes', label: 'Mensajes' },
  ] as const;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 md:py-12 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-6xl space-y-8`}>
        {/* Header */}
        <div>
          <h1 className={`${TYPOGRAPHY.h1} bg-gradient-to-r ${GRADIENTS.primary} bg-clip-text text-transparent mb-2`}>
            Programa Impulso
          </h1>
          <p className="text-cyan-300/80 text-lg">21 días de acción consistente</p>
        </div>

        {/* Diagnostico Section */}
        {activeTab === 'diagnostico' && (
          <>
            {/* Profile Card */}
            <div className={`${COMPONENTS.card} space-y-6`}>
              <div className="text-center space-y-4">
                <div className="text-5xl">🚀</div>
                <h2 className={TYPOGRAPHY.h2}>Emprendedor</h2>
                <p className="text-cyan-300/80 max-w-2xl">Tu perfil muestra energía alta y capacidad de acción. Tu desafío es mantener la consistencia a largo plazo.</p>
              </div>
            </div>

            {/* Streak Card */}
            <div className={LAYOUTS.gridThreeCol}>
              <div className={`${COMPONENTS.card} text-center space-y-3`}>
                <div className="flex items-center justify-center gap-2">
                  <Flame className="w-6 h-6 text-amber-500" />
                  <p className="text-4xl font-bold text-white">7</p>
                </div>
                <p className="text-sm text-zinc-400">días seguidos</p>
                <p className="text-xs text-zinc-500">Mejor: 21 días</p>
              </div>

              <div className={`${COMPONENTS.card} text-center space-y-3`}>
                <p className="text-4xl font-bold text-white">42%</p>
                <p className="text-sm text-zinc-400">Progreso del programa</p>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full w-[42%] bg-gradient-to-r from-violet-500 to-cyan-400" />
                </div>
              </div>

              <div className={`${COMPONENTS.card} text-center space-y-3`}>
                <p className="text-4xl font-bold text-white">9/21</p>
                <p className="text-sm text-zinc-400">Días completados</p>
                <p className="text-xs text-cyan-400 font-semibold">Estás en track ✓</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/impulso/checkin"
                className={`${COMPONENTS.buttonPrimary} flex-1 text-center`}
              >
                Hacer check-in de hoy
              </Link>
              <button className={`${COMPONENTS.buttonSecondary} flex-1`}>
                Ver diagnóstico completo
              </button>
            </div>
          </>
        )}

        {/* Retos Section */}
        {activeTab === 'retos' && (
          <div className="space-y-4">
            {[
              { title: 'Morning Momentum', progress: 15, status: 'active', days: '15/21' },
              { title: 'Deep Work Blocks', progress: 21, status: 'completed', days: '21/21' },
              { title: 'Evening Reflection', progress: 8, status: 'active', days: '8/21' },
            ].map((reto, i) => (
              <div key={i} className={`${COMPONENTS.card} space-y-4`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{reto.title}</h3>
                    <p className="text-sm text-zinc-400 mt-1">{reto.days} días</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    reto.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-cyan-500/10 text-cyan-400'
                  }`}>
                    {reto.status === 'completed' ? '✓ Completado' : 'En progreso'}
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
                    style={{ width: `${reto.progress}%` }}
                  />
                </div>
              </div>
            ))}
            <button className={`${COMPONENTS.buttonSecondary} w-full`}>
              + Asignar nuevo reto
            </button>
          </div>
        )}

        {/* Insights Section */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {[
              { type: 'info', icon: Zap, title: 'Patrones detectados', message: 'Avanzas más por la noche y en sesiones de 45 minutos' },
              { type: 'warning', icon: Shield, title: 'Potencial bloqueo', message: 'Has evitado tareas de escritura 3 veces esta semana' },
              { type: 'info', icon: Zap, title: 'Recomendación', message: 'Comienza con microtareas de 5 minutos para vencer la resistencia inicial' },
            ].map((insight, i) => {
              const Icon = insight.icon;
              return (
                <div
                  key={i}
                  className={`${COMPONENTS.card} p-6 flex items-start gap-4 ${
                    insight.type === 'warning' ? 'border-l-4 border-l-cyan-500' : 'border-l-4 border-l-violet-500'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${insight.type === 'warning' ? 'text-cyan-400' : 'text-violet-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{insight.title}</p>
                    <p className="text-sm text-zinc-400 mt-1">{insight.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mensajes Section */}
        {activeTab === 'mensajes' && (
          <div className="space-y-4">
            {[
              { day: 7, title: 'Tu primera semana', preview: 'Hiciste un cambio...', locked: false },
              { day: 14, title: 'Punto de quiebre', preview: 'Aquí es donde muchos...', locked: true },
              { day: 21, title: 'Tu nuevo hábito', preview: 'Felicitaciones, ahora...', locked: true },
            ].map((mensaje, i) => (
              <div key={i} className={`${COMPONENTS.card} space-y-3 relative`}>
                {mensaje.locked && (
                  <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40 rounded-xl flex items-center justify-center">
                    <Lock className="w-8 h-8 text-white opacity-50" />
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 font-semibold">Día {mensaje.day}</p>
                    <h3 className="text-lg font-bold text-white mt-1">{mensaje.title}</h3>
                    {!mensaje.locked && <p className="text-sm text-zinc-400 mt-2 italic">"{mensaje.preview}"</p>}
                    {mensaje.locked && <p className="text-sm text-zinc-500 mt-2">Se desbloquea el día {mensaje.day}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-cyan-400'
                  : 'text-zinc-400 border-b-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
