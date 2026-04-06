"use client";

import { useEffect, useState } from "react";
import { Flame, Hourglass, Mail, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { fetchBrowserSession, type BrowserSessionUser } from "@/lib/session-client";
import type {
  DailyImpulseLogSnapshot,
  DiagnosticQuestion,
  ImpulseChallengeSnapshot,
  ImpulseInsight,
  ImpulseProfileSnapshot,
  StreakSnapshot,
} from "@/types/impulse";

type FutureMessageSnapshot = {
  id: string;
  title: string;
  content: string;
  unlockAt: string;
  deliveredAt: string | null;
  status: string;
  createdAt: string;
};

type DiagnosticGetResponse = {
  success?: boolean;
  test?: DiagnosticQuestion[];
  profile?: ImpulseProfileSnapshot | null;
  streak?: StreakSnapshot | null;
  error?: string;
};

type ChallengeResponse = {
  success?: boolean;
  profile?: ImpulseProfileSnapshot | null;
  challenges?: ImpulseChallengeSnapshot[];
  streak?: StreakSnapshot | null;
  error?: string;
};

type CheckinResponse = {
  ok?: boolean;
  streak?: StreakSnapshot;
  activeChallenges?: ImpulseChallengeSnapshot[];
  dailyLog?: DailyImpulseLogSnapshot;
  error?: string;
};

type InsightsResponse = {
  success?: boolean;
  insights?: ImpulseInsight[];
  logs?: DailyImpulseLogSnapshot[];
  profile?: ImpulseProfileSnapshot | null;
  streak?: StreakSnapshot | null;
  error?: string;
};

type FutureMessageResponse = {
  success?: boolean;
  availableMessages?: FutureMessageSnapshot[];
  lockedCount?: number;
  futureMessage?: FutureMessageSnapshot;
  error?: string;
};

async function parseJson<T>(response: Response): Promise<Partial<T>> {
  return (await response.json().catch(() => ({}))) as Partial<T>;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Sin registrar";
  }

  return new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function getScaleLabel(value: number): string {
  return ["Nada", "Poco", "Algo", "Bastante", "Mucho"][value - 1] || String(value);
}

function getMomentumLabel(value: number): string {
  if (value <= 2) return "Baja";
  if (value === 3) return "Media";
  return "Alta";
}

function sectionVariant(code?: string): "warning" | "success" | "secondary" {
  if (code === "POTENCIAL_ALTO") return "success";
  if (code === "BLOQUEADO" || code === "ANSIOSO" || code === "DESMOTIVADO") return "warning";
  return "secondary";
}

export default function ImpulseDashboard() {
  const [sessionUser, setSessionUser] = useState<BrowserSessionUser | null>(null);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState<ImpulseProfileSnapshot | null>(null);
  const [challenges, setChallenges] = useState<ImpulseChallengeSnapshot[]>([]);
  const [streak, setStreak] = useState<StreakSnapshot | null>(null);
  const [insights, setInsights] = useState<ImpulseInsight[]>([]);
  const [logs, setLogs] = useState<DailyImpulseLogSnapshot[]>([]);
  const [futureMessages, setFutureMessages] = useState<FutureMessageSnapshot[]>([]);
  const [lockedFutureMessages, setLockedFutureMessages] = useState(0);
  const [checkinText, setCheckinText] = useState("");
  const [challengeStatus, setChallengeStatus] = useState("cumplido");
  const [momentum, setMomentum] = useState(3);
  const [futureTitle, setFutureTitle] = useState("");
  const [futureContent, setFutureContent] = useState("");
  const [futureUnlockAt, setFutureUnlockAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [futureLoading, setFutureLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const [session, diagnosticRes, challengeRes, insightsRes, futureRes] = await Promise.all([
        fetchBrowserSession().catch(() => null),
        fetch("/api/diagnostic", { cache: "no-store", credentials: "include" }),
        fetch("/api/challenge/assign", { cache: "no-store", credentials: "include" }),
        fetch("/api/insights", { cache: "no-store", credentials: "include" }),
        fetch("/api/future-message", { cache: "no-store", credentials: "include" }),
      ]);

      const diagnostic = await parseJson<DiagnosticGetResponse>(diagnosticRes);
      const challengePayload = await parseJson<ChallengeResponse>(challengeRes);
      const insightsPayload = await parseJson<InsightsResponse>(insightsRes);
      const futurePayload = await parseJson<FutureMessageResponse>(futureRes);

      setSessionUser(session?.user ?? null);
      setQuestions(diagnostic.test ?? []);
      setProfile(diagnostic.profile ?? challengePayload.profile ?? insightsPayload.profile ?? null);
      setStreak(diagnostic.streak ?? challengePayload.streak ?? insightsPayload.streak ?? null);
      setChallenges(challengePayload.challenges ?? []);
      setInsights(insightsPayload.insights ?? []);
      setLogs(insightsPayload.logs ?? []);
      setFutureMessages(futurePayload.availableMessages ?? []);
      setLockedFutureMessages(futurePayload.lockedCount ?? 0);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo cargar Modo Impulso.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const submitDiagnostic = async () => {
    setDiagnosticLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/diagnostic", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      });
      const payload = await parseJson<DiagnosticGetResponse>(response);
      if (!response.ok || !payload.success || !payload.profile) {
        throw new Error(payload.error || "No se pudo guardar el diagnóstico.");
      }

      setProfile(payload.profile);
      setStreak(payload.streak ?? null);
      setStatus(`Perfil asignado: ${payload.profile.title}. Ahora vamos a activar tus retos.`);

      const challengeResponse = await fetch("/api/challenge/assign", {
        method: "POST",
        credentials: "include",
      });
      const challengePayload = await parseJson<ChallengeResponse>(challengeResponse);
      if (challengeResponse.ok && challengePayload.success) {
        setChallenges(challengePayload.challenges ?? []);
        setStreak(challengePayload.streak ?? payload.streak ?? null);
      }

      const insightsResponse = await fetch("/api/insights", {
        cache: "no-store",
        credentials: "include",
      });
      const insightsPayload = await parseJson<InsightsResponse>(insightsResponse);
      setInsights(insightsPayload.insights ?? []);
      setLogs(insightsPayload.logs ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar el diagnóstico.");
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const assignChallenges = async () => {
    setChallengeLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/challenge/assign", {
        method: "POST",
        credentials: "include",
      });
      const payload = await parseJson<ChallengeResponse>(response);
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "No se pudieron asignar retos.");
      }

      setChallenges(payload.challenges ?? []);
      setStreak(payload.streak ?? null);
      setStatus("Retos activos actualizados.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudieron asignar retos.");
    } finally {
      setChallengeLoading(false);
    }
  };

  const submitCheckin = async () => {
    if (!checkinText.trim()) {
      setStatus("Escribe tu check-in antes de guardarlo.");
      return;
    }

    setCheckinLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: checkinText,
          challengeStatus,
          momentum,
        }),
      });
      const payload = await parseJson<CheckinResponse>(response);
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "No se pudo guardar el check-in.");
      }

      if (payload.streak) {
        setStreak(payload.streak);
      }
      if (payload.activeChallenges) {
        setChallenges(payload.activeChallenges);
      }
      if (payload.dailyLog) {
        setLogs((current) => [
          payload.dailyLog!,
          ...current.filter((item) => item.id !== payload.dailyLog!.id),
        ]);
      }

      setCheckinText("");
      setStatus("Check-in guardado. El sistema actualizó racha y retos activos.");

      const insightsResponse = await fetch("/api/insights", {
        cache: "no-store",
        credentials: "include",
      });
      const insightsPayload = await parseJson<InsightsResponse>(insightsResponse);
      setInsights(insightsPayload.insights ?? []);
      setLogs(insightsPayload.logs ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar el check-in.");
    } finally {
      setCheckinLoading(false);
    }
  };

  const saveFutureMessage = async () => {
    if (!futureTitle.trim() || !futureContent.trim() || !futureUnlockAt) {
      setStatus("Completa título, mensaje y fecha de desbloqueo.");
      return;
    }

    setFutureLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/future-message", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: futureTitle,
          content: futureContent,
          unlockAt: futureUnlockAt,
        }),
      });
      const payload = await parseJson<FutureMessageResponse>(response);
      if (!response.ok || !payload.success || !payload.futureMessage) {
        throw new Error(payload.error || "No se pudo guardar el mensaje futuro.");
      }

      setFutureTitle("");
      setFutureContent("");
      setFutureUnlockAt("");
      setStatus("Cápsula del tiempo guardada.");
      await loadDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar el mensaje futuro.");
    } finally {
      setFutureLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
        <Card className="border-border/80 bg-card/95 shadow-sm">
          <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  Modo Impulso
                </Badge>
                {profile ? (
                  <Badge variant={sectionVariant(profile.code)} className="rounded-full px-3 py-1">
                    Perfil {profile.title}
                  </Badge>
                ) : null}
                {streak ? (
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Racha {streak.currentDays} días
                  </Badge>
                ) : null}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Entrena claridad, no solo conversación
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
                  Diagnóstico inicial, perfil operativo, retos cortos, check-in diario y señales de
                  comportamiento para convertir pensamiento en ejecución.
                </p>
              </div>
            </div>

            <div className="grid min-w-60 gap-3 text-sm">
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cuenta</p>
                <p className="mt-1 font-medium text-foreground">
                  {sessionUser?.isAnonymous ? "Sesión anónima" : sessionUser?.email || "Pendiente"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Plan actual
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {sessionUser?.planLabel || "Free"}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4" />
                Perfil operativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                {profile?.title || "Sin diagnóstico aún"}
              </p>
              <p className="text-muted-foreground">
                {profile?.operationalFocus ||
                  "Completa el test inicial y el sistema te asignará un perfil de trabajo."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="size-4" />
                Racha activa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-2xl font-semibold text-foreground">{streak?.currentDays ?? 0}</p>
              <p className="text-muted-foreground">
                Mejor racha: {streak?.bestDays ?? 0}. Último check-in:{" "}
                {formatDate(streak?.lastCheckInDate)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4" />
                Insights automáticos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {insights.length === 0 ? (
                <p className="text-muted-foreground">
                  Aquí aparecerán patrones reales cuando el sistema tenga actividad suficiente.
                </p>
              ) : (
                insights.slice(0, 2).map((insight) => (
                  <div
                    key={insight.title}
                    className="rounded-2xl border border-border bg-muted/30 p-3"
                  >
                    <p className="font-medium text-foreground">{insight.title}</p>
                    <p className="mt-1 text-muted-foreground">{insight.action}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {status ? (
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
            {status}
          </div>
        ) : null}

        <Tabs defaultValue="diagnostic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="diagnostic">Diagnóstico</TabsTrigger>
            <TabsTrigger value="challenges">Retos</TabsTrigger>
            <TabsTrigger value="checkin">Check-in</TabsTrigger>
            <TabsTrigger value="future">Cápsula</TabsTrigger>
          </TabsList>

          <TabsContent value="diagnostic" className="space-y-4">
            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle>Test inicial de impulso</CardTitle>
                <CardDescription>
                  12 preguntas, escala 1-5. Esto define cómo debe empujarte Tres Mil Millones de Latidos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Cargando diagnóstico...</p>
                ) : (
                  questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-2xl border border-border bg-muted/20 p-4"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {index + 1}. {question.prompt}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Button
                            key={value}
                            type="button"
                            size="sm"
                            variant={answers[question.id] === value ? "default" : "outline"}
                            onClick={() =>
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: value,
                              }))
                            }
                          >
                            {value} · {getScaleLabel(value)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => void submitDiagnostic()}
                    disabled={diagnosticLoading || questions.length === 0}
                  >
                    {profile ? "Recalcular perfil" : "Guardar diagnóstico"}
                  </Button>
                  {profile ? (
                    <Badge
                      variant={sectionVariant(profile.code)}
                      className="rounded-full px-3 py-1"
                    >
                      {profile.title} · Total {profile.scores.total}/100
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {profile ? (
              <Card className="border-border/80 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle>Perfil detectado</CardTitle>
                  <CardDescription>{profile.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-5">
                  {[
                    ["Claridad", profile.scores.claridad],
                    ["Autoestima", profile.scores.autoestima],
                    ["Energía", profile.scores.energia],
                    ["Disciplina", profile.scores.disciplina],
                    ["Social", profile.scores.social],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="rounded-2xl border border-border bg-muted/20 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{value}/100</p>
                      <Progress value={Number(value)} className="mt-3" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="challenges" className="space-y-4">
            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader className="md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Retos activos</CardTitle>
                  <CardDescription>
                    Retos cortos, progresivos y alineados a tu perfil operativo.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void assignChallenges()}
                  disabled={challengeLoading || !profile}
                >
                  {challengeLoading ? "Asignando..." : "Asignar / refrescar retos"}
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {challenges.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    {profile
                      ? "Aún no hay retos activos. Asigna los primeros y empieza hoy."
                      : "Completa primero el diagnóstico para desbloquear retos personalizados."}
                  </div>
                ) : (
                  challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="rounded-2xl border border-border bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                          {challenge.type}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                          Dificultad {challenge.difficulty}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                          {challenge.durationDays} días
                        </Badge>
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-foreground">
                        {challenge.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">{challenge.description}</p>
                      <Progress value={challenge.progress} className="mt-4" />
                      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {challenge.completedDays}/{challenge.totalDays} días
                        </span>
                        <span>{challenge.estimatedMinutes} min/día</span>
                      </div>
                      <p className="mt-3 text-sm text-foreground">{challenge.instructions}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkin" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-border/80 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle>Check-in diario</CardTitle>
                  <CardDescription>
                    El objetivo no es contar cómo te sientes sin más. Es entrenar continuidad.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={checkinText}
                    onChange={(event) => setCheckinText(event.target.value)}
                    rows={6}
                    placeholder="Qué hiciste hoy, qué evitaste y cuál es tu siguiente acción."
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Estado del reto</label>
                      <select
                        value={challengeStatus}
                        onChange={(event) => setChallengeStatus(event.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="cumplido">Cumplido</option>
                        <option value="parcial">Parcial</option>
                        <option value="bloqueado">Bloqueado</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Energía de hoy</label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={momentum}
                        onChange={(event) => setMomentum(Number(event.target.value) || 1)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {momentum}/5 · {getMomentumLabel(momentum)}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => void submitCheckin()}
                    disabled={checkinLoading}
                  >
                    {checkinLoading ? "Guardando..." : "Guardar check-in"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle>Últimos registros</CardTitle>
                  <CardDescription>Patrón emocional reciente y continuidad real.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Todavía no hay logs. El primer check-in activará esta vista.
                    </p>
                  ) : (
                    logs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-border bg-muted/20 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-3 py-1">
                            {log.emotionalState || "neutral"}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full px-3 py-1">
                            {formatDate(log.createdAt)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-foreground">{log.note || "Sin nota"}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="future" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-border/80 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="size-4" />
                    Cápsula del tiempo
                  </CardTitle>
                  <CardDescription>
                    Déjate un mensaje que el sistema abrirá cuando llegue la fecha.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={futureTitle}
                    onChange={(event) => setFutureTitle(event.target.value)}
                    placeholder="Título del mensaje"
                  />
                  <Textarea
                    value={futureContent}
                    onChange={(event) => setFutureContent(event.target.value)}
                    rows={5}
                    placeholder="Qué necesitas recordar cuando llegue ese momento."
                  />
                  <Input
                    type="datetime-local"
                    value={futureUnlockAt}
                    onChange={(event) => setFutureUnlockAt(event.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={() => void saveFutureMessage()}
                    disabled={futureLoading}
                  >
                    {futureLoading ? "Guardando..." : "Guardar cápsula"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hourglass className="size-4" />
                    Mensajes desbloqueados
                  </CardTitle>
                  <CardDescription>
                    Disponibles ahora: {futureMessages.length}. Bloqueados: {lockedFutureMessages}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {futureMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aún no tienes mensajes disponibles. Crea uno para más adelante.
                    </p>
                  ) : (
                    futureMessages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-2xl border border-border bg-muted/20 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-3 py-1">
                            Disponible
                          </Badge>
                          <Badge variant="secondary" className="rounded-full px-3 py-1">
                            {formatDate(message.unlockAt)}
                          </Badge>
                        </div>
                        <h3 className="mt-3 font-medium text-foreground">{message.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{message.content}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <Zap className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Diagnóstico rápido</p>
                <p className="text-xs text-muted-foreground">
                  12 preguntas para detectar cómo hay que empujarte.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <Target className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Reto activo</p>
                <p className="text-xs text-muted-foreground">
                  El progreso se mide en días cumplidos, no en conversación bonita.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Contención y continuidad</p>
                <p className="text-xs text-muted-foreground">
                  El sistema mantiene seguimiento sin sustituir ayuda profesional.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
