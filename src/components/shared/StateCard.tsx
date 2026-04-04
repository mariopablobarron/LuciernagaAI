'use client';

import { EmotionalStateBadge } from './EmotionalStateBadge';

type EmotionalState = 'blocked' | 'anxious' | 'doubt' | 'clarity' | 'neutral';

interface StateCardProps {
  state: EmotionalState;
  pattern: string;
  energyLevel?: number; // 1-5
  description?: string;
}

export function StateCard({ state, pattern, energyLevel, description }: StateCardProps) {
  return (
    <div className="card-surface p-6 space-y-4">
      {/* State badge */}
      <EmotionalStateBadge state={state} size="lg" />

      {/* Pattern */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Patrón dominante</p>
        <p className="text-white font-semibold">{pattern}</p>
      </div>

      {/* Energy level */}
      {energyLevel !== undefined && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Nivel de energía</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  level <= energyLevel ? 'bg-indigo-500' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="pt-4 border-t border-zinc-800">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}
    </div>
  );
}
