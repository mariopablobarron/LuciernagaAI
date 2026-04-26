"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Mail, RefreshCw, X } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type LetterContext = {
  name?: string | null;
  messageCount?: number;
  dominantPattern?: string | null;
  primaryEmotion?: string | null;
  onboardingContext?: { feeling?: string; intent?: string; timeframe?: string } | null;
  submittedAt?: string;
} | null;

type Letter = {
  id: string;
  userId: string;
  email: string;
  status: "pending" | "sent" | "rejected";
  context: LetterContext;
  requestedAt: string;
  sentAt: string | null;
  sentByAdminId: string | null;
  notes: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    messageCount: number;
  };
};

type StatusFilter = "all" | "pending" | "sent" | "rejected";

const STATUS_LABEL: Record<Letter["status"], string> = {
  pending: "Pendiente",
  sent: "Enviada",
  rejected: "Rechazada",
};

const STATUS_COLORS: Record<Letter["status"], string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  sent: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-zinc-700/30 text-zinc-400 border-zinc-600/30",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days}d`;
}

export default function AdminTeamLettersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Letter[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ pending: 0, sent: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/admin/team-letters${qs}`, { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin/team-letters");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      const d = (await res.json()) as { items: Letter[]; countByStatus: Record<string, number> };
      setItems(d.items);
      setCounts(d.countByStatus);
    } catch {
      toast.error("Error al cargar cartas");
    } finally {
      setLoading(false);
    }
  }, [router, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, body: { status?: Letter["status"]; notes?: string }) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/team-letters/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("No se pudo actualizar");
        return;
      }
      toast.success("Actualizada");
      void load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" }).catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <AdminShell
      title="Cartas del equipo"
      subtitle="Solicitudes de carta humana desde el chat. Léelas, escribe la respuesta por email y márcala como enviada."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
        >
          <option value="pending">Pendientes ({counts.pending ?? 0})</option>
          <option value="sent">Enviadas ({counts.sent ?? 0})</option>
          <option value="rejected">Rechazadas ({counts.rejected ?? 0})</option>
          <option value="all">Todas</option>
        </select>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refrescar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-base text-zinc-500">
          {filter === "pending" ? "No hay cartas pendientes." : "Sin resultados."}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((letter) => {
            const ctx = letter.context;
            const isEditingNotes = editingNotesId === letter.id;
            const isBusy = busyId === letter.id;
            return (
              <div
                key={letter.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3"
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[letter.status]}`}
                  >
                    {STATUS_LABEL[letter.status]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white truncate">
                      {letter.email}
                      {letter.user.name ? <span className="text-zinc-400"> — {letter.user.name}</span> : null}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Solicitada {daysAgo(letter.requestedAt)} · {formatDateTime(letter.requestedAt)}
                      {letter.sentAt ? ` · Enviada ${formatDateTime(letter.sentAt)}` : null}
                    </p>
                  </div>
                  <Link
                    href={`/admin/users/${letter.userId}`}
                    className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                  >
                    Ficha del usuario <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-zinc-950/40 p-3">
                    <p className="text-xs uppercase font-semibold text-zinc-500 mb-1">Contexto en el momento</p>
                    <ul className="space-y-1 text-zinc-300">
                      <li>Mensajes: <span className="font-bold text-white">{ctx?.messageCount ?? "—"}</span></li>
                      <li>Patrón: <span className="font-bold text-white">{ctx?.dominantPattern ?? "—"}</span></li>
                      <li>Emoción: <span className="font-bold text-white">{ctx?.primaryEmotion ?? "—"}</span></li>
                      {ctx?.onboardingContext?.feeling ? (
                        <li>Onboarding: <span className="text-zinc-400">{ctx.onboardingContext.feeling} · {ctx.onboardingContext.intent}</span></li>
                      ) : null}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-zinc-950/40 p-3">
                    <p className="text-xs uppercase font-semibold text-zinc-500 mb-1">Notas internas</p>
                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={3}
                          maxLength={1000}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none"
                          placeholder="Borrador, hilo a destacar, link al email enviado..."
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={isBusy}
                            onClick={() => {
                              void patch(letter.id, { notes: notesDraft });
                              setEditingNotesId(null);
                            }}
                            className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingNotesId(null)}
                            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingNotesId(letter.id);
                          setNotesDraft(letter.notes ?? "");
                        }}
                        className="text-left text-zinc-300 hover:text-white w-full"
                      >
                        {letter.notes || <span className="text-zinc-600 italic">Añadir notas…</span>}
                      </button>
                    )}
                  </div>
                </div>

                {letter.status === "pending" ? (
                  <div className="flex gap-2 flex-wrap pt-1">
                    <a
                      href={`mailto:${letter.email}?subject=${encodeURIComponent("Una nota desde Tres Mil Millones de Latidos")}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-bold text-white"
                    >
                      <Mail className="h-4 w-4" /> Abrir email
                    </a>
                    <button
                      disabled={isBusy}
                      onClick={() => void patch(letter.id, { status: "sent" })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 text-sm text-emerald-200 disabled:opacity-40"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Marcar enviada
                    </button>
                    <button
                      disabled={isBusy}
                      onClick={() => void patch(letter.id, { status: "rejected" })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 px-3 py-2 text-sm text-zinc-400 disabled:opacity-40"
                    >
                      <X className="h-4 w-4" /> Rechazar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap pt-1">
                    <button
                      disabled={isBusy}
                      onClick={() => void patch(letter.id, { status: "pending" })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 px-3 py-2 text-sm text-zinc-400 disabled:opacity-40"
                    >
                      Reabrir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
