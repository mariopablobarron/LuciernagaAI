"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Action = {
  id: string;
  description: string;
  completed: boolean;
};

type Goal = {
  id: string;
  title: string;
  status: string;
  progress: number;
  completedCount: number;
  totalCount: number;
  actions: Action[];
};

type EmotionalProfile = {
  primaryEmotion: string;
  dominantPattern: string;
  energyLevel: string;
};

type ImpulseInsight = {
  type: string;
  message: string;
  severity: string;
};

type DashboardData = {
  goal: Goal | null;
  emotionalProfile: EmotionalProfile | null;
  conversationCount: number;
  insights: ImpulseInsight[];
};

function EmotionBadge({ label }: { label: string }) {
  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
      {label}
    </Badge>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    goal: null,
    emotionalProfile: null,
    conversationCount: 0,
    insights: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [goalsRes, conversationsRes, insightsRes] = await Promise.all([
          fetch("/api/goals", { credentials: "include" }),
          fetch("/api/conversations", { credentials: "include" }),
          fetch("/api/insights", { credentials: "include" }),
        ]);

        if (goalsRes.status === 401 || conversationsRes.status === 401) {
          setError("Sesión expirada. Recarga la página para continuar.");
          return;
        }

        const goalsPayload = (await goalsRes.json().catch(() => ({}))) as {
          goal?: Goal | null;
        };
        const conversationsPayload = (await conversationsRes.json().catch(() => ({}))) as {
          conversations?: unknown[];
          emotionalProfile?: EmotionalProfile | null;
        };
        const insightsPayload = (await insightsRes.json().catch(() => ({}))) as {
          insights?: ImpulseInsight[];
        };

        setData({
          goal: goalsPayload.goal ?? null,
          emotionalProfile: conversationsPayload.emotionalProfile ?? null,
          conversationCount: conversationsPayload.conversations?.length ?? 0,
          insights: insightsPayload.insights ?? [],
        });
      } catch {
        setError("No se pudo conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Cargando dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      </div>
    );
  }

  const { goal, emotionalProfile, conversationCount, insights } = data;
  const pendingActions = goal?.actions.filter((a) => !a.completed) ?? [];
  const completedActions = goal?.actions.filter((a) => a.completed) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visión general de tu proceso, objetivo activo y estado emocional.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card id="goals">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Objetivo activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goal ? (
              <>
                <p className="text-base font-medium text-foreground">{goal.title}</p>
                <p className="mt-1 text-xs text-muted-foreground capitalize">{goal.status}</p>
                <Progress value={goal.progress} className="mt-3 h-2" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {goal.completedCount}/{goal.totalCount} acciones completadas
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin objetivo activo. Usa el chat para definir uno.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Estado emocional
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emotionalProfile ? (
              <div className="flex flex-wrap gap-2">
                <EmotionBadge label={emotionalProfile.primaryEmotion} />
                <EmotionBadge label={emotionalProfile.dominantPattern} />
                <EmotionBadge label={`Energía: ${emotionalProfile.energyLevel}`} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos emocionales aún.</p>
            )}
          </CardContent>
        </Card>

        <Card id="progress">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Progreso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Conversaciones</span>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {conversationCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Acciones completadas</span>
              <Badge variant="success" className="rounded-full px-3 py-1">
                {completedActions.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Acciones pendientes</span>
              <Badge variant={pendingActions.length > 0 ? "warning" : "secondary"} className="rounded-full px-3 py-1">
                {pendingActions.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Acciones pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {goal ? "Todas las acciones completadas. ¡Buen trabajo!" : "Define un objetivo en el chat para ver acciones aquí."}
            </p>
          ) : (
            <ul className="space-y-2">
              {pendingActions.map((action) => (
                <li
                  key={action.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm"
                >
                  <span className="mt-0.5 inline-block size-2.5 shrink-0 rounded-full bg-amber-400" />
                  <span className="text-foreground">{action.description}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Insights de comportamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.slice(0, 3).map((insight, i) => (
              <div
                key={i}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  insight.severity === "high"
                    ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
                    : insight.severity === "medium"
                      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                      : "border-border bg-muted/40 text-foreground"
                }`}
              >
                {insight.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
