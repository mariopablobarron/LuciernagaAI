'use client';

import Link from 'next/link';
import { ArrowLeft, Zap, Shield, TrendingUp } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

export default function InsightsPage() {
  const insights = [
    {
      type: 'pattern',
      icon: TrendingUp,
      title: 'Patrones detectados',
      message: 'Avanzas más por la noche y en sesiones de 45 minutos',
      color: 'violet',
    },
    {
      type: 'warning',
      icon: Shield,
      title: 'Potencial bloqueo',
      message: 'Has evitado tareas de escritura 3 veces esta semana',
      color: 'cyan',
    },
    {
      type: 'insight',
      icon: Zap,
      title: 'Recomendación',
      message: 'Comienza con microtareas de 5 minutos para vencer la resistencia inicial',
      color: 'violet',
    },
    {
      type: 'pattern',
      icon: TrendingUp,
      title: 'Tendencia positiva',
      message: 'Tu consistencia ha mejorado 23% en los últimos 7 días',
      color: 'cyan',
    },
    {
      type: 'insight',
      icon: Zap,
      title: 'Próximo hito',
      message: 'Faltan 2 días para completar la primera semana. El cambio es real.',
      color: 'violet',
    },
    {
      type: 'warning',
      icon: Shield,
      title: 'Alerta de energía',
      message: 'Tus niveles bajaron el viernes. Considera más descanso este fin de semana.',
      color: 'cyan',
    },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-4xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/impulso" className="text-zinc-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`${TYPOGRAPHY.h1} text-white`}>Insights</h1>
            <p className="text-zinc-400">Patrones y recomendaciones personalizadas</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className={`${LAYOUTS.gridThreeCol}`}>
          <div className={`${COMPONENTS.card} text-center space-y-2`}>
            <p className="text-3xl font-bold text-cyan-400">23%</p>
            <p className="text-sm text-zinc-400">Mejora esta semana</p>
          </div>
          <div className={`${COMPONENTS.card} text-center space-y-2`}>
            <p className="text-3xl font-bold text-violet-400">7</p>
            <p className="text-sm text-zinc-400">Patrones detectados</p>
          </div>
          <div className={`${COMPONENTS.card} text-center space-y-2`}>
            <p className="text-3xl font-bold text-cyan-400">3</p>
            <p className="text-sm text-zinc-400">Recomendaciones nuevas</p>
          </div>
        </div>

        {/* Insights Grid */}
        <div className="space-y-4">
          {insights.map((insight, i) => {
            const Icon = insight.icon;
            const borderColor = insight.color === 'violet' ? 'border-l-violet-500' : 'border-l-cyan-500';
            const textColor = insight.color === 'violet' ? 'text-violet-400' : 'text-cyan-400';

            return (
              <div
                key={i}
                className={`${COMPONENTS.card} p-6 flex items-start gap-4 ${borderColor} border-l-4`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${textColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{insight.title}</p>
                  <p className="text-sm text-zinc-400 mt-1">{insight.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Section */}
        <div className={`${COMPONENTS.card} p-8 space-y-4 text-center`}>
          <h3 className={`${TYPOGRAPHY.h3} text-white`}>¿Qué haces ahora?</h3>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Estos insights están diseñados para que entiendas cómo funciona tu patrón. Úsalos para ajustar tu próximo check-in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/impulso/checkin"
              className={`${COMPONENTS.buttonPrimary} inline-flex items-center justify-center gap-2`}
            >
              Hacer check-in de hoy
            </Link>
            <Link
              href="/impulso"
              className={`${COMPONENTS.buttonSecondary} inline-flex items-center justify-center gap-2`}
            >
              Volver al programa
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
