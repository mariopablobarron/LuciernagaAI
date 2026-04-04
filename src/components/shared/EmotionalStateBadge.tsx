'use client';

type EmotionalState = 'blocked' | 'anxious' | 'doubt' | 'clarity' | 'neutral';

const stateConfig: Record<EmotionalState, { label: string; color: string; bgColor: string }> = {
  blocked: { label: 'Bloqueado', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  anxious: { label: 'Ansioso', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  doubt: { label: 'Con dudas', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  clarity: { label: 'Claro', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  neutral: { label: 'Neutral', color: 'text-zinc-400', bgColor: 'bg-zinc-800/30' },
};

interface EmotionalStateBadgeProps {
  state: EmotionalState;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export function EmotionalStateBadge({
  state,
  size = 'md',
  showDot = true,
}: EmotionalStateBadgeProps) {
  const config = stateConfig[state];
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full ${config.bgColor} border border-zinc-700 ${sizeClasses[size]}`}
    >
      {showDot && <div className={`h-2 w-2 rounded-full ${config.color}`} />}
      <span className="text-white font-medium">{config.label}</span>
    </div>
  );
}
