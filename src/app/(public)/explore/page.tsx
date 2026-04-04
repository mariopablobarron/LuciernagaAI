'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

const HINT_TEXT: Record<ExploreActionType, string> = {
  name_block: '💡 Escribe la situación que te hace sentir bloqueado, sin filtros. Cuéntame qué es lo que realmente evitas decir o enfrentar.',
  next_step: '💡 ¿Cuál es tu próximo movimiento? Describe en concreto qué vas a hacer cuando termines esto.',
  close_pending: '💡 Hay algo que lleva tiempo dándote vueltas. Escribe qué es eso que necesitas cerrar o soltar.',
  order_thoughts: '💡 ¿Cuál es ese pensamiento que se repite? Cuéntame qué patrón mental estás notando.',
};

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
  const [currentIndex, setCurrentIndex] = useState(0);
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
    setCurrentIndex(0);
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
  const currentAction = actions[currentIndex];
  const visibleActions = actions.filter((a) => !a.completed);

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < actions.length) {
      setCurrentIndex(nextIndex);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getColorStyles = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      blocked: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
      anxious: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
      doubt: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
      clarity: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    };
    return colorMap[color] || colorMap.doubt;
  };

  const styles = currentAction ? getColorStyles(currentAction.color) : { bg: '', border: '', text: '' };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white">
            Una cosa a la vez
          </h1>
          <p className="text-lg text-zinc-400">
            Elige lo que necesitas trabajar ahora
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mb-12">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-medium text-zinc-400">Progreso</p>
            <p className="text-sm font-bold text-white">{completedCount}/{userState.totalActions}</p>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${(completedCount / userState.totalActions) * 100}%` }}
            />
          </div>
        </div>

        {/* Carousel Card */}
        {currentAction && (
          <div className={`w-full max-w-2xl p-12 rounded-2xl border-2 transition-all duration-300 ${styles.bg} ${styles.border}`}>
            {/* Icon */}
            <div className="text-7xl mb-6 text-center">{currentAction.icon}</div>

            {/* Content */}
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-3xl font-bold text-white">{currentAction.title}</h2>
              <p className={`text-lg ${styles.text}`}>{currentAction.description}</p>
            </div>

            {/* Completion badge */}
            {currentAction.completed && (
              <div className="text-center mb-8 py-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-400 font-semibold">✓ Completado</p>
              </div>
            )}

            {/* Input (if not completed) */}
            {!currentAction.completed && (
              <div className="space-y-4 mb-6">
                {/* Hint Bubble */}
                <div className="relative p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="flex gap-3 items-start">
                    <span className="text-lg flex-shrink-0">💭</span>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {HINT_TEXT[currentAction.type]}
                    </p>
                  </div>
                  {/* Tail */}
                  <div className="absolute -bottom-2 left-6 w-4 h-4 bg-zinc-800/50 border-b border-r border-zinc-700 rounded-br-sm transform rotate-45" />
                </div>

                {/* Textarea */}
                <textarea
                  id={`input-${currentAction.id}`}
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full p-4 rounded-lg bg-zinc-900/50 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 min-h-24"
                />
              </div>
            )}

            {/* Action Buttons */}
            {!currentAction.completed && (
              <button
                onClick={() => {
                  const input = document.getElementById(`input-${currentAction.id}`) as HTMLTextAreaElement;
                  if (input?.value) {
                    handleActionComplete(currentAction.id, input.value);
                    input.value = '';
                  }
                }}
                disabled={submitting}
                className="w-full py-3 px-6 rounded-lg bg-indigo-500 text-white font-bold hover:bg-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando...' : 'Completar'}
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-4 mt-12">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-3 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {actions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-indigo-500 w-8' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === actions.length - 1}
            className="p-3 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Counter */}
        <p className="mt-6 text-sm text-zinc-500">
          {currentIndex + 1} de {actions.length}
        </p>

        {/* CTA - Show when any completed */}
        {hasAnyCompleted && (
          <div className="mt-12 w-full max-w-2xl space-y-4">
            <Link
              href={`/app?context=explore&completed=${completedCount}`}
              className="w-full block py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-center hover:from-indigo-400 hover:to-purple-400 transition-all hover:shadow-lg hover:shadow-indigo-500/50"
            >
              {allCompleted ? '🎉 Todo listo · Ir al chat' : 'Continuar en el chat →'}
            </Link>
            <button
              onClick={handleReset}
              className="w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              ↺ Reiniciar
            </button>
          </div>
        )}
      </div>

      <Toaster />
    </div>
  );
}
