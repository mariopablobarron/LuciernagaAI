"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Brain, ClipboardList, MessageSquareText, NotebookPen, ShieldAlert, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { AdminShell } from "@/features/admin/components/AdminShell";

// ─── Psychologist panel types ──────────────────────────────────────────────────

type ClinicalNote = { id: string; content: string; tags: string[]; createdAt: string };
type AssessmentItem = {
  id: string; type: string; title: string; status: string; createdAt: string;
  response: { totalScore: number; severity: string; completedAt: string } | null;
};
type TimelineEntry = { date: string; emotionalState: string; mood: string | null; momentum: number | null; hasCheckin: boolean };
type CrisisMarker = { date: string; level: string };

const SEVERITY_LABELS: Record<string, string> = {
  minimal: "Mínimo", mild: "Leve", moderate: "Moderado",
  moderately_severe: "Mod. severo", severe: "Severo",
};
const SEVERITY_COLORS: Record<string, string> = {
  minimal: "text-emerald-400", mild: "text-yellow-400",
  moderate: "text-orange-400", moderately_severe: "text-orange-500", severe: "text-red-500",
};
const STATE_COLORS: Record<string, string> = {
  activo: "bg-emerald-500", bloqueado: "bg-red-500", ansioso: "bg-amber-500",
  desmotivado: "bg-purple-500", perdido: "bg-blue-400", neutral: "bg-zinc-500", unknown: "bg-zinc-700",
};

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

  // Psychologist panel state
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [crisisMarkers, setCrisisMarkers] = useState<CrisisMarker[]>([]);
  const userId = useRef<string | null>(null);

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
        userId.current = params?.id ?? null;

        // Load psychologist panel data in parallel
        const id = params?.id;
        if (id) {
          void Promise.all([
            fetch(`/api/admin/clinical-notes/${id}`, { credentials: "include" })
              .then((r) => r.json() as Promise<{ notes: ClinicalNote[] }>)
              .then((d) => setNotes(d.notes ?? [])),
            fetch(`/api/admin/assessments/${id}`, { credentials: "include" })
              .then((r) => r.json() as Promise<{ assessments: AssessmentItem[] }>)
              .then((d) => setAssessments(d.assessments ?? [])),
            fetch(`/api/admin/users/${id}/emotional-history?days=30`, { credentials: "include" })
              .then((r) => r.json() as Promise<{ timeline: TimelineEntry[]; crisisMarkers: CrisisMarker[] }>)
              .then((d) => { setTimeline(d.timeline ?? []); setCrisisMarkers(d.crisisMarkers ?? []); }),
          ]);
        }
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

  async function handleSaveNote() {
    if (!noteInput.trim() || !userId.current) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/admin/clinical-notes/${userId.current}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: noteInput.trim() }),
      });
      const d = (await res.json()) as { note: ClinicalNote };
      setNotes((prev) => [d.note, ...prev]);
      setNoteInput("");
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!userId.current) return;
    await fetch(`/api/admin/clinical-notes/${userId.current}?noteId=${noteId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  async function handleAssignAssessment(type: "phq9" | "gad7") {
    if (!userId.current) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/assessments/${userId.current}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type }),
      });
      const d = (await res.json()) as { assessment: AssessmentItem };
      setAssessments((prev) => [{ ...d.assessment, response: null }, ...prev]);
    } finally {
      setAssigning(false);
    }
  }

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
        {params?.id && (
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <a
              href={`/api/admin/users/${params.id}/export-pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Exportar expediente (PDF)
            </a>
          </Button>
        )}
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

          {/* ── EMOTIONAL TIMELINE ────────────────────────────────────── */}
          <Card className="border-border/80 bg-card/95">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Brain className="size-4" />
                Estado emocional — últimos 30 días
              </CardTitle>
              <CardDescription>Un cuadrado por día. Color = estado registrado en check-in.</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos de check-in en los últimos 30 días.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {timeline.map((entry) => {
                    const isCrisis = crisisMarkers.some((m) => m.date === entry.date);
                    const color = STATE_COLORS[entry.emotionalState] ?? STATE_COLORS.unknown;
                    return (
                      <div
                        key={entry.date}
                        title={`${entry.date} · ${entry.emotionalState}${entry.momentum ? ` · energía ${entry.momentum}` : ""}${isCrisis ? " · ⚠ crisis" : ""}`}
                        className={`h-7 w-7 rounded-md ${color} ${isCrisis ? "ring-2 ring-red-500" : ""} cursor-default`}
                      />
                    );
                  })}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {Object.entries(STATE_COLORS).filter(([k]) => k !== "unknown").map(([state, cls]) => (
                  <span key={state} className="flex items-center gap-1">
                    <span className={`inline-block h-3 w-3 rounded-sm ${cls}`} />
                    {state}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── CLINICAL NOTES ────────────────────────────────────────── */}
          <Card className="border-border/80 bg-card/95">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <NotebookPen className="size-4" />
                Notas clínicas
              </CardTitle>
              <CardDescription>Privadas — solo visibles desde el panel de admin.</CardDescription>
            </CardHeader>
            <div className="mx-6 mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300 leading-relaxed">
              <strong>Aviso legal:</strong> Esta sección es exclusiva para profesionales de salud mental habilitados. El uso por parte de personal no clínico puede constituir una infracción ética y regulatoria (LOPDGDD / GDPR, art. 9 — datos de salud). Si no eres psicólogo/a u otro profesional sanitario colegiado, no introduzcas observaciones diagnósticas ni de salud mental en este campo.
            </div>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Observación clínica, patrón detectado, nota de sesión..."
                  rows={3}
                  className="resize-none text-sm"
                />
                <Button
                  onClick={() => void handleSaveNote()}
                  disabled={noteSaving || !noteInput.trim()}
                  size="sm"
                  className="self-end"
                >
                  Guardar
                </Button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin notas registradas.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="group rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                        <button
                          onClick={() => void handleDeleteNote(note.id)}
                          className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition hover:text-red-400"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── ASSESSMENTS ───────────────────────────────────────────── */}
          <Card className="border-border/80 bg-card/95">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-4" />
                Escalas de evaluación
              </CardTitle>
              <CardDescription>Asigna PHQ-9 o GAD-7. El usuario las recibe en la app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={assigning}
                  onClick={() => void handleAssignAssessment("phq9")}
                >
                  Asignar PHQ-9
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={assigning}
                  onClick={() => void handleAssignAssessment("gad7")}
                >
                  Asignar GAD-7
                </Button>
              </div>
              {assessments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin evaluaciones asignadas.</p>
              ) : (
                <div className="space-y-2">
                  {assessments.map((a) => (
                    <div key={a.id} className="rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                        <Badge variant={a.status === "completed" ? "secondary" : "warning"}>
                          {a.status === "completed" ? "Completada" : "Pendiente"}
                        </Badge>
                      </div>
                      {a.response ? (
                        <p className={`mt-1 text-sm font-semibold ${SEVERITY_COLORS[a.response.severity] ?? ""}`}>
                          Puntuación {a.response.totalScore} · {SEVERITY_LABELS[a.response.severity] ?? a.response.severity}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">Esperando respuesta del usuario</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
