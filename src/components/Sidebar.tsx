"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, LogOut, Plus, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export type SidebarConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};

type SidebarProgress = {
  completedActions: number;
  totalActions: number;
  dominantState: string;
};

type SidebarProfile = {
  name: string;
  plan: string;
};

type SidebarGoal = {
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
  }>;
} | null;

type SidebarProps = {
  conversations: SidebarConversation[];
  activeConversationId: string;
  progress: SidebarProgress;
  activeGoal: SidebarGoal;
  actionLock?: {
    message: string;
    actionTitle: string;
  } | null;
  profile: SidebarProfile;
  adminAuthenticated: boolean;
  adminLoading: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onAdminLogout: () => Promise<void> | void;
};

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  progress,
  activeGoal,
  actionLock,
  profile,
  adminAuthenticated,
  adminLoading,
  onSelectConversation,
  onNewConversation,
  onAdminLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const [logoSrc, setLogoSrc] = useState("/logo-startidea.png");

  const pendingActionsCount = useMemo(() => {
    if (!activeGoal) {
      return 0;
    }

    return activeGoal.actions.filter((action) => !action.completed).length;
  }, [activeGoal]);

  const progressPercent = useMemo(() => {
    if (progress.totalActions <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((progress.completedActions / progress.totalActions) * 100));
  }, [progress.completedActions, progress.totalActions]);

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-border/80 bg-card/95 p-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center">
            <Image
              src={logoSrc}
              alt="Startidea"
              width={140}
              height={40}
              className="h-8 w-auto sm:h-10"
              priority
              onError={() => setLogoSrc("/placeholder.png")}
            />
          </Link>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {profile.plan}
          </Badge>
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{profile.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversaciones, continuidad y acceso rápido al producto.
          </p>
          <Button type="button" className="mt-4 w-full justify-between" onClick={onNewConversation}>
            Nueva conversación
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            asChild
            type="button"
            variant={pathname === "/" ? "default" : "outline"}
            size="sm"
            className="justify-center"
          >
            <Link href="/">Chat</Link>
          </Button>
          <Button
            asChild
            type="button"
            variant={pathname === "/editor" ? "default" : "outline"}
            size="sm"
            className="justify-center"
          >
            <Link href="/editor">Editor</Link>
          </Button>
          <Button
            asChild
            type="button"
            variant={pathname === "/admin" ? "default" : "outline"}
            size="sm"
            className="justify-center"
          >
            <Link href={adminAuthenticated ? "/admin" : "/admin/login?next=/admin"}>Admin</Link>
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Conversaciones
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Actividad reciente y continuidad.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {conversations.length}
            </Badge>
          </div>

          <ScrollArea className="h-[16rem] rounded-2xl border border-border bg-muted/30">
            <div className="space-y-2 p-2">
              {conversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                  Todavía no hay conversaciones persistidas.
                </div>
              ) : (
                conversations.map((conversation) => {
                  const isActive = conversation.id === activeConversationId;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background/80 text-foreground hover:bg-accent"
                      }`}
                    >
                      <p className="truncate text-sm font-medium">{conversation.title}</p>
                      <div
                        className={`mt-2 flex items-center justify-between gap-2 text-xs ${
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        <span>{conversation.messageCount} mensajes</span>
                        <span>{formatRelativeDate(conversation.updatedAt)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div id="mi-progreso" className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {progress.completedActions}/{progress.totalActions} acciones
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
                {progress.dominantState}
              </Badge>
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">Progreso del proceso</p>
            <Progress value={progressPercent} className="mt-3 h-2.5" />
            <p className="mt-2 text-sm text-muted-foreground">
              Continuidad visible para que el trabajo no dependa solo de la memoria.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Objetivo activo
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {activeGoal?.title || "Sin objetivo activo"}
                </p>
              </div>
              {activeGoal ? (
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {activeGoal.progress}%
                </Badge>
              ) : null}
            </div>

            {activeGoal ? (
              <>
                <p className="mt-3 text-sm text-muted-foreground">
                  {activeGoal.completedCount}/{activeGoal.totalCount} acciones completadas.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant={pendingActionsCount > 0 ? "warning" : "success"}
                    className="rounded-full px-3 py-1"
                  >
                    {pendingActionsCount > 0
                      ? `${pendingActionsCount} pendientes`
                      : "Sin deuda abierta"}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {activeGoal.actions.slice(0, 3).map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start gap-2 rounded-xl border border-border bg-background/80 px-3 py-2 text-sm"
                    >
                      <span
                        className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${
                          action.completed ? "bg-emerald-500" : "bg-amber-400"
                        }`}
                      />
                      <span className={action.completed ? "text-muted-foreground line-through" : "text-foreground"}>
                        {action.description}
                      </span>
                    </div>
                  ))}
                </div>
                {actionLock ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    <p className="font-semibold">{actionLock.actionTitle}</p>
                    <p className="mt-1">{actionLock.message}</p>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Usa el chat para definir un foco y convertirlo aquí en seguimiento.
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Acceso admin
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {adminLoading
                ? "Verificando sesión..."
                : adminAuthenticated
                  ? "Sesión operativa activa."
                  : "No autenticado."}
            </p>
          </div>
          <Badge
            variant={adminAuthenticated ? "success" : "secondary"}
            className="rounded-full px-3 py-1"
          >
            <ShieldCheck className="mr-1 size-3.5" />
            {adminAuthenticated ? "Activa" : "Inactiva"}
          </Badge>
        </div>

        {adminAuthenticated ? (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            onClick={() => void onAdminLogout()}
          >
            Cerrar sesión admin
            <LogOut className="size-4" />
          </Button>
        ) : (
          <Button asChild type="button" variant="outline" className="w-full justify-between">
            <Link href="/admin/login?next=/admin">
              Entrar como admin
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
