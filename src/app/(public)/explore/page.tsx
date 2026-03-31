"use client";

import { useEffect, useState } from "react";
import ExploreCanvas from "@/components/explore/ExploreCanvas";
import { Toaster } from "@/components/ui/sonner";

type ActionNode = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: "blocked" | "anxious" | "doubt" | "clarity";
  completed: boolean;
  order: number;
};

type UserState = {
  emotionalState: "blocked" | "anxious" | "doubt" | "clarity";
  completedActions: number;
  totalActions: number;
};

const AVAILABLE_ACTIONS: ActionNode[] = [
  {
    id: "action-1",
    title: "Escribir lo que evitas",
    description: "Nombra eso que no quieres decir",
    icon: "📝",
    color: "blocked",
    completed: false,
    order: 0,
  },
  {
    id: "action-2",
    title: "Definir siguiente paso",
    description: "Qué haces cuando termines aquí",
    icon: "🎯",
    color: "clarity",
    completed: false,
    order: 1,
  },
  {
    id: "action-3",
    title: "Cerrar algo pendiente",
    description: "Libérate de lo que arrastras",
    icon: "✓",
    color: "doubt",
    completed: false,
    order: 2,
  },
  {
    id: "action-4",
    title: "Ordenar tu cabeza",
    description: "Eso que se repite siempre",
    icon: "🧠",
    color: "anxious",
    completed: false,
    order: 3,
  },
];

export default function ExplorePage() {
  const [actions, setActions] = useState<ActionNode[]>(AVAILABLE_ACTIONS);
  const [userState, setUserState] = useState<UserState>({
    emotionalState: "doubt",
    completedActions: 0,
    totalActions: 4, // Keep 4 as the total even if we add more actions
  });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading from API
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  const handleNodeClick = (nodeId: string) => {
    setActiveNodeId(nodeId);
  };

  const handleActionComplete = (nodeId: string) => {
    setActions((prev) =>
      prev.map((action) =>
        action.id === nodeId ? { ...action, completed: true } : action
      )
    );

    const completedCount = actions.filter((a) => a.completed || a.id === nodeId).length;
    setUserState((prev) => ({
      ...prev,
      completedActions: completedCount,
    }));

    setActiveNodeId(null);
  };

  const handleReset = () => {
    setActions(AVAILABLE_ACTIONS);
    setUserState({
      emotionalState: "doubt",
      completedActions: 0,
      totalActions: AVAILABLE_ACTIONS.length,
    });
    setActiveNodeId(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="space-y-3 text-center">
          <div className="inline-block animate-spin rounded-full border-2 border-muted border-t-foreground h-8 w-8" />
          <p className="text-sm text-muted-foreground">Preparando tu espacio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <ExploreCanvas
        actions={actions}
        userState={userState}
        activeNodeId={activeNodeId}
        onNodeClick={handleNodeClick}
        onActionComplete={handleActionComplete}
        onReset={handleReset}
      />
      <Toaster />
    </div>
  );
}
