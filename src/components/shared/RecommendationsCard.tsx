'use client';

import { Lightbulb, AlertCircle, Zap, TrendingUp } from 'lucide-react';
import type { DomainUserState } from '@/domain/types';

type Recommendation = {
  id: string;
  type: 'insight' | 'action' | 'warning' | 'boost';
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: 'cyan' | 'violet' | 'fuchsia' | 'amber' | 'emerald';
};

const RECOMMENDATIONS_BY_STATE: Record<DomainUserState, Recommendation[]> = {
  claridad: [
    {
      id: 'clarity-1',
      type: 'boost',
      label: 'Momento óptimo',
      value: 'Tu mente está clara. Es hora de trabajar en tareas importantes.',
      icon: <Zap className="w-4 h-4" />,
      color: 'cyan',
    },
    {
      id: 'clarity-2',
      type: 'action',
      label: 'Acción recomendada',
      value: 'Documenta lo que acabas de entender antes de que se olvide.',
      icon: <Lightbulb className="w-4 h-4" />,
      color: 'emerald',
    },
    {
      id: 'clarity-3',
      type: 'insight',
      label: 'Patrón detectado',
      value: 'Avanzas más rápido cuando trabajas sin distracciones (mañanas).',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'violet',
    },
  ],
  bloqueo: [
    {
      id: 'block-1',
      type: 'warning',
      label: 'Bloqueo detectado',
      value: 'Parece que hay algo que te impide avanzar. ¿Qué es?',
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'fuchsia',
    },
    {
      id: 'block-2',
      type: 'action',
      label: 'Primer paso',
      value: 'Divide la tarea en pasos más pequeños (máximo 15 min cada uno).',
      icon: <Lightbulb className="w-4 h-4" />,
      color: 'cyan',
    },
    {
      id: 'block-3',
      type: 'insight',
      label: 'Patrón típico',
      value: 'El perfeccionismo es tu mayor bloqueo. Hazlo "suficientemente bien".',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'amber',
    },
  ],
  ansiedad: [
    {
      id: 'anxiety-1',
      type: 'action',
      label: 'Técnica rápida',
      value: 'Haz 5 respiraciones profundas (4-7-8). Calma tu sistema nervioso.',
      icon: <Lightbulb className="w-4 h-4" />,
      color: 'emerald',
    },
    {
      id: 'anxiety-2',
      type: 'warning',
      label: 'Atención',
      value: 'La ansiedad hace que sobrehegues. Tómate un break cada 20 min.',
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'amber',
    },
    {
      id: 'anxiety-3',
      type: 'insight',
      label: 'Recomendación',
      value: 'Escribir tus preocupaciones te ayuda a procesarlas mejor.',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'violet',
    },
  ],
  duda: [
    {
      id: 'doubt-1',
      type: 'action',
      label: 'Próximo paso claro',
      value: 'Elige una sola cosa para hacer hoy. El resto espera.',
      icon: <Lightbulb className="w-4 h-4" />,
      color: 'cyan',
    },
    {
      id: 'doubt-2',
      type: 'warning',
      label: 'Riesgo',
      value: 'La indecisión es un bloqueo disfrazado. Elige ya.',
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'fuchsia',
    },
    {
      id: 'doubt-3',
      type: 'insight',
      label: 'Observación',
      value: 'La duda aparece cuando tienes demasiadas opciones. Simplifica.',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'violet',
    },
  ],
  neutral: [
    {
      id: 'neutral-1',
      type: 'action',
      label: 'Comienza explorando',
      value: 'Elige un área donde te sientas bloqueado y trabaja en ello.',
      icon: <Lightbulb className="w-4 h-4" />,
      color: 'cyan',
    },
    {
      id: 'neutral-2',
      type: 'insight',
      label: 'Consejo',
      value: 'Las conversaciones reflexivas te ayudan a clarificar tu estado.',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'violet',
    },
    {
      id: 'neutral-3',
      type: 'boost',
      label: 'Motivación',
      value: 'Cada paso que das es progreso. Confía en el proceso.',
      icon: <Zap className="w-4 h-4" />,
      color: 'emerald',
    },
  ],
};

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-300',
    icon: 'text-cyan-400',
  },
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-300',
    icon: 'text-violet-400',
  },
  fuchsia: {
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/30',
    text: 'text-fuchsia-300',
    icon: 'text-fuchsia-400',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    icon: 'text-amber-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    icon: 'text-emerald-400',
  },
};

type Props = {
  state: DomainUserState;
};

export function RecommendationsCard({ state }: Props) {
  const recommendations = RECOMMENDATIONS_BY_STATE[state] || RECOMMENDATIONS_BY_STATE.neutral;

  return (
    <div className="card-surface p-6 space-y-4">
      <h3 className="font-bold text-white text-lg">Recomendaciones</h3>
      <div className="space-y-3">
        {recommendations.map((rec) => {
          const colors = COLOR_CLASSES[rec.color || 'violet'];
          return (
            <div
              key={rec.id}
              className={`p-4 rounded-lg border transition-all ${colors.bg} ${colors.border} hover:border-opacity-50`}
            >
              <div className="flex gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${colors.icon}`}>{rec.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text} opacity-75`}>
                    {rec.label}
                  </p>
                  <p className="text-sm text-white font-medium mt-1 leading-relaxed">{rec.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
