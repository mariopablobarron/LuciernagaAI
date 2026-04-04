'use client';

import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  type?: 'default' | 'progress' | 'badge';
  progressValue?: number; // 0-100
  badgeColor?: 'blocked' | 'anxious' | 'doubt' | 'clarity';
}

const badgeColorMap = {
  blocked: 'bg-red-500/10 text-red-500',
  anxious: 'bg-amber-500/10 text-amber-500',
  doubt: 'bg-purple-500/10 text-purple-500',
  clarity: 'bg-emerald-500/10 text-emerald-500',
};

export function MetricCard({
  label,
  value,
  icon,
  type = 'default',
  progressValue = 0,
  badgeColor = 'clarity',
}: MetricCardProps) {
  return (
    <div className="card-surface p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && <div className="text-lg">{icon}</div>}
      </div>

      {type === 'default' && (
        <p className="text-3xl font-bold text-white">{value}</p>
      )}

      {type === 'progress' && (
        <div className="space-y-2">
          <p className="text-2xl font-bold text-white">{value}</p>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>
      )}

      {type === 'badge' && (
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${badgeColorMap[badgeColor]}`}>
          {value}
        </div>
      )}
    </div>
  );
}
