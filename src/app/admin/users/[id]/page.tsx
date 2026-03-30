"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquareText, ShieldAlert, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AdminShell } from "@/features/admin/components/AdminShell";

type UserDetailResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
    lastSeen: string;
    counts: {
      conversations: number;
      messages: number;
      goals: number;
      userChallenges: number;
      dailyLogs: number;
    };
  };
  state: null | {
    state: string;
    transformationPhase: string;
    primaryEmotion: string;
    dominantPattern: string;
    focusArea: string;
    energyLevel: string;
    riskLevel: string;
    progressTrend: string;
    crisisActive: boolean;
    crisisActivatedAt: string | null;
    crisisActiveUntil: string | null;
    updatedAt: string;
  };
  profile: null | {
    code: string;
    type: string;
    title: string;
    description: string;
    operationalFocus: string;
    scores: {
      claridad: number;
      autoestima: number;
      energia: number;
      disciplina: number;
      social: number;
      total: number;
    };
    updatedAt: string;
  };
  streak: null | {
    currentDays: number;
    bestDays: number;
    status: string;
    lastCheckInDate: string | null;
    updatedAt: string;
  };
  subscription: null | {
    plan: string;
    status: string;
    createdAt: string;
  };
  activity7d: {
    checkins: number;
    crisisEvents: number;
    avoidanceEvents: number;
  };
  conversations: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
  }>;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
    conversationId: string;
  }>;
  activeGoals: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    totalActions: number;
    completedActions: number;
    actions: Array<{
      id: string;
      description: string;
      completed: boolean;
    }>;
  }>;
  crisisEvents: Array<{
    id: string;
    level: string;
    message: string;
    response: string;
    createdAt: string;
  }>;
  avoidanceEvents: Array<{
    id: string;
    type: string;
    createdAt: string;
    action: {
      id: string;
      description: string;
      goalId: string | null;
      goalTitle: string | null;
    };
  }>;
  challenges: Array<{
    id: string;
    status: string;
    progress: number;
    totalDays: number;
    completedDays: number;
    startedAt: string;
    endsAt: string | null;
    challenge: {
      id: string;
      title: string;
      type: string;
      difficulty: number;
    };
  }>;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      if (!params?.id) {
        setError("ID de usuario no válido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/users/${params.id}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (response.status === 401) {
          router.replace(`/admin/login?next=/admin/users/${params.id}`);
          return;
        }

        const payload = (await response.json().catch(() => null)) as UserDetailResponse | null;
        if (!response.ok || !payload) {
          throw new Error("No se pudo cargar la ficha del usuario.");
        }

        setData(payload);
      } catch (fetchError: unknown) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Error cargando ficha del usuario.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void fetchDetail();
  }, [params?.id, router]);

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } finally {
      router.replace("/admin/login");
    }
  }

  return (
    <AdminShell
      title="Ficha de Usuario"
      subtitle="Detalle operativo para soporte y seguimiento: salud, actividad, riesgo y comportamiento."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="size-4" />
            Volver al listado
          </Link>
        </Button>
      </div>

      {error ? (
        <Card className="border-signal-danger/30 bg-signal-danger/12">
          <CardContent className="p-4 text-foreground">{error}</CardContent>
        </Card>
      ) : null}

      {loading || !data ? (
        <Card className="border-border/80 bg-card/95">
          <CardContent className="p-5 text-muted-foreground">
            Cargando ficha de usuario...
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xl font-semibold text-foreground">
                    {data.user.name || data.user.email}
                  </p>
                  <p className="text-sm text-muted-foreground">{data.user.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">ID {data.user.id}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Rol {data.user.role}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Plan {data.subscription?.plan || "free"}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Estado sub {data.subscription?.status || "inactive"}
                  </Badge>
                  {data.state?.crisisActive ? (
                    <Badge variant="danger" className="rounded-full px-3 py-1">
                      <ShieldAlert className="mr-1 size-3.5" />
                      Crisis activa
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Conversaciones</p>
                  <p className="font-semibold text-foreground">{data.user.counts.conversations}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Mensajes</p>
                  <p className="font-semibold text-foreground">{data.user.counts.messages}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Check-ins 7d</p>
                  <p className="font-semibold text-foreground">{data.activity7d.checkins}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Crisis 7d</p>
                  <p className="font-semibold text-[color:color-mix(in_oklab,var(--signal-danger)_60%,var(--foreground))]">
                    {data.activity7d.crisisEvents}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Evasión 7d</p>
                  <p className="font-semibold text-[color:color-mix(in_oklab,var(--signal-warning)_60%,var(--foreground))]">
                    {data.activity7d.avoidanceEvents}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <p className="text-muted-foreground">
                  Última actividad: {formatDate(data.user.lastSeen)}
                </p>
                <p className="text-muted-foreground">Creado: {formatDate(data.user.createdAt)}</p>
                <p className="text-muted-foreground">
                  Actualizado: {formatDate(data.user.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border-border/80 bg-card/95">
              <CardHeader className="pb-3">
                <CardTitle>Estado emocional-operativo</CardTitle>
                <CardDescription>Lectura activa para soporte y retención.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!data.state ? (
                  <p className="text-muted-foreground">Sin estado registrado.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Estado {data.state.state}</Badge>
                      <Badge variant="secondary">Fase {data.state.transformationPhase}</Badge>
                      <Badge variant="secondary">Riesgo {data.state.riskLevel}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Emoción primaria: {data.state.primaryEmotion}
                    </p>
                    <p className="text-muted-foreground">
                      Patrón dominante: {data.state.dominantPattern}
                    </p>
                    <p className="text-muted-foreground">Área foco: {data.state.focusArea}</p>
                    <p className="text-muted-foreground">
                      Nivel de energía: {data.state.energyLevel}
                    </p>
                    <p className="text-muted-foreground">Tendencia: {data.state.progressTrend}</p>
                    <p className="text-muted-foreground">
                      Actualizado: {formatDate(data.state.updatedAt)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/95">
              <CardHeader className="pb-3">
                <CardTitle>Perfil Impulso y Racha</CardTitle>
                <CardDescription>Diagnóstico y constancia.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {data.profile ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{data.profile.title}</Badge>
                      <Badge variant="secondary">Tipo {data.profile.type}</Badge>
                      <Badge variant="secondary">Código {data.profile.code}</Badge>
                    </div>
                    <p className="text-muted-foreground">{data.profile.description}</p>
                    <p className="text-muted-foreground">
                      Foco operativo: {data.profile.operationalFocus}
                    </p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      <div className="rounded-lg border border-border px-2 py-2">
                        Claridad {data.profile.scores.claridad}
                      </div>
                      <div className="rounded-lg border border-border px-2 py-2">
                        Autoestima {data.profile.scores.autoestima}
                      </div>
                      <div className="rounded-lg border border-border px-2 py-2">
                        Energía {data.profile.scores.energia}
                      </div>
                      <div className="rounded-lg border border-border px-2 py-2">
                        Disciplina {data.profile.scores.disciplina}
                      </div>
                      <div className="rounded-lg border border-border px-2 py-2">
                        Social {data.profile.scores.social}
                      </div>
                      <div className="rounded-lg border border-border px-2 py-2">
                        Total {data.profile.scores.total}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Sin perfil diagnóstico asignado.</p>
                )}

                <div className="rounded-xl border border-border bg-muted/35 px-3 py-3">
                  <p className="text-sm font-medium text-foreground">Racha</p>
                  <p className="mt-1 text-muted-foreground">
                    Actual {data.streak?.currentDays || 0} días · Mejor {data.streak?.bestDays || 0}{" "}
                    días
                  </p>
                  <p className="text-muted-foreground">
                    Estado {data.streak?.status || "inactive"}
                  </p>
                  <p className="text-muted-foreground">
                    Último check-in {formatDate(data.streak?.lastCheckInDate || null)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border-border/80 bg-card/95">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-4" />
                  Objetivos activos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.activeGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin objetivos activos.</p>
                ) : (
                  data.activeGoals.map((goal) => {
                    const progress =
                      goal.totalActions > 0
                        ? Math.round((goal.completedActions / goal.totalActions) * 100)
                        : 0;

                    return (
                      <div key={goal.id} className="rounded-xl border border-border p-3">
                        <p className="text-sm font-semibold text-foreground">{goal.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {goal.completedActions}/{goal.totalActions} acciones
                        </p>
                        <Progress className="mt-2 h-2" value={progress} />
                        <div className="mt-2 space-y-1">
                          {goal.actions.slice(0, 5).map((action) => (
                            <p key={action.id} className="text-xs text-muted-foreground">
                              {action.completed ? "[x]" : "[ ]"} {action.description}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/95">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareText className="size-4" />
                  Conversaciones recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin conversaciones registradas.</p>
                ) : (
                  data.conversations.map((conversation) => (
                    <div key={conversation.id} className="rounded-xl border border-border p-3">
                      <p className="text-sm font-semibold text-foreground">{conversation.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {conversation.messageCount} mensajes · {formatDate(conversation.updatedAt)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border-border/80 bg-card/95">
              <CardHeader className="pb-3">
                <CardTitle>Eventos de crisis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.crisisEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin eventos de crisis.</p>
                ) : (
                  data.crisisEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-signal-danger/30 bg-signal-danger/12 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="danger">{event.level}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">{event.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Respuesta: {event.response}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/95">
              <CardHeader className="pb-3">
                <CardTitle>Eventos de evasión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.avoidanceEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin eventos de evasión.</p>
                ) : (
                  data.avoidanceEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-signal-warning/30 bg-signal-warning/12 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="warning">{event.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">{event.action.description}</p>
                      {event.action.goalTitle ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Objetivo: {event.action.goalTitle}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80 bg-card/95">
            <CardHeader className="pb-3">
              <CardTitle>Mensajes recientes</CardTitle>
              <CardDescription>
                Últimos mensajes del usuario para contexto de soporte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin mensajes recientes.</p>
              ) : (
                data.messages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{message.role}</Badge>
                      <span>{formatDate(message.createdAt)}</span>
                      <span>Conversación {message.conversationId}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{message.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AdminShell>
  );
}
