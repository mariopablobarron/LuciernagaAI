"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Gift, LogOut, Pencil, Plus, Search, Share2, ShieldCheck, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import FamilySettings from "@/components/FamilySettings";
import SidebarRetoWidget from "@/components/SidebarRetoWidget";
import { ShareStoryCard } from "@/components/ShareStoryCard";

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
  emotionalState?: string;
  streakDays?: number;
  progressTrend?: string;
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
  onRenameConversation?: (id: string, title: string) => Promise<void> | void;
  onDeleteConversation?: (id: string) => Promise<void> | void;
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
  onRenameConversation,
  onDeleteConversation,
}: SidebarProps) {
  const pathname = usePathname();
  const [logoSrc, setLogoSrc] = useState("/logo-startidea.png");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showShareStory, setShowShareStory] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  type InviteItem = { code: string; url: string; used: boolean; usedByEmail: string | null };
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    fetch("/api/user/invites", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { ok: boolean; invites?: InviteItem[] }) => {
        if (d.ok) setInvites(d.invites ?? []);
      })
      .catch(() => { /* Invites are non-critical — fail silently */ });
  }, []);

  function copyInvite(code: string, url: string) {
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopiedCode(null), 2000);
    });
  }

  const availableInvites = invites.filter((i) => !i.used);

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

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  function startEditing(id: string, title: string) {
    setEditingId(id);
    setEditingTitle(title);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  async function commitRename(id: string) {
    const trimmed = editingTitle.trim();
    if (trimmed && trimmed !== conversations.find((c) => c.id === id)?.title) {
      await onRenameConversation?.(id, trimmed);
    }
    setEditingId(null);
  }

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-border/80 bg-card/95 p-4 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/app" className="inline-flex items-center">
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
          <Link href="/app/settings" className="mt-1 block text-sm font-medium text-foreground hover:text-primary transition-colors">
            {profile.name}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversaciones, continuidad y acceso rápido al producto.
          </p>
          <Button type="button" className="mt-4 w-full justify-between" onClick={onNewConversation} data-tour="new-conversation">
            Nueva conversación
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2" data-tour="nav-buttons">
          <Button
            asChild
            type="button"
            variant={pathname === "/app" ? "default" : "outline"}
            size="sm"
            className="justify-center"
          >
            <Link href="/app">Chat</Link>
          </Button>
          <Button
            asChild
            type="button"
            variant={pathname === "/editor" ? "default" : "outline"}
            size="sm"
            className="justify-center"
            title="Escribe y organiza ideas con formato largo"
          >
            <Link href="/editor">Editor</Link>
          </Button>
          <Button
            asChild
            type="button"
            variant={pathname === "/app/explore" ? "default" : "outline"}
            size="sm"
            className="justify-center"
            title="Contenido y ejercicios para tu estado emocional"
          >
            <Link href="/app/explore">Explorar</Link>
          </Button>
          <Button
            asChild
            type="button"
            variant={pathname?.startsWith("/community") ? "default" : "outline"}
            size="sm"
            className="justify-center"
            data-tour="comunidad"
          >
            <Link href="/community">Comunidad</Link>
          </Button>
          <Button
            asChild
            type="button"
            variant={pathname?.startsWith("/app/settings") ? "default" : "outline"}
            size="sm"
            className="justify-center col-span-2"
            data-tour="ajustes"
          >
            <Link href="/app/settings">Ajustes</Link>
          </Button>
        </div>

        <Link
          href="/impulso"
          data-tour="modo-impulso"
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition hover:border-signal-warning/50 hover:bg-signal-warning/10 ${
            pathname.startsWith("/impulso")
              ? "border-signal-warning/40 bg-signal-warning/12 text-foreground"
              : "border-border bg-muted/30 text-foreground"
          }`}
        >
          <div>
            <p className="font-semibold leading-snug">⚡ Modo Impulso</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Diagnóstico, retos personalizados y racha diaria para convertir intención en
              ejecución.
            </p>
          </div>
          <ArrowRight className="ml-3 size-4 shrink-0 text-muted-foreground" />
        </Link>

        <SidebarRetoWidget />
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar conversación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-xl pl-8 text-xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <ScrollArea className="h-64 rounded-2xl border border-border bg-muted/30">
            <div className="space-y-2 p-2">
              {filteredConversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                  {searchQuery ? "Sin resultados." : "Todavía no hay conversaciones persistidas."}
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const isActive = conversation.id === activeConversationId;
                  const isEditing = editingId === conversation.id;
                  const isDeleting = deletingId === conversation.id;

                  return (
                    <div
                      key={conversation.id}
                      className={`group relative rounded-2xl border transition ${
                        isActive
                          ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background/80 text-foreground hover:bg-accent"
                      }`}
                    >
                      {isDeleting ? (
                        <div className="flex items-center gap-2 px-3 py-3">
                          <p className="flex-1 truncate text-xs">¿Eliminar conversación?</p>
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteConversation?.(conversation.id);
                              setDeletingId(null);
                            }}
                            className="rounded-lg bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground hover:opacity-90"
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="rounded-lg border px-2 py-1 text-[11px] hover:bg-muted"
                          >
                            No
                          </button>
                        </div>
                      ) : isEditing ? (
                        <div className="flex items-center gap-1 px-2 py-2">
                          <input
                            ref={editInputRef}
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void commitRename(conversation.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="h-7 flex-1 rounded-lg border border-primary/30 bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => void commitRename(conversation.id)}
                            className="rounded-lg p-1 text-signal-success hover:bg-signal-success/10"
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg p-1 hover:bg-muted"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectConversation(conversation.id)}
                          className="w-full px-3 py-3 text-left"
                        >
                          <p className="truncate pr-12 text-sm font-medium">{conversation.title}</p>
                          <div
                            className={`mt-2 flex items-center justify-between gap-2 text-xs ${
                              isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                            }`}
                          >
                            <span>{conversation.messageCount} mensajes</span>
                            <span>{formatRelativeDate(conversation.updatedAt)}</span>
                          </div>
                        </button>
                      )}

                      {!isEditing && !isDeleting ? (
                        <div className="absolute right-2 top-2 hidden items-center gap-0.5 group-hover:flex">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(conversation.id, conversation.title);
                            }}
                            className={`rounded-lg p-1 hover:bg-muted/60 ${isActive ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            title="Renombrar"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(conversation.id);
                            }}
                            className={`rounded-lg p-1 hover:bg-destructive/10 ${isActive ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-destructive"}`}
                            title="Eliminar"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div id="mi-progreso" data-tour="mi-progreso" className="space-y-4">
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
            {progress.emotionalState || progress.streakDays !== undefined ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {progress.emotionalState ? (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
                    {progress.emotionalState}
                  </Badge>
                ) : null}
                {progress.progressTrend ? (
                  <Badge
                    variant={
                      progress.progressTrend === "mejor"
                        ? "success"
                        : progress.progressTrend === "empeora"
                          ? "warning"
                          : "secondary"
                    }
                    className="rounded-full px-3 py-1"
                  >
                    Tendencia: {progress.progressTrend}
                  </Badge>
                ) : null}
                {(progress.streakDays ?? 0) > 0 ? (
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    🔥 {progress.streakDays} días racha
                  </Badge>
                ) : null}
                <button
                  onClick={() => setShowShareStory(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors"
                >
                  <Share2 className="w-3 h-3" /> Compartir
                </button>
              </div>
            ) : null}
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
                          action.completed ? "bg-signal-success" : "bg-signal-warning"
                        }`}
                      />
                      <span
                        className={
                          action.completed
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }
                      >
                        {action.description}
                      </span>
                    </div>
                  ))}
                </div>
                {actionLock ? (
                  <div className="mt-3 rounded-xl border border-signal-warning/30 bg-signal-warning/12 px-3 py-3 text-sm text-foreground">
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

      <FamilySettings />

      <Separator className="my-4" />

      {/* Invitaciones */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Invitaciones
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {availableInvites.length > 0
                ? `${availableInvites.length} disponible${availableInvites.length > 1 ? "s" : ""}`
                : "Gana invitaciones con tu racha"}
            </p>
          </div>
          <Gift className="size-4 shrink-0 text-fuchsia-400" />
        </div>

        {availableInvites.length > 0 ? (
          <div className="space-y-2">
            {availableInvites.slice(0, 3).map((inv) => (
              <div
                key={inv.code}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2"
              >
                <p className="truncate text-xs text-muted-foreground font-mono">
                  /i/{inv.code.slice(0, 8)}…
                </p>
                <button
                  type="button"
                  onClick={() => copyInvite(inv.code, inv.url)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted transition-colors"
                >
                  {copiedCode === inv.code ? (
                    <><Check className="size-3 text-green-500" /> Copiado</>
                  ) : (
                    <><Copy className="size-3" /> Copiar</>
                  )}
                </button>
              </div>
            ))}
            <Link href="/app/invitar" className="block text-center text-xs text-violet-400 hover:text-violet-300 transition-colors">
              {availableInvites.length > 3 ? `+${availableInvites.length - 3} mas — ` : ""}Ver todas las invitaciones
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <p>🔥 <strong>7 días de racha</strong> → 1 invitación</p>
            <p>🏆 <strong>30 días de racha</strong> → 1 invitación más</p>
          </div>
        )}
      </div>

      {adminAuthenticated && (
        <>
          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Acceso admin
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sesión operativa activa.
                </p>
              </div>
              <Badge
                variant="success"
                className="rounded-full px-3 py-1"
              >
                <ShieldCheck className="mr-1 size-3.5" />
                Activa
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button asChild type="button" variant="outline" size="sm" className="justify-between">
                <Link href="/admin">
                  Panel admin
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-between"
                onClick={() => void onAdminLogout()}
              >
                Cerrar sesión
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Share Story Modal */}
      {showShareStory && (
        <ShareStoryCard
          data={{
            name: profile.name,
            streakDays: progress.streakDays ?? 0,
            completedActions: progress.completedActions,
            totalActions: progress.totalActions,
            goalTitle: activeGoal?.title ?? null,
            state: progress.emotionalState ?? progress.dominantState ?? "neutral",
            plan: profile.plan ?? "Free",
          }}
          onClose={() => setShowShareStory(false)}
        />
      )}
    </aside>
  );
}
