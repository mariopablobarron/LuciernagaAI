'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Zap, Flame, Edit2 } from 'lucide-react';
import { TYPOGRAPHY, COMPONENTS, LAYOUTS, GRADIENTS } from '@/styles/design-system';
import type { BrowserSessionUser } from '@/lib/session-client';

type StateData = {
  streakDays: number;
  state: string;
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-xl ${className ?? ''}`} />;
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const STATE_LABEL: Record<string, string> = {
  claridad: 'Claridad',
  bloqueo: 'Bloqueo',
  ansiedad: 'Ansiedad',
  duda: 'Duda',
  neutral: 'Neutral',
};

export default function ProfilePage() {
  const [user, setUser] = useState<BrowserSessionUser | null>(null);
  const [stateData, setStateData] = useState<StateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [tokenRes, stateRes] = await Promise.all([
          fetch('/api/auth/token', { credentials: 'include' }),
          fetch('/api/user/state', { credentials: 'include' }),
        ]);

        if (cancelled) return;

        const tokenData = tokenRes.ok
          ? ((await tokenRes.json()) as { success: boolean; user?: BrowserSessionUser })
          : null;
        const stateJson = stateRes.ok
          ? ((await stateRes.json()) as { success: boolean; streakDays?: number; state?: string })
          : null;

        if (!cancelled) {
          if (tokenData?.success && tokenData.user) setUser(tokenData.user);
          if (stateJson?.success) {
            setStateData({
              streakDays: stateJson.streakDays ?? 0,
              state: stateJson.state ?? 'neutral',
            });
          }
        }
      } catch {
        // silently degrade
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`bg-linear-to-br ${GRADIENTS.background} py-8 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-2xl space-y-8`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`${TYPOGRAPHY.h1} text-white`}>Tu perfil</h1>
        </div>

        {/* Profile Card */}
        <div className={`${COMPONENTS.card} p-8 space-y-6`}>
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                {loading ? '…' : initials(user?.name)}
              </div>
              <div className="space-y-1">
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-28" />
                  </>
                ) : (
                  <>
                    <h2 className={`${TYPOGRAPHY.h2} text-white`}>{user?.name ?? 'Usuario'}</h2>
                    <p className="text-zinc-400 capitalize">{user?.planLabel ?? 'Plan gratuito'}</p>
                  </>
                )}
              </div>
            </div>
            <Link
              href="/settings"
              className={`${COMPONENTS.buttonSecondary} inline-flex items-center gap-2`}
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Link>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Email</p>
                {loading ? (
                  <Skeleton className="h-5 w-40 mt-1" />
                ) : (
                  <p className="text-white font-semibold truncate">{user?.email ?? '—'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-violet-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Plan</p>
                {loading ? (
                  <Skeleton className="h-5 w-24 mt-1" />
                ) : (
                  <p className="text-white font-semibold capitalize">{user?.plan ?? 'free'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
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
              <p className="text-3xl font-bold text-violet-400">
                {user?.messagesUsedToday ?? 0}
              </p>
            )}
            <p className="text-sm text-zinc-400">Mensajes hoy</p>
          </div>
          <div className={`${COMPONENTS.card} text-center space-y-2 p-6`}>
            {loading ? (
              <Skeleton className="h-10 w-16 mx-auto" />
            ) : (
              <p className="text-3xl font-bold text-cyan-400">
                {STATE_LABEL[stateData?.state ?? 'neutral'] ?? 'Neutral'}
              </p>
            )}
            <p className="text-sm text-zinc-400">Estado actual</p>
          </div>
        </div>

        {/* Account Actions */}
        <div className={`${COMPONENTS.card} p-6 space-y-3`}>
          <h3 className="font-semibold text-white mb-4">Acciones de cuenta</h3>
          <Link href="/settings" className={`${COMPONENTS.buttonSecondary} w-full block text-center`}>
            Configuración y seguridad
          </Link>
          <Link href="/dashboard" className={`${COMPONENTS.buttonSecondary} w-full block text-center`}>
            Ver mi progreso
          </Link>
          <button className="w-full py-2 px-4 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors font-semibold">
            Eliminar cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
