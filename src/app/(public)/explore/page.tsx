'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ExploreCanvas from '@/components/explore/ExploreCanvas';
import { Toaster } from '@/components/ui/sonner';
import type { UserState as DomainUserState } from '@/domain/types';

export type ExploreActionType =
  | 'name_block'
  | 'next_step'
  | 'close_pending'
  | 'order_thoughts';

type ActionNode = {
  id: string;
  type: ExploreActionType;
  title: string;
  description: string;
  icon: string;
  color: 'blocked' | 'anxious' | 'doubt' | 'clarity';
  completed: boolean;
  order: number;
};

type CanvasUserState = {
  emotionalState: 'blocked' | 'anxious' | 'doubt' | 'clarity';
  completedActions: number;
  totalActions: number;
};

type UserStateResponse = {
  success: boolean;
  state: DomainUserState;
  progress: number;
  pendingActions: { id: string; description: string }[];
};

type TriggerResponse = {
  success: boolean;
  updatedState: DomainUserState;
};

const ACTION_CATALOG: Omit<ActionNode, 'completed' | 'order'>[] = [
  {
    id: 'explore-name-block',
    type: 'name_block',
    title: 'Escribir lo que evitas',
    description: 'Nombra eso que no quieres decir',
    icon: '📝',
    color: 'blocked',
  },
  {
    id: 'explore-next-step',
    type: 'next_step',
    title: 'Definir siguiente paso',
    description: 'Qué haces cuando termines aquí',
    icon: '🎯',
    color: 'clarity',
  },
  {
    id: 'explore-close-pending',
    type: 'close_pending',
    title: 'Cerrar algo pendiente',
    description: 'Libérate de lo que arrastras',
    icon: '✓',
    color: 'doubt',
  },
  {
    id: 'explore-order-thoughts',
    type: 'order_thoughts',
    title: 'Ordenar tu cabeza',
    description: 'Eso que se repite siempre',
    icon: '🧠',
    color: 'anxious',
  },
];

const STATE_PRIORITY: Record<DomainUserState, ExploreActionType> = {
  bloqueo: 'name_block',
  ansiedad: 'order_thoughts',
  duda: 'next_step',
  claridad: 'next_step',
  neutral: 'name_block',
};

const STATE_TO_EMOTIONAL: Record<DomainUserState, CanvasUserState['emotionalState']> = {
  bloqueo: 'blocked',
  ansiedad: 'anxious',
  duda: 'doubt',
  claridad: 'clarity',
  neutral: 'doubt',
};

function buildActions(
  domainState: DomainUserState,
  completedIds: Set<string> = new Set()
): ActionNode[] {
  const primaryType = STATE_PRIORITY[domainState];

  return ACTION_CATALOG.map((node, i) => ({
    ...node,
    completed: completedIds.has(node.id),
    order: node.type === primaryType ? 0 : i + 1,
  })).sort((a, b) => a.order - b.order);
}

type LoadState = 'loading' | 'ready';

export default function ExplorePage() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [domainState, setDomainState] = useState<DomainUserState>('neutral');
  const [actions, setActions] = useState<ActionNode[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [userState, setUserState] = useState<CanvasUserState>({
    emotionalState: 'doubt',
    completedActions: 0,
    totalActions: ACTION_CATALOG.length,
  });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUserState() {
      try {
        const res = await fetch('/api/user/state', { credentials: 'include' });
        if (cancelled) return;

        const data: UserStateResponse = res.ok
          ? ((await res.json()) as UserStateResponse)
          : { success: false, state: 'neutral', progress: 0, pendingActions: [] };

        if (cancelled) return;

        const state: DomainUserState = data.state ?? 'neutral';
        applyDomainState(state, new Set());
      } catch {
        if (!cancelled) applyDomainState('neutral', new Set());
      } finally {
        if (!cancelled) setLoadState('ready');
      }
    }

    void loadUserState();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyDomainState(state: DomainUserState, completed: Set<string>) {
    setDomainState(state);
    setActions(buildActions(state, completed));
    setUserState({
      emotionalState: STATE_TO_EMOTIONAL[state] ?? 'doubt',
      completedActions: completed.size,
      totalActions: ACTION_CATALOG.length,
    });
  }

  const handleNodeClick = (nodeId: string) => {
    setActiveNodeId(nodeId);
  };

  const handleActionComplete = async (nodeId: string, content: string) => {
    const node = actions.find((a) => a.id === nodeId);
    if (!node || submitting) return;

    if ((node.type as string) === 'chat') {
      router.push(`/app?context=explore&action=${node.type}`);
      return;
    }

    setSubmitting(true);

    const nextCompleted = new Set(completedIds).add(nodeId);
    setCompletedIds(nextCompleted);
    setActions((prev) => prev.map((a) => (a.id === nodeId ? { ...a, completed: true } : a)));
    setUserState((prev) => ({ ...prev, completedActions: nextCompleted.size }));
    setActiveNodeId(null);

    try {
      const res = await fetch('/api/actions/trigger', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: node.type, content }),
      });

      if (res.ok) {
        const data = (await res.json()) as TriggerResponse;
        if (data.success && data.updatedState !== domainState) {
          applyDomainState(data.updatedState, nextCompleted);
        }
      }
    } catch {
      // Silent — optimistic update stands
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    const empty = new Set<string>();
    setCompletedIds(empty);
    applyDomainState(domainState, empty);
    setActiveNodeId(null);
  };

  if (loadState === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="space-y-3 text-center">
          <div className="inline-block animate-spin rounded-full border-2 border-zinc-800 border-t-indigo-400 h-8 w-8" />
          <p className="text-sm text-zinc-400">Preparando tu espacio</p>
        </div>
      </div>
    );
  }

  const completedCount = userState.completedActions;
  const allCompleted = completedCount >= userState.totalActions;
  const hasAnyCompleted = completedCount > 0;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <div className="text-center space-y-6 max-w-2xl mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white">
            ¿Qué estás evitando?
          </h1>
          <p className="text-lg text-zinc-400">
            No le des más vueltas. Escríbelo aquí y te ayudaré a convertirlo en acción.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 font-medium">PROGRESO</p>
              <p className="text-2xl font-bold text-white">{completedCount}/{userState.totalActions}</p>
            </div>
            <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${(completedCount / userState.totalActions) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleNodeClick(action.id)}
              disabled={action.completed}
              className={`group relative p-6 rounded-xl border transition-all duration-200 text-left ${
                action.completed
                  ? 'opacity-50 cursor-not-allowed bg-zinc-900/30 border-zinc-800'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-lg hover:shadow-indigo-500/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">{action.description}</p>
                </div>
                {action.completed && (
                  <span className="text-emerald-400 text-2xl flex-shrink-0">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* CTA Section */}
        {hasAnyCompleted && (
          <div className="w-full max-w-2xl">
            <Link
              href={`/app?context=explore&completed=${completedCount}`}
              className="w-full block py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-center hover:from-indigo-400 hover:to-purple-400 transition-all hover:shadow-lg hover:shadow-indigo-500/50"
            >
              {allCompleted ? '🎉 Todo listo · Ir al chat' : 'Continuar en el chat →'}
            </Link>
            <p className="text-center text-xs text-zinc-500 mt-4">
              {allCompleted 
                ? 'Completaste todas las acciones. Tiempo de chatear.'
                : 'Completa más acciones o continúa al chat.'}
            </p>
          </div>
        )}

        {/* Reset Button */}
        {hasAnyCompleted && (
          <button
            onClick={handleReset}
            className="mt-8 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ↺ Reiniciar
          </button>
        )}

        {/* Initial Prompt */}
        {!hasAnyCompleted && (
          <div className="text-center text-zinc-500 mt-12">
            <p className="text-sm">Haz clic en cualquier opción para empezar</p>
          </div>
        )}
      </div>

      <Toaster />
    </div>
  );
}
