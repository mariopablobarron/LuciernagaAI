"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ChartNoAxesColumn,
  CheckCheck,
  ClipboardCheck,
  Clock,
  Compass,
  MessageSquareText,
  Eye,
  Target,
} from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { BrowserSessionUser } from "@/lib/session-client";

const AvoidanceMap = dynamic(() => import("@/components/AvoidanceMap"), { ssr: false });
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import UpgradeBanner from "@/components/shared/UpgradeBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type WorkspaceTab = "chat" | "plan" | "checkin" | "espejo";

type WorkspaceGoal = {
  id: string;
  title: string;
  status: string;
  progress: number;
  completedCount: number;
  totalCount: number;
  actions: Array<{
    id: string;
    description: string;
    completed: boolean;
    createdAt?: string;
  }>;
} | null;

type WorkspaceActionLock = {
  message: string;
  actionTitle: string;
} | null;

type WorkspaceCheckinStatus = {
  message: string;
  checkinsToday: number;
  state: string;
  savedAt: string;
} | null;

type HomeWorkspaceProps = {
  activeTab: WorkspaceTab;
  onTabChange: (value: WorkspaceTab) => void;
  chat: ReactNode;
  onNewConversation: () => void;
  conversationTitle: string;
  conversationState: string;
  flowSummary?: string | null;
  flowInstruction?: string | null;
  responseSignals?: {
    searchUsed: boolean;
    fallback: boolean;
  };
  progress: {
    completedActions: number;
    totalActions: number;
    dominantState: string;
  };
  activeGoal: WorkspaceGoal;
  actionLock?: WorkspaceActionLock;
  pendingGoalAction?: {
    id: string;
    description: string;
  } | null;
  goalLoading?: boolean;
  onToggleAction?: (actionId: string, completed: boolean) => Promise<void> | void;
  sessionProfile: BrowserSessionUser | null;
  captureEmailRecommended: boolean;
  captureEmailPrompt: string | null;
  saveProgressEmail: string;
  onSaveProgressEmailChange: (value: string) => void;
  saveProgressLoading: boolean;
  saveProgressStatus: string | null;
  onSaveProgress: () => Promise<void> | void;
  showUpgradeCta: boolean;
  upgradeCopy: string | null;
  onOpenUpgrade: () => void;
  checkinInput: string;
  onCheckinInputChange: (value: string) => void;
  checkinLoading: boolean;
  checkinStatus: WorkspaceCheckinStatus;
  onCheckinSubmit: () => Promise<void> | void;
};

function useNormalizePlanDescription() {
  const t = useTranslations("workspace.continuity");
  return (sessionProfile: BrowserSessionUser | null): string => {
    if (!sessionProfile) {
      return t("descNoSession");
    }
    if (sessionProfile.hasPlan) {
      return t("descPro");
    }
    return t("descFreeTpl", { plan: sessionProfile.planLabel });
  };
}

function statusVariant(value: string): "secondary" | "success" | "warning" {
  if (value === "claridad") return "success";
  if (value === "bloqueo" || value === "ansiedad") return "warning";
  return "secondary";
}

export default function HomeWorkspace({
  activeTab,
  onTabChange,
  chat,
  conversationState,
  progress,
  activeGoal,
  actionLock,
  pendingGoalAction,
  goalLoading = false,
  onToggleAction,
  sessionProfile,
  captureEmailRecommended,
  captureEmailPrompt,
  saveProgressEmail,
  onSaveProgressEmailChange,
  saveProgressLoading,
  saveProgressStatus,
  onSaveProgress,
  showUpgradeCta,
  upgradeCopy,
  onOpenUpgrade,
  checkinInput,
  onCheckinInputChange,
  checkinLoading,
  checkinStatus,
  onCheckinSubmit,
}: HomeWorkspaceProps) {
  const t = useTranslations("workspace");
  const normalizePlanDescription = useNormalizePlanDescription();
  // accountLabel se calcula pero no se renderiza en este componente —
  // si más adelante se usa, lee de t('account.anon') o t('account.noName').
  void (sessionProfile?.isAnonymous
    ? t("account.anon")
    : sessionProfile?.name || t("account.noName"));

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as WorkspaceTab)}
      className="flex h-full flex-col gap-4"
    >
      <TabsList className="grid w-full grid-cols-4 lg:w-140" data-tour="workspace-tabs">
        <TabsTrigger value="chat" className="gap-1.5">
          <MessageSquareText className="size-4" />
          <span className="hidden sm:inline">{t("tabs.chat")}</span>
        </TabsTrigger>
        <TabsTrigger value="plan" className="gap-1.5">
          <Target className="size-4" />
          <span className="hidden sm:inline">{t("tabs.plan")}</span>
        </TabsTrigger>
        <TabsTrigger value="checkin" className="gap-1.5">
          <ClipboardCheck className="size-4" />
          <span className="hidden sm:inline">{t("tabs.checkin")}</span>
        </TabsTrigger>
        <TabsTrigger value="espejo" className="gap-1.5" title={t("tabs.espejoTooltip")}>
          <Eye className="size-4" />
          <span className="hidden sm:inline">{t("tabs.espejo")}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chat" className="flex-1">
        <div className="flex flex-1 min-h-0 flex-col">{chat}</div>
      </TabsContent>

      <TabsContent value="plan" className="flex-1">
        <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
          <Card id="mi-progreso" className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-xl">{t("plan.title")}</CardTitle>
                  <CardDescription className="mt-1">{t("plan.subtitle")}</CardDescription>
                </div>
                <Badge
                  variant={actionLock || pendingGoalAction ? "warning" : "success"}
                  className="rounded-full px-3 py-1"
                >
                  {actionLock || pendingGoalAction ? t("plan.badgeActive") : t("plan.badgeClear")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {!activeGoal ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                  {t("plan.noGoal")}
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {activeGoal.status}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {t("plan.actionsCounter", {
                          done: activeGoal.completedCount,
                          total: activeGoal.totalCount,
                        })}
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">
                      {activeGoal.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("plan.progressLine", { n: activeGoal.progress })}
                    </p>
                    <Progress value={activeGoal.progress} className="mt-3 h-2.5" />
                  </div>

                  <div className="rounded-2xl border border-border">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {t("plan.checklistTitle")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("plan.checklistSubtitle")}
                      </p>
                    </div>
                    <ScrollArea className="h-72">
                      <div className="space-y-3 p-4">
                        {activeGoal.actions.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                            {t("plan.noActionsYet")}
                          </div>
                        ) : (
                          activeGoal.actions.map((goalAction) => (
                            <div
                              key={goalAction.id}
                              className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={goalAction.completed ? "success" : "secondary"}
                                    className="rounded-full px-2.5 py-0.5"
                                  >
                                    {goalAction.completed ? t("plan.actionDone") : t("plan.actionPending")}
                                  </Badge>
                                </div>
                                <p
                                  className={`text-sm font-medium ${
                                    goalAction.completed
                                      ? "text-muted-foreground line-through"
                                      : "text-foreground"
                                  }`}
                                >
                                  {goalAction.description}
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  type="button"
                                  variant={goalAction.completed ? "outline" : "secondary"}
                                  size="sm"
                                  disabled={goalLoading}
                                  onClick={() =>
                                    void onToggleAction?.(goalAction.id, !goalAction.completed)
                                  }
                                >
                                  {goalAction.completed ? (
                                    <>
                                      <Compass className="size-4" />
                                      <span className="hidden sm:inline">{t("plan.markPending")}</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCheck className="size-4" />
                                      <span className="hidden sm:inline">{t("plan.markDone")}</span>
                                    </>
                                  )}
                                </Button>
                                {!goalAction.completed && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const tomorrow = new Date();
                                      tomorrow.setDate(tomorrow.getDate() + 1);
                                      tomorrow.setHours(9, 0, 0, 0);
                                      void fetch("/api/user/action-reminder", {
                                        method: "POST",
                                        credentials: "include",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          actionText: goalAction.description,
                                          remindAt: tomorrow.toISOString(),
                                        }),
                                      }).then(() => {
                                        toast.success(t("plan.remindTomorrowToast"));
                                      }).catch(() => {});
                                    }}
                                    title={t("plan.remindTomorrow")}
                                  >
                                    <Clock className="size-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">{t("continuity.title")}</CardTitle>
                <CardDescription>{normalizePlanDescription(sessionProfile)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {sessionProfile?.planLabel || t("continuity.planFree")}
                  </Badge>
                  <Badge
                    variant={sessionProfile?.isAnonymous ? "warning" : "success"}
                    className="rounded-full px-3 py-1"
                  >
                    {sessionProfile?.isAnonymous ? t("continuity.anonProgress") : t("continuity.savedProgress")}
                  </Badge>
                  {sessionProfile?.subscriptionStatus ? (
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      {sessionProfile.subscriptionStatus}
                    </Badge>
                  ) : null}
                </div>

                {sessionProfile?.plan === "free" && (
                  <UpgradeBanner message={t("continuity.proUpsell")} />
                )}

                {(captureEmailRecommended ||
                  Boolean(sessionProfile && !sessionProfile.isAnonymous)) && (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("continuity.saveProgressEyebrow")}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {captureEmailPrompt || t("continuity.saveProgressDefaultPrompt")}
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                      <Input
                        type="email"
                        value={saveProgressEmail}
                        onChange={(event) => onSaveProgressEmailChange(event.target.value)}
                        placeholder={t("continuity.emailPlaceholder")}
                        className="bg-background"
                      />
                      <Button
                        type="button"
                        onClick={() => void onSaveProgress()}
                        disabled={saveProgressLoading || !saveProgressEmail.trim()}
                      >
                        {saveProgressLoading ? t("continuity.saving") : t("continuity.save")}
                      </Button>
                    </div>
                    {saveProgressStatus ? (
                      <div className="mt-3 rounded-2xl border border-signal-success/30 bg-signal-success/12 px-3 py-3 text-sm text-foreground">
                        {saveProgressStatus}
                      </div>
                    ) : null}
                  </div>
                )}

                {showUpgradeCta && upgradeCopy ? (
                  <div className="rounded-2xl border border-border bg-background/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("continuity.completeUpgradeTitle")}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{upgradeCopy}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-4 w-full"
                      onClick={onOpenUpgrade}
                    >
                      {t("continuity.openUpgrade")}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">{t("responsibility.title")}</CardTitle>
                <CardDescription>{t("responsibility.subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionLock ? (
                  <div className="rounded-2xl border border-signal-warning/30 bg-signal-warning/12 p-4 text-sm text-foreground">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("responsibility.priorityLabel")}
                    </p>
                    <p className="mt-2 font-semibold">{actionLock.actionTitle}</p>
                    <p className="mt-1">{actionLock.message}</p>
                  </div>
                ) : pendingGoalAction ? (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("responsibility.nextLabel")}
                    </p>
                    <p className="mt-2 font-medium">{pendingGoalAction.description}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    {t("responsibility.empty")}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onTabChange("chat")}
                  >
                    {t("responsibility.backToChat")}
                  </Button>
                  <Button asChild type="button" variant="outline" className="flex-1">
                    <Link href="/app/goals">{t("responsibility.goalsHistory")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="checkin" className="flex-1">
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{t("checkin.title")}</CardTitle>
              <CardDescription>{t("checkin.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={checkinInput}
                onChange={(event) => onCheckinInputChange(event.target.value)}
                rows={7}
                disabled={checkinLoading}
                placeholder={t("checkin.placeholder")}
                className="min-h-56 resize-none bg-background"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {checkinStatus ? (
                    <span>
                      {t("checkin.lastSavedTpl", {
                        time: new Date(checkinStatus.savedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                        state: checkinStatus.state,
                      })}
                    </span>
                  ) : (
                    <span>{t("checkin.noneThisSession")}</span>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => void onCheckinSubmit()}
                  disabled={checkinLoading || !checkinInput.trim()}
                >
                  {checkinLoading ? t("checkin.saving") : t("checkin.save")}
                </Button>
              </div>
              {checkinStatus ? (
                <div className="rounded-2xl border border-signal-success/30 bg-signal-success/12 px-3 py-3 text-sm text-foreground">
                  {checkinStatus.message}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">{t("checkin.pulseTitle")}</CardTitle>
                <CardDescription>{t("checkin.pulseSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={statusVariant(conversationState)}
                    className="rounded-full px-3 py-1"
                  >
                    {t("checkin.currentStateTpl", { state: conversationState })}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {t("checkin.dominantTpl", { state: progress.dominantState })}
                  </Badge>
                  {checkinStatus ? (
                    <Badge variant="success" className="rounded-full px-3 py-1">
                      {t("checkin.checkinsTodayTpl", { n: checkinStatus.checkinsToday })}
                    </Badge>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">{t("checkin.hintTitle")}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t("checkin.hintBody")}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">{t("checkin.shortcutsTitle")}</CardTitle>
                <CardDescription>{t("checkin.shortcutsSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="justify-between"
                  onClick={() => onTabChange("chat")}
                >
                  {t("checkin.goToChat")}
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-between"
                  onClick={() => onTabChange("plan")}
                >
                  {t("checkin.viewPlan")}
                  <ChartNoAxesColumn className="size-4" />
                </Button>
                <Button asChild type="button" variant="outline" size="sm" className="justify-between">
                  <Link href="/app/checkins">
                    {t("checkin.checkinsHistory")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="espejo" className="flex-1">
        <Card className="border-border/80 bg-card/95 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{t("espejo.title")}</CardTitle>
            <CardDescription>{t("espejo.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AvoidanceMap />
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/app/patrones">{t("espejo.fullAnalysis")}</Link>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
