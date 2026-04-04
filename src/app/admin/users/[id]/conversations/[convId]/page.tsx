"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, MessageSquareText, User } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type ConversationData = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  rating: number | null;
  journalMode: boolean;
  userId: string | null;
  user: { id: string; email: string; name: string | null } | null;
  messages: Message[];
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminConversationPage() {
  const { id: userId, convId } = useParams<{ id: string; convId: string }>();
  const router = useRouter();

  const [data, setData] = useState<ConversationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/conversations/${convId}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/admin/login");
          return;
        }
        const json = (await res.json()) as { conversation?: ConversationData; error?: string };
        if (!res.ok || !json.conversation) {
          throw new Error(json.error ?? "No se pudo cargar la conversación.");
        }
        setData(json.conversation);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      });
  }, [convId, router]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
    router.replace("/admin/login");
  }

  const userMessages = data?.messages.filter((m) => m.role === "user") ?? [];

  return (
    <AdminShell
      title="Conversación completa"
      subtitle={data ? `${data.user?.email ?? "Usuario desconocido"} · ${data.messages.length} mensajes` : "Cargando…"}
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Back link */}
      <Link
        href={`/admin/users/${userId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver a la ficha del usuario
      </Link>

      {error ? (
        <Card className="border-signal-danger/30 bg-signal-danger/12">
          <CardContent className="p-4 text-foreground">{error}</CardContent>
        </Card>
      ) : !data ? (
        <Card className="border-border/80 bg-card/95">
          <CardContent className="p-5 text-muted-foreground">Cargando conversación…</CardContent>
        </Card>
      ) : (
        <>
          {/* Metadata */}
          <Card className="border-border/80 bg-card/95">
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <MessageSquareText className="size-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground">{data.title}</span>
              <Badge variant="secondary">{data.messages.length} mensajes</Badge>
              <Badge variant="secondary">{userMessages.length} del usuario</Badge>
              {data.rating === 1 && <Badge variant="secondary">👍 Útil</Badge>}
              {data.rating === -1 && <Badge variant="secondary">👎 No útil</Badge>}
              {data.journalMode && <Badge variant="secondary">Modo diario</Badge>}
              <span className="text-muted-foreground ml-auto">{formatDate(data.createdAt)}</span>
            </CardContent>
          </Card>

          {/* Chat thread */}
          <Card className="border-border/80 bg-card/95">
            <CardContent className="p-4 space-y-4">
              {data.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin mensajes en esta conversación.</p>
              ) : (
                data.messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="shrink-0 w-8 h-8 rounded-full bg-violet-500/15 ring-1 ring-violet-500/30 flex items-center justify-center mt-0.5">
                          <Bot className="w-4 h-4 text-violet-400" />
                        </div>
                      )}

                      <div className={`max-w-[72%] space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                        <div
                          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            isUser
                              ? "bg-violet-600/20 border border-violet-500/30 text-foreground rounded-tr-sm"
                              : "bg-muted border border-border text-foreground rounded-tl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[11px] text-muted-foreground px-1">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>

                      {isUser && (
                        <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-700/50 ring-1 ring-zinc-600/40 flex items-center justify-center mt-0.5">
                          <User className="w-4 h-4 text-zinc-400" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AdminShell>
  );
}
