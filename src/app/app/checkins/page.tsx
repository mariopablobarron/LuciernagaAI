'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Calendar, Flame, TrendingUp } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';

type StateData = {
  streakDays: number;
  state: string;
  progressTrend: string;
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-xl ${className ?? ''}`} />;
}

const STATE_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  claridad: { label: 'Claridad', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  ansiedad: { label: 'Ansioso', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  duda: { label: 'Duda', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  bloqueo: { label: 'Bloqueado', bg: 'bg-red-500/10', text: 'text-red-400' },
  neutral: { label: 'Neutral', bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
};

export default function CheckinsPage() {
  const [stateData, setStateData] = useState<StateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/user/state', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: {
          success?: boolean;
          streakDays?: number;
          state?: string;
          progressTrend?: string;
        } | null) => {
          if (!cancelled && data?.success) {
            setStateData({
              streakDays: data.streakDays ?? 0,
              state: data.state ?? 'neutral',
              progressTrend: data.progressTrend ?? 'igual',
            });
          }
        }
      )
      .catch(() => { if (!cancelled) toast.error('No se pudieron cargar los check-ins'); })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stateInfo = STATE_LABEL[stateData?.state ?? 'neutral'] ?? STATE_LABEL.neutral;

  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-3xl space-y-8`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Check-ins</h1>
          <Link
            href="/impulso/checkin"
            className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2 self-start sm:self-auto`}
          >
            <Calendar className="w-4 h-4" />
            Nuevo check-in
          </Link>
        </div>

        {/* Stats */}
        <div className={`${LAYOUTS.gridThreeCol}`}>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            {loading ? (
              <Skeleton className="h-10 w-16 mx-auto" />
            ) : (
              <div className="flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 text-amber-400" />
                <p className="text-3xl font-bold text-amber-400">{stateData?.streakDays ?? 0}</p>
              </div>
            )}
            <p className="text-sm text-zinc-400">Racha actual</p>
          </div>

          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            {loading ? (
              <Skeleton className="h-10 w-16 mx-auto" />
            ) : (
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${stateInfo.bg} ${stateInfo.text}`}
              >
                {stateInfo.label}
              </span>
            )}
            <p className="text-sm text-zinc-400">Estado actual</p>
          </div>

          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            {loading ? (
              <Skeleton className="h-10 w-16 mx-auto" />
            ) : (
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <p className="text-lg font-bold text-cyan-400 capitalize">
                  {stateData?.progressTrend ?? 'igual'}
                </p>
              </div>
            )}
            <p className="text-sm text-zinc-400">Tendencia</p>
          </div>
        </div>

        {/* CTA */}
        <div className={`${COMPONENTS.card} p-8 text-center space-y-4`}>
          <Calendar className="w-10 h-10 text-violet-400 mx-auto" />
          <h2 className="text-lg font-semibold text-white">Registra cómo estás hoy</h2>
          <p className="text-zinc-400 text-sm">
            El check-in diario ayuda a Tres Mil Millones de Latidos a entender tu estado y acompañarte mejor.
          </p>
          <Link
            href="/impulso/checkin"
            className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2`}
          >
            <Calendar className="w-4 h-4" />
            Hacer check-in ahora
          </Link>
        </div>

        {/* History link */}
        <div className="text-center">
          <Link
            href="/impulso/checkin/history"
            className="text-zinc-500 hover:text-cyan-400 text-sm transition-colors"
          >
            Ver historial completo →
          </Link>
        </div>
      </div>
    </div>
  );
}
