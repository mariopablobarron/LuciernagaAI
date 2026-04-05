"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import type { UserState as DomainUserState } from "@/domain/types";

export type ExploreActionType =
  | "name_block"
  | "next_step"
  | "close_pending"
  | "order_thoughts"
  | "identify_what_ended"
  | "detect_escape"
  | "allow_uncertainty";

type ActionNode = {
  id: string;
  type: ExploreActionType;
  title: string;
  description: string;
  icon: string;
  color: "blocked" | "anxious" | "doubt" | "clarity";
  completed: boolean;
  order: number;
};

type CanvasUserState = {
  emotionalState: "blocked" | "anxious" | "doubt" | "clarity";
  completedActions: number;
  totalActions: number;
};

type UserStateResponse = {
  success: boolean;
  state: DomainUserState;
  systemState: string;
  progress: number;
  pendingActions: { id: string; description: string }[];
};

type TriggerResponse = {
  success: boolean;
  updatedState: DomainUserState;
};

const ACTION_CATALOG: Omit<ActionNode, "completed" | "order">[] = [
  {
    id: "explore-name-block",
    type: "name_block",
    title: "Escribir lo que evitas",
    description: "Nombra eso que no quieres decir",
    icon: "📝",
    color: "blocked",
  },
  {
    id: "explore-next-step",
    type: "next_step",
    title: "Definir siguiente paso",
    description: "Qué haces cuando termines aquí",
    icon: "🎯",
    color: "clarity",
  },
  {
    id: "explore-close-pending",
    type: "close_pending",
    title: "Cerrar algo pendiente",
    description: "Libérate de lo que arrastras",
    icon: "✓",
    color: "doubt",
  },
  {
    id: "explore-order-thoughts",
    type: "order_thoughts",
    title: "Ordenar tu cabeza",
    description: "Eso que se repite siempre",
    icon: "🧠",
    color: "anxious",
  },
];

const HINT_TEXT: Record<ExploreActionType, string> = {
  name_block:
    "💡 Escribe la situación que te hace sentir bloqueado, sin filtros. Cuéntame qué es lo que realmente evitas decir o enfrentar.",
  next_step:
    "💡 ¿Cuál es tu próximo movimiento? Describe en concreto qué vas a hacer cuando termines esto.",
  close_pending:
    "💡 Hay algo que lleva tiempo dándote vueltas. Escribe qué es eso que necesitas cerrar o soltar.",
  order_thoughts:
    "💡 ¿Cuál es ese pensamiento que se repite? Cuéntame qué patrón mental estás notando.",
  identify_what_ended:
    "💡 No tienes que tener respuestas. Solo escribe: ¿qué parte de tu vida anterior ya no encaja con quien eres ahora?",
  detect_escape:
    "💡 Observa sin juzgar: ¿qué estás intentando decidir o resolver demasiado rápido? ¿Qué decisión sientes que 'deberías' tomar ya?",
  allow_uncertainty:
    "💡 Escribe una cosa que no necesitas decidir hoy. Solo una. Deja que exista sin resolverse.",
};

const STATE_PRIORITY: Record<DomainUserState, ExploreActionType> = {
  bloqueo: "name_block",
  ansiedad: "order_thoughts",
  duda: "next_step",
  claridad: "next_step",
  neutral: "name_block",
};

const STATE_TO_EMOTIONAL: Record<DomainUserState, CanvasUserState["emotionalState"]> = {
  bloqueo: "blocked",
  ansiedad: "anxious",
  duda: "doubt",
  claridad: "clarity",
  neutral: "doubt",
};

const TRANSITIONAL_VOID_CATALOG: Omit<ActionNode, "completed" | "order">[] = [
  {
    id: "tv-identify-what-ended",
    type: "identify_what_ended",
    title: "Entender qué ha terminado",
    description: "Qué parte de ti ya no encaja",
    icon: "🌅",
    color: "doubt",
  },
  {
    id: "tv-detect-escape",
    type: "detect_escape",
    title: "Detectar impulsos de escape",
    description: "Qué estás intentando resolver demasiado rápido",
    icon: "🔍",
    color: "anxious",
  },
  {
    id: "tv-allow-uncertainty",
    type: "allow_uncertainty",
    title: "No decidir todavía",
    description: "Permítete estar en el vacío sin resolverlo",
    icon: "🌿",
    color: "clarity",
  },
];

function buildActions(
  domainState: DomainUserState,
  completedIds: Set<string> = new Set(),
  isTransitionalVoid = false
): ActionNode[] {
  if (isTransitionalVoid) {
    return TRANSITIONAL_VOID_CATALOG.map((node, i) => ({
      ...node,
      completed: completedIds.has(node.id),
      order: i,
    }));
  }

  const primaryType = STATE_PRIORITY[domainState];
  return ACTION_CATALOG.map((node, i) => ({
    ...node,
    completed: completedIds.has(node.id),
    order: node.type === primaryType ? 0 : i + 1,
  })).sort((a, b) => a.order - b.order);
}

type LoadState = "loading" | "ready";

export default function ExplorePage() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [domainState, setDomainState] = useState<DomainUserState>("neutral");
  const [isTransitionalVoid, setIsTransitionalVoid] = useState(false);
  const [actions, setActions] = useState<ActionNode[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [userState, setUserState] = useState<CanvasUserState>({
    emotionalState: "doubt",
    completedActions: 0,
    totalActions: ACTION_CATALOG.length,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUserState() {
      try {
        const res = await fetch("/api/user/state", { credentials: "include" });
        if (cancelled) return;

        const data: UserStateResponse = res.ok
          ? ((await res.json()) as UserStateResponse)
          : { success: false, state: "neutral", systemState: "ESTABLE", progress: 0, pendingActions: [] };

        if (cancelled) return;

        const state: DomainUserState = data.state ?? "neutral";
        const tvoid = data.systemState === "TRANSITIONAL_VOID";
        applyDomainState(state, new Set(), tvoid);
      } catch {
        if (!cancelled) applyDomainState("neutral", new Set(), false);
      } finally {
        if (!cancelled) setLoadState("ready");
      }
    }

    void loadUserState();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyDomainState(state: DomainUserState, completed: Set<string>, tvoid: boolean) {
    const catalog = tvoid ? TRANSITIONAL_VOID_CATALOG : ACTION_CATALOG;
    setDomainState(state);
    setIsTransitionalVoid(tvoid);
    setActions(buildActions(state, completed, tvoid));
    setUserState({
      emotionalState: STATE_TO_EMOTIONAL[state] ?? "doubt",
      completedActions: completed.size,
      totalActions: catalog.length,
    });
  }

  const handleActionComplete = async (nodeId: string, content: string) => {
    const node = actions.find((a) => a.id === nodeId);
    if (!node || submitting) return;

    if ((node.type as string) === "chat") {
      router.push(`/app?context=explore&action=${node.type}`);
      return;
    }

    setSubmitting(true);

    const nextCompleted = new Set(completedIds).add(nodeId);
    setCompletedIds(nextCompleted);
    setActions((prev) => prev.map((a) => (a.id === nodeId ? { ...a, completed: true } : a)));
    setUserState((prev) => ({ ...prev, completedActions: nextCompleted.size }));

    try {
      if (isTransitionalVoid) {
        // Low-pressure actions → save as UserAction, no state transition
        await fetch("/api/actions", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: node.type.toUpperCase() }),
        });
      } else {
        const res = await fetch("/api/actions/trigger", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: node.type, content }),
        });

        if (res.ok) {
          const data = (await res.json()) as TriggerResponse;
          if (data.success && data.updatedState !== domainState) {
            applyDomainState(data.updatedState, nextCompleted, false);
          }
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
    applyDomainState(domainState, empty, isTransitionalVoid);
    setCurrentIndex(0);
  };

  if (loadState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="space-y-3 text-center">
          <div className="inline-block animate-spin rounded-full border-2 border-zinc-800 border-t-indigo-400 h-8 w-8" />
          <p className="text-sm text-zinc-400">Buscando tu ritmo...</p>
        </div>
      </div>
    );
  }

  const completedCount = userState.completedActions;
  const allCompleted = completedCount >= userState.totalActions;
  const hasAnyCompleted = completedCount > 0;
  const currentAction = actions[currentIndex];
  // const visibleActions = actions.filter((a) => !a.completed);

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
      blocked: {
        bg: "bg-gradient-to-br from-red-900/30 to-pink-900/20",
        border: "border-red-500/40",
        text: "text-red-300",
      },
      anxious: {
        bg: "bg-gradient-to-br from-orange-900/30 to-amber-900/20",
        border: "border-amber-500/40",
        text: "text-amber-300",
      },
      doubt: {
        bg: "bg-gradient-to-br from-purple-900/30 to-violet-900/20",
        border: "border-purple-500/40",
        text: "text-purple-300",
      },
      clarity: {
        bg: "bg-gradient-to-br from-cyan-900/30 to-teal-900/20",
        border: "border-cyan-500/40",
        text: "text-cyan-300",
      },
    };
    return colorMap[color] || colorMap.doubt;
  };

  const styles = currentAction
    ? getColorStyles(currentAction.color)
    : { bg: "", border: "", text: "" };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-black via-zinc-950 to-purple-950">
      {/* Gradient background with fluorescent accents */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Back to app */}
        <Link
          href="/app"
          className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al chat
        </Link>

        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mb-16">
          {isTransitionalVoid ? (
            <>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Estás en transición
              </h1>
              <p className="text-lg text-violet-300/80 font-medium max-w-md mx-auto">
                No necesitas decidir nada hoy. Solo observar.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                Un latido a la vez
              </h1>
              <p className="text-lg bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-medium">
                ¿Dónde pones tu próximo latido?
              </p>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mb-12">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-medium text-cyan-400">Progreso</p>
            <p className="text-sm font-bold text-fuchsia-300">
              {completedCount}/{userState.totalActions}
            </p>
          </div>
          <div className="h-2 bg-zinc-800/50 rounded-full overflow-hidden border border-purple-500/30">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 transition-all duration-300 shadow-lg shadow-fuchsia-500/50"
              style={{ width: `${(completedCount / userState.totalActions) * 100}%` }}
            />
          </div>
        </div>

        {/* Carousel Card */}
        {currentAction && (
          <div
            className={`w-full max-w-2xl p-12 rounded-2xl border-2 transition-all duration-300 backdrop-blur-md ${styles.bg} ${styles.border} shadow-2xl shadow-purple-500/30`}
          >
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
                <p className="text-emerald-400 font-semibold">💓 Latido registrado</p>
              </div>
            )}

            {/* Input (if not completed) */}
            {!currentAction.completed && (
              <div className="space-y-4 mb-6">
                {/* Hint Bubble */}
                <div className="relative p-4 rounded-lg bg-gradient-to-br from-purple-900/40 to-cyan-900/20 border border-purple-500/40 backdrop-blur-sm">
                  <div className="flex gap-3 items-start">
                    <span className="text-lg flex-shrink-0">💭</span>
                    <p className="text-sm text-cyan-200 leading-relaxed">
                      {HINT_TEXT[currentAction.type]}
                    </p>
                  </div>
                  {/* Tail */}
                  <div className="absolute -bottom-2 left-6 w-4 h-4 bg-gradient-to-br from-purple-900/40 to-cyan-900/20 border-b border-r border-purple-500/40 rounded-br-sm transform rotate-45" />
                </div>

                {/* Textarea */}
                <textarea
                  id={`input-${currentAction.id}`}
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full p-4 rounded-lg bg-black/40 border border-purple-500/30 text-white placeholder:text-zinc-500 focus:outline-none focus:border-fuchsia-500 focus:shadow-lg focus:shadow-fuchsia-500/30 min-h-24 transition-all backdrop-blur-sm"
                />
              </div>
            )}

            {/* Action Buttons */}
            {!currentAction.completed && (
              <button
                onClick={() => {
                  const input = document.getElementById(
                    `input-${currentAction.id}`
                  ) as HTMLTextAreaElement;
                  if (input?.value) {
                    handleActionComplete(currentAction.id, input.value);
                    input.value = "";
                  }
                }}
                disabled={submitting}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold hover:from-violet-400 hover:to-fuchsia-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50"
              >
                {submitting ? "Registrando latido..." : "Marcar este latido ✓"}
              </button>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-4 mt-12">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-3 rounded-lg border border-purple-500/50 text-purple-400 hover:text-fuchsia-300 hover:border-fuchsia-500/50 hover:bg-purple-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:text-zinc-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {actions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`rounded-full transition-all ${
                  i === currentIndex
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 w-8 h-2 shadow-lg shadow-fuchsia-500/50"
                    : "bg-purple-500/30 w-2 h-2 hover:bg-purple-500/50"
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === actions.length - 1}
            className="p-3 rounded-lg border border-purple-500/50 text-purple-400 hover:text-fuchsia-300 hover:border-fuchsia-500/50 hover:bg-purple-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:text-zinc-600"
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
              className="w-full block py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-violet-500 text-white font-bold text-center hover:from-cyan-400 hover:via-fuchsia-400 hover:to-violet-400 transition-all shadow-lg shadow-fuchsia-500/40 hover:shadow-fuchsia-500/60"
            >
              {allCompleted ? "💓 Latidos completos · Ir al chat" : "Llevar estos latidos al chat →"}
            </Link>
            <button
              onClick={handleReset}
              className="w-full py-2 text-sm text-purple-400 hover:text-fuchsia-300 transition-colors"
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
