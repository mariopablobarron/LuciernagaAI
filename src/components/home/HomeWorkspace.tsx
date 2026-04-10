"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  ChartNoAxesColumn,
  CheckCheck,
  ClipboardCheck,
  Compass,
  MessageSquareText,
  Eye,
  Target,
} from "lucide-react";
import dynamic from "next/dynamic";
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

function normalizePlanDescription(sessionProfile: BrowserSessionUser | null): string {
  if (!sessionProfile) {
    return "Sesión iniciándose. El progreso y el plan se sincronizarán cuando la identidad esté lista.";
  }

  if (sessionProfile.messageLimitPerDay == null) {
    return "Sin límite diario y con continuidad completa de conversaciones, objetivos y acciones.";
  }

  return `Te quedan ${sessionProfile.messagesRemainingToday ?? 0} de ${
    sessionProfile.messageLimitPerDay
  } mensajes hoy en el plan ${sessionProfile.planLabel}.`;
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
  const accountLabel = sessionProfile?.isAnonymous
    ? "Cuenta anónima"
    : sessionProfile?.email || "Pendiente de vincular";

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as WorkspaceTab)}
      className="flex h-full flex-col gap-4"
    >
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-140" data-tour="workspace-tabs">
        <TabsTrigger value="chat" className="gap-2">
          <MessageSquareText className="size-4" />
          Chat
        </TabsTrigger>
        <TabsTrigger value="plan" className="gap-2">
          <Target className="size-4" />
          Plan
        </TabsTrigger>
        <TabsTrigger value="checkin" className="gap-2">
          <ClipboardCheck className="size-4" />
          Check-in
        </TabsTrigger>
        <TabsTrigger value="espejo" className="gap-2" title="Mapa de patrones que postergas — mirarlo de frente es el primer paso">
          <Eye className="size-4" />
          Espejo
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
                  <CardTitle className="text-xl">Plan de ejecución</CardTitle>
                  <CardDescription className="mt-1">
                    Convierte la claridad en seguimiento visible. Aquí vive el objetivo y la deuda
                    real de acción.
                  </CardDescription>
                </div>
                <Badge
                  variant={actionLock || pendingGoalAction ? "warning" : "success"}
                  className="rounded-full px-3 py-1"
                >
                  {actionLock || pendingGoalAction ? "Seguimiento activo" : "Sin deuda abierta"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {!activeGoal ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                  No hay un objetivo activo todavía. Usa el chat para definirlo y luego vuelve aquí
                  para convertirlo en sistema.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {activeGoal.status}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {activeGoal.completedCount}/{activeGoal.totalCount} acciones
                      </Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">
                      {activeGoal.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Progreso actual: {activeGoal.progress}% completado
                    </p>
                    <Progress value={activeGoal.progress} className="mt-3 h-2.5" />
                  </div>

                  <div className="rounded-2xl border border-border">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">Checklist de acciones</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Marca avances sin salir del workspace central.
                      </p>
                    </div>
                    <ScrollArea className="h-72">
                      <div className="space-y-3 p-4">
                        {activeGoal.actions.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                            Aún no hay acciones definidas para este objetivo.
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
                                    {goalAction.completed ? "Hecha" : "Pendiente"}
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
                                    Marcar pendiente
                                  </>
                                ) : (
                                  <>
                                    <CheckCheck className="size-4" />
                                    Marcar hecha
                                  </>
                                )}
                              </Button>
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
                <CardTitle className="text-base">Continuidad y cuenta</CardTitle>
                <CardDescription>{normalizePlanDescription(sessionProfile)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {sessionProfile?.planLabel || "Free"}
                  </Badge>
                  <Badge
                    variant={sessionProfile?.isAnonymous ? "warning" : "success"}
                    className="rounded-full px-3 py-1"
                  >
                    {sessionProfile?.isAnonymous ? "Progreso sin guardar" : "Progreso guardado"}
                  </Badge>
                  {sessionProfile?.subscriptionStatus ? (
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      {sessionProfile.subscriptionStatus}
                    </Badge>
                  ) : null}
                  {sessionProfile?.messageLimitPerDay != null ? (
                    <Badge variant="warning" className="rounded-full px-3 py-1">
                      {sessionProfile.messagesUsedToday}/{sessionProfile.messageLimitPerDay} hoy
                    </Badge>
                  ) : null}
                </div>

                {sessionProfile?.plan === "free" && (
                  <UpgradeBanner message="Actualiza a Pro y desbloquea conversaciones ilimitadas, Modo Impulso y más." />
                )}

                {(captureEmailRecommended ||
                  Boolean(sessionProfile && !sessionProfile.isAnonymous)) && (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Guardar progreso
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {captureEmailPrompt ||
                        "Vincula un email para conservar conversaciones, objetivos y continuidad entre dispositivos."}
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                      <Input
                        type="email"
                        value={saveProgressEmail}
                        onChange={(event) => onSaveProgressEmailChange(event.target.value)}
                        placeholder="tu@email.com"
                        className="bg-background"
                      />
                      <Button
                        type="button"
                        onClick={() => void onSaveProgress()}
                        disabled={saveProgressLoading || !saveProgressEmail.trim()}
                      >
                        {saveProgressLoading ? "Guardando..." : "Guardar progreso"}
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
                      Continuidad completa
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{upgradeCopy}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-4 w-full"
                      onClick={onOpenUpgrade}
                    >
                      Ver plan Pro
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Responsabilidad activa</CardTitle>
                <CardDescription>
                  Lo que no se hace hoy se convierte en fricción mañana.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionLock ? (
                  <div className="rounded-2xl border border-signal-warning/30 bg-signal-warning/12 p-4 text-sm text-foreground">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Acción pendiente prioritaria
                    </p>
                    <p className="mt-2 font-semibold">{actionLock.actionTitle}</p>
                    <p className="mt-1">{actionLock.message}</p>
                  </div>
                ) : pendingGoalAction ? (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Siguiente acción sugerida
                    </p>
                    <p className="mt-2 font-medium">{pendingGoalAction.description}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    No hay deuda activa abierta. Aprovecha el chat para definir el siguiente paso.
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => onTabChange("chat")}
                >
                  Volver al chat
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="checkin" className="flex-1">
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Ritual diario</CardTitle>
              <CardDescription>
                Úsalo para registrar cómo llegas hoy, aunque no necesites una conversación larga.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={checkinInput}
                onChange={(event) => onCheckinInputChange(event.target.value)}
                rows={7}
                disabled={checkinLoading}
                placeholder="Ejemplo: Hoy estoy bloqueado y me cuesta arrancar."
                className="min-h-56 resize-none bg-background"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {checkinStatus ? (
                    <span>
                      Último guardado:{" "}
                      {new Date(checkinStatus.savedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · estado {checkinStatus.state}
                    </span>
                  ) : (
                    <span>Sin check-in registrado en esta sesión.</span>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => void onCheckinSubmit()}
                  disabled={checkinLoading || !checkinInput.trim()}
                >
                  {checkinLoading ? "Guardando..." : "Guardar check-in"}
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
                <CardTitle className="text-base">Pulso actual</CardTitle>
                <CardDescription>
                  Una lectura rápida de dónde estás hoy y cómo encaja con tu continuidad.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={statusVariant(conversationState)}
                    className="rounded-full px-3 py-1"
                  >
                    Estado actual: {conversationState}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Dominante: {progress.dominantState}
                  </Badge>
                  {checkinStatus ? (
                    <Badge variant="success" className="rounded-full px-3 py-1">
                      {checkinStatus.checkinsToday} check-ins hoy
                    </Badge>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Haz un check-in cuando necesites registrar el estado sin abrir una sesión larga.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    El objetivo no es explicar todo. Es dejar una señal breve que mantenga el hilo
                    del proceso.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Atajos de continuidad</CardTitle>
                <CardDescription>
                  Salta al modo que necesites sin perder el estado local de esta vista.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="justify-between"
                  onClick={() => onTabChange("chat")}
                >
                  Ir al chat
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-between"
                  onClick={() => onTabChange("plan")}
                >
                  Ver plan activo
                  <ChartNoAxesColumn className="size-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="espejo" className="flex-1">
        <Card className="border-border/80 bg-card/95 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Mapa de evitación</CardTitle>
            <CardDescription>
              Esto es lo que llevas posponiendo y por qué. Mirarlo de frente es el primer paso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvoidanceMap />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
