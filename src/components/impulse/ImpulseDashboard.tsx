"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

function sectionVariant(code?: string): "warning" | "success" | "secondary" {
  if (code === "POTENCIAL_ALTO") return "success";
  if (code === "BLOQUEADO" || code === "ANSIOSO" || code === "DESMOTIVADO") return "warning";
  return "secondary";
}

export default function ImpulseDashboard() {
  const t = useTranslations("impulso.dashboard");

  function formatDate(value: string | null | undefined): string {
    if (!value) {
      return t("notRegistered");
    }

    return new Date(value).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });
  }

  function getScaleLabel(value: number): string {
    const keys = ["nothing", "little", "some", "quite", "much"];
    const key = keys[value - 1];
    return key ? t(`scale.${key}`) : String(value);
  }

  function getMomentumLabel(value: number): string {
    if (value <= 2) return t("momentum.low");
    if (value === 3) return t("momentum.medium");
    return t("momentum.high");
  }

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
      setStatus(error instanceof Error ? error.message : t("errors.loadDashboard"));
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
        throw new Error(payload.error || t("errors.saveDiagnostic"));
      }

      setProfile(payload.profile);
      setStreak(payload.streak ?? null);
      setStatus(t("status.profileAssigned", { title: payload.profile.title }));

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
      setStatus(error instanceof Error ? error.message : t("errors.saveDiagnostic"));
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
        throw new Error(payload.error || t("errors.assignChallenges"));
      }

      setChallenges(payload.challenges ?? []);
      setStreak(payload.streak ?? null);
      setStatus(t("status.activeChallengesUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("errors.assignChallenges"));
    } finally {
      setChallengeLoading(false);
    }
  };

  const submitCheckin = async () => {
    if (!checkinText.trim()) {
      setStatus(t("errors.checkinEmpty"));
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
        throw new Error(payload.error || t("errors.saveCheckin"));
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
      setStatus(t("status.checkinSaved"));

      const insightsResponse = await fetch("/api/insights", {
        cache: "no-store",
        credentials: "include",
      });
      const insightsPayload = await parseJson<InsightsResponse>(insightsResponse);
      setInsights(insightsPayload.insights ?? []);
      setLogs(insightsPayload.logs ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("errors.saveCheckin"));
    } finally {
      setCheckinLoading(false);
    }
  };

  const saveFutureMessage = async () => {
    if (!futureTitle.trim() || !futureContent.trim() || !futureUnlockAt) {
      setStatus(t("errors.futureIncomplete"));
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
        throw new Error(payload.error || t("errors.saveFuture"));
      }

      setFutureTitle("");
      setFutureContent("");
      setFutureUnlockAt("");
      setStatus(t("status.futureSaved"));
      await loadDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("errors.saveFuture"));
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
                  {t("modeLabel")}
                </Badge>
                {profile ? (
                  <Badge variant={sectionVariant(profile.code)} className="rounded-full px-3 py-1">
                    {t("profileBadge", { title: profile.title })}
                  </Badge>
                ) : null}
                {streak ? (
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {t("streakBadge", { days: streak.currentDays })}
                  </Badge>
                ) : null}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {t("headlineTitle")}
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
                  {t("headlineDesc")}
                </p>
              </div>
            </div>

            <div className="grid min-w-60 gap-3 text-sm">
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("account")}</p>
                <p className="mt-1 font-medium text-foreground">
                  {sessionUser?.isAnonymous
                    ? t("anonymousSession")
                    : sessionUser?.email || t("pending")}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t("currentPlan")}
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {sessionUser?.planLabel || t("planFree")}
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
                {t("operationalProfile")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                {profile?.title || t("noDiagnosticYet")}
              </p>
              <p className="text-muted-foreground">
                {profile?.operationalFocus || t("noDiagnosticDesc")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="size-4" />
                {t("activeStreak")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-2xl font-semibold text-foreground">{streak?.currentDays ?? 0}</p>
              <p className="text-muted-foreground">
                {t("bestStreakLine", {
                  best: streak?.bestDays ?? 0,
                  date: formatDate(streak?.lastCheckInDate),
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4" />
                {t("automaticInsights")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {insights.length === 0 ? (
                <p className="text-muted-foreground">
                  {t("insightsEmpty")}
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
            <TabsTrigger value="diagnostic">{t("tabs.diagnostic")}</TabsTrigger>
            <TabsTrigger value="challenges">{t("tabs.challenges")}</TabsTrigger>
            <TabsTrigger value="checkin">{t("tabs.checkin")}</TabsTrigger>
            <TabsTrigger value="future">{t("tabs.future")}</TabsTrigger>
          </TabsList>

          <TabsContent value="diagnostic" className="space-y-4">
            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle>{t("diagnostic.title")}</CardTitle>
                <CardDescription>
                  {t("diagnostic.desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {loading ? (
                  <p className="text-sm text-muted-foreground">{t("diagnostic.loading")}</p>
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
                    {profile ? t("diagnostic.recalculate") : t("diagnostic.save")}
                  </Button>
                  {profile ? (
                    <Badge
                      variant={sectionVariant(profile.code)}
                      className="rounded-full px-3 py-1"
                    >
                      {profile.title} · {t("diagnostic.totalScore", { score: profile.scores.total })}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {profile ? (
              <Card className="border-border/80 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle>{t("diagnostic.detected")}</CardTitle>
                  <CardDescription>{profile.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-5">
                  {([
                    ["claridad", profile.scores.claridad],
                    ["autoestima", profile.scores.autoestima],
                    ["energia", profile.scores.energia],
                    ["disciplina", profile.scores.disciplina],
                    ["social", profile.scores.social],
                  ] as const).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-2xl border border-border bg-muted/20 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {t(`scoreLabels.${key}`)}
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
                  <CardTitle>{t("challenges.title")}</CardTitle>
                  <CardDescription>
                    {t("challenges.desc")}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void assignChallenges()}
                  disabled={challengeLoading || !profile}
                >
                  {challengeLoading ? t("challenges.assigning") : t("challenges.assignRefresh")}
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {challenges.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    {profile
                      ? t("challenges.noneAssigned")
                      : t("challenges.needsDiagnostic")}
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
                          {t("challenges.difficulty", { level: challenge.difficulty })}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                          {t("challenges.daysDuration", { days: challenge.durationDays })}
                        </Badge>
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-foreground">
                        {challenge.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">{challenge.description}</p>
                      <Progress value={challenge.progress} className="mt-4" />
                      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {t("challenges.daysProgress", {
                            done: challenge.completedDays,
                            total: challenge.totalDays,
                          })}
                        </span>
                        <span>{t("challenges.minPerDay", { minutes: challenge.estimatedMinutes })}</span>
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
                  <CardTitle>{t("checkin.title")}</CardTitle>
                  <CardDescription>
                    {t("checkin.desc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={checkinText}
                    onChange={(event) => setCheckinText(event.target.value)}
                    rows={6}
                    placeholder={t("checkin.placeholder")}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t("checkin.challengeStateLabel")}</label>
                      <select
                        value={challengeStatus}
                        onChange={(event) => setChallengeStatus(event.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="cumplido">{t("checkin.statusFulfilled")}</option>
                        <option value="parcial">{t("checkin.statusPartial")}</option>
                        <option value="bloqueado">{t("checkin.statusBlocked")}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t("checkin.energyLabel")}</label>
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
                    {checkinLoading ? t("checkin.saving") : t("checkin.save")}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle>{t("logs.title")}</CardTitle>
                  <CardDescription>{t("logs.desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("logs.empty")}
                    </p>
                  ) : (
                    logs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-border bg-muted/20 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-3 py-1">
                            {log.emotionalState || t("logs.neutral")}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full px-3 py-1">
                            {formatDate(log.createdAt)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-foreground">{log.note || t("logs.noNote")}</p>
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
                    {t("future.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("future.desc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={futureTitle}
                    onChange={(event) => setFutureTitle(event.target.value)}
                    placeholder={t("future.titlePlaceholder")}
                  />
                  <Textarea
                    value={futureContent}
                    onChange={(event) => setFutureContent(event.target.value)}
                    rows={5}
                    placeholder={t("future.contentPlaceholder")}
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
                    {futureLoading ? t("future.saving") : t("future.save")}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hourglass className="size-4" />
                    {t("future.unlockedTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("future.availableSummary", {
                      available: futureMessages.length,
                      locked: lockedFutureMessages,
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {futureMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("future.empty")}
                    </p>
                  ) : (
                    futureMessages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-2xl border border-border bg-muted/20 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-3 py-1">
                            {t("future.available")}
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
                <p className="text-sm font-medium text-foreground">{t("footer.diagnostic.title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("footer.diagnostic.desc")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <Target className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("footer.challenge.title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("footer.challenge.desc")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("footer.containment.title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("footer.containment.desc")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
