"use client";

import { useEffect, useState } from "react";
import ExploreCanvas from "@/components/explore/ExploreCanvas";
import OnboardingFlow, { type OnboardingData } from "@/components/explore/OnboardingFlow";
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
  name?: string;
  situation?: string;
  goal?: string;
};

type ExploreSession = {
  id: string;
  sessionId: string;
  name: string;
  situation: string;
  goal: string;
  urgency: string;
  completedActions: string[];
  progressPercent: number;
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
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionNode[]>(AVAILABLE_ACTIONS);
  const [userState, setUserState] = useState<UserState>({
    emotionalState: "doubt",
    completedActions: 0,
    totalActions: 4,
  });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading from API
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // Save session when onboarding completes
  const saveSession = async (data: OnboardingData) => {
    try {
      const response = await fetch("/api/explore/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: null, // No authentication for now
          name: data.name,
          situation: data.situation,
          goal: data.goal,
          urgency: data.urgency,
        }),
      });

      if (response.ok) {
        const session: ExploreSession = await response.json();
        setSessionId(session.sessionId);
        return session.sessionId;
      }
    } catch (error) {
      console.error("Error saving session:", error);
    }
    return null;
  };

  // Update session progress
  const updateSessionProgress = async (
    sid: string,
    completedActionIds: string[]
  ) => {
    try {
      await fetch(`/api/explore/sessions/${sid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completedActions: completedActionIds,
        }),
      });
    } catch (error) {
      console.error("Error updating session:", error);
    }
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setOnboardingData(data);
    setOnboardingComplete(true);

    // Personalize user state with onboarding data
    setUserState((prev) => ({
      ...prev,
      name: data.name,
      situation: data.situation,
      goal: data.goal,
    }));

    // Save session to database
    const sid = await saveSession(data);
    if (sid) {
      setSessionId(sid);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    setActiveNodeId(nodeId);
  };

  const handleActionComplete = async (nodeId: string) => {
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

    // Update session progress
    const updatedActions = actions
      .filter((a) => a.completed || a.id === nodeId)
      .map((a) => a.id);

    if (sessionId) {
      await updateSessionProgress(sessionId, updatedActions);
    }

    setActiveNodeId(null);
  };

  const handleReset = () => {
    setActions(AVAILABLE_ACTIONS);
    setUserState((prev) => ({
      ...prev,
      completedActions: 0,
      totalActions: AVAILABLE_ACTIONS.length,
    }));
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
    <>
      {!onboardingComplete ? (
        <div className="animate-in fade-in duration-300">
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
            <ExploreCanvas
              actions={actions}
              userState={userState}
              activeNodeId={activeNodeId}
              onNodeClick={handleNodeClick}
              onActionComplete={handleActionComplete}
              onReset={handleReset}
            />
          </div>
        </div>
      )}
      <Toaster />
    </>
  );
}
