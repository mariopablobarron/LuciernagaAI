"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ExploreCanvas from "@/components/explore/ExploreCanvas";
import { Toaster } from "@/components/ui/sonner";
import type { UserState as DomainUserState } from "@/domain/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExploreActionType =
  | "name_block"
  | "next_step"
  | "close_pending"
  | "order_thoughts";

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
  progress: number;
  pendingActions: { id: string; description: string }[];
};

type TriggerResponse = {
  success: boolean;
  updatedState: DomainUserState;
};

// ─── Action catalog ───────────────────────────────────────────────────────────

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

// ─── State → canvas mapping ───────────────────────────────────────────────────

/** Which action type leads the canvas for each domain state */
const STATE_PRIORITY: Record<DomainUserState, ExploreActionType> = {
  bloqueo: "name_block",
  ansiedad: "order_thoughts",
  duda: "next_step",
  claridad: "next_step",
  neutral: "name_block",
};

/** Domain state → canvas emotional color */
const STATE_TO_EMOTIONAL: Record<DomainUserState, CanvasUserState["emotionalState"]> = {
  bloqueo: "blocked",
  ansiedad: "anxious",
  duda: "doubt",
  claridad: "clarity",
  neutral: "doubt",
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

// ─── Component ────────────────────────────────────────────────────────────────

type LoadState = "loading" | "ready";

export default function ExplorePage() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [domainState, setDomainState] = useState<DomainUserState>("neutral");
  const [actions, setActions] = useState<ActionNode[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [userState, setUserState] = useState<CanvasUserState>({
    emotionalState: "doubt",
    completedActions: 0,
    totalActions: ACTION_CATALOG.length,
  });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Load real user state on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadUserState() {
      try {
        const res = await fetch("/api/user/state", { credentials: "include" });
        if (cancelled) return;

        // Fall back to neutral defaults on any error — explore should never block
        const data: UserStateResponse = res.ok
          ? ((await res.json()) as UserStateResponse)
          : { success: false, state: "neutral", progress: 0, pendingActions: [] };

        if (cancelled) return;

        const state: DomainUserState = data.state ?? "neutral";
        applyDomainState(state, new Set());
      } catch {
        if (!cancelled) applyDomainState("neutral", new Set());
      } finally {
        if (!cancelled) setLoadState("ready");
      }
    }

    void loadUserState();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Syncs all canvas state slices from a single domain state snapshot */
  function applyDomainState(state: DomainUserState, completed: Set<string>) {
    setDomainState(state);
    setActions(buildActions(state, completed));
    setUserState({
      emotionalState: STATE_TO_EMOTIONAL[state] ?? "doubt",
      completedActions: completed.size,
      totalActions: ACTION_CATALOG.length,
    });
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNodeClick = (nodeId: string) => {
    setActiveNodeId(nodeId);
  };

  const handleActionComplete = async (nodeId: string, content: string) => {
    const node = actions.find((a) => a.id === nodeId);
    if (!node || submitting) return;

    // If the node type is "chat", redirect immediately with context
    if ((node.type as string) === "chat") {
      router.push(`/app?context=explore&action=${node.type}`);
      return;
    }

    setSubmitting(true);

    // ── Optimistic update ─────────────────────────────────────────────────
    const nextCompleted = new Set(completedIds).add(nodeId);
    setCompletedIds(nextCompleted);
    setActions((prev) => prev.map((a) => (a.id === nodeId ? { ...a, completed: true } : a)));
    setUserState((prev) => ({ ...prev, completedActions: nextCompleted.size }));
    setActiveNodeId(null);

    // ── Persist + update state ────────────────────────────────────────────
    try {
      const res = await fetch("/api/actions/trigger", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: node.type, content }),
      });

      if (res.ok) {
        const data = (await res.json()) as TriggerResponse;
        if (data.success && data.updatedState !== domainState) {
          // Re-render canvas with new emotional state, preserving completed nodes
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

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-linear-to-br from-background via-background to-muted/20">
        <div className="space-y-3 text-center">
          <div className="inline-block animate-spin rounded-full border-2 border-muted border-t-foreground h-8 w-8" />
          <p className="text-sm text-muted-foreground">Preparando tu espacio</p>
        </div>
      </div>
    );
  }

  const completedCount = userState.completedActions;
  const allCompleted = completedCount >= userState.totalActions;
  const hasAnyCompleted = completedCount > 0;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-linear-to-br from-background via-background to-muted/20">
      <ExploreCanvas
        actions={actions}
        userState={userState}
        activeNodeId={activeNodeId}
        onNodeClick={handleNodeClick}
        onActionComplete={handleActionComplete}
        onReset={handleReset}
      />

      {/* Show chat CTA after first action — not only when all complete */}
      {hasAnyCompleted && (
        <div className="absolute inset-x-0 bottom-8 flex justify-center z-20">
          <Link
            href={`/app?context=explore&completed=${completedCount}`}
            className="px-8 py-3 rounded-full bg-black text-white text-sm font-medium hover:opacity-90 transition shadow-lg"
          >
            {allCompleted ? "Todo listo · Ir al chat →" : "Continuar en el chat →"}
          </Link>
        </div>
      )}

      <Toaster />
    </div>
  );
}
