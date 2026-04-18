"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check, Plus, Trash2, StickyNote, Filter, Clock, CheckCircle2,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

type Note = {
  id: string;
  title: string;
  body: string | null;
  tag: string;
  priority: "low" | "medium" | "high";
  status: "open" | "done";
  createdBy: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type StatusFilter = "open" | "done" | "all";
type TagFilter = "all" | "general" | "referrals" | "migration" | "env" | "cron" | "ui" | "incident";

const TAGS: { value: Exclude<TagFilter, "all">; label: string; color: string }[] = [
  { value: "general", label: "General", color: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  { value: "referrals", label: "Referidos", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { value: "migration", label: "Migración", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { value: "env", label: "Entorno", color: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  { value: "cron", label: "Cron", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  { value: "ui", label: "UI", color: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  { value: "incident", label: "Incidente", color: "bg-red-500/15 text-red-300 border-red-500/30" },
];

const PRIORITY_STYLE: Record<Note["priority"], string> = {
  high: "bg-red-500/15 text-red-300 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const PRIORITY_RANK: Record<Note["priority"], number> = { high: 0, medium: 1, low: 2 };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tagMeta(tag: string) {
  return TAGS.find((t) => t.value === tag) ?? TAGS[0];
}

export default function NotesPage() {
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");

  // New-note form state
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newTag, setNewTag] = useState<Exclude<TagFilter, "all">>("general");
  const [newPriority, setNewPriority] = useState<Note["priority"]>("medium");
  const [creating, setCreating] = useState(false);

  const checkAuth = useCallback(
    (res: Response): boolean => {
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin/notas");
        return false;
      }
      return true;
    },
    [router],
  );

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (tagFilter !== "all") params.set("tag", tagFilter);
      const res = await fetch(`/api/admin/notes?${params.toString()}`, {
        credentials: "include",
      });
      if (!checkAuth(res)) return;
      if (!res.ok) {
        toast.error("Error al cargar notas");
        return;
      }
      const data = (await res.json()) as { notes: Note[] };
      const sorted = [...data.notes].sort((a, b) => {
        if (a.status !== b.status) return a.status === "open" ? -1 : 1;
        const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (p !== 0) return p;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setNotes(sorted);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tagFilter, checkAuth]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          body: newBody.trim() || undefined,
          tag: newTag,
          priority: newPriority,
        }),
      });
      if (!checkAuth(res)) return;
      if (!res.ok) {
        toast.error("Error al crear nota");
        return;
      }
      setNewTitle("");
      setNewBody("");
      setNewTag("general");
      setNewPriority("medium");
      toast.success("Nota añadida");
      await loadNotes();
    } finally {
      setCreating(false);
    }
  }

  async function toggleDone(note: Note) {
    const nextStatus = note.status === "open" ? "done" : "open";
    const res = await fetch(`/api/admin/notes/${note.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!checkAuth(res)) return;
    if (!res.ok) {
      toast.error("Error al actualizar");
      return;
    }
    await loadNotes();
  }

  async function deleteNote(note: Note) {
    if (!window.confirm(`¿Eliminar la nota "${note.title}"?`)) return;
    const res = await fetch(`/api/admin/notes/${note.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!checkAuth(res)) return;
    if (!res.ok) {
      toast.error("Error al eliminar");
      return;
    }
    toast.success("Nota eliminada");
    await loadNotes();
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  const openCount = notes.filter((n) => n.status === "open").length;
  const doneCount = notes.filter((n) => n.status === "done").length;

  return (
    <AdminShell
      title="Notas internas"
      subtitle="Pendientes, recordatorios y seguimientos. Lo que no debe olvidarse entre sesiones."
      onLogout={handleLogout}
    >
      {/* Create new note */}
      <AdminPanel
        title="Nueva nota"
        tooltip="Cualquier admin puede añadir. Usa tags para clasificar: migración, cron, env, etc."
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value.slice(0, 200))}
            placeholder="Título de la nota..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            maxLength={200}
            required
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Detalle (opcional)..."
            rows={3}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
          />
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Tag
              </label>
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value as Exclude<TagFilter, "all">)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                {TAGS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Prioridad
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Note["priority"])}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
              {creating ? "Añadiendo..." : "Añadir"}
            </button>
          </div>
        </form>
      </AdminPanel>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-xs text-zinc-500 mr-2">Estado:</span>
        {(["open", "done", "all"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
              statusFilter === s
                ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {s === "open" ? `Abiertas (${openCount})` : s === "done" ? `Hechas (${doneCount})` : "Todas"}
          </button>
        ))}
        <span className="text-xs text-zinc-500 ml-4 mr-2">Tag:</span>
        <button
          type="button"
          onClick={() => setTagFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
            tagFilter === "all"
              ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
              : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Todos
        </button>
        {TAGS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTagFilter(t.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
              tagFilter === t.value
                ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <AdminPanel title="Cargando...">
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        </AdminPanel>
      ) : notes.length === 0 ? (
        <AdminPanel title="Sin notas">
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
            <StickyNote className="h-8 w-8 mx-auto text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500">
              No hay notas que coincidan con los filtros.
            </p>
          </div>
        </AdminPanel>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const t = tagMeta(note.tag);
            const done = note.status === "done";
            return (
              <div
                key={note.id}
                className={`rounded-xl border p-4 transition-colors ${
                  done
                    ? "border-zinc-900 bg-zinc-950/60 opacity-60"
                    : "border-zinc-800 bg-zinc-900/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDone(note)}
                    className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                      done
                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                        : "border-zinc-700 hover:border-violet-500/60"
                    }`}
                    title={done ? "Marcar como abierta" : "Marcar como hecha"}
                  >
                    {done && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3
                        className={`text-sm font-semibold ${
                          done ? "text-zinc-500 line-through" : "text-white"
                        }`}
                      >
                        {note.title}
                      </h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${t.color}`}>
                        {t.label}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[note.priority]}`}>
                        {note.priority === "high" ? "Alta" : note.priority === "medium" ? "Media" : "Baja"}
                      </span>
                    </div>
                    {note.body && (
                      <p className={`text-xs leading-relaxed whitespace-pre-wrap ${done ? "text-zinc-600" : "text-zinc-400"}`}>
                        {note.body}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-zinc-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(note.createdAt)}
                        {note.createdBy && <span> · {note.createdBy}</span>}
                      </span>
                      {done && note.resolvedAt && (
                        <span className="inline-flex items-center gap-1 text-emerald-500/70">
                          <CheckCircle2 className="h-3 w-3" />
                          Hecha {formatDate(note.resolvedAt)}
                          {note.resolvedBy && <span> · {note.resolvedBy}</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNote(note)}
                    className="shrink-0 rounded-lg p-1.5 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="Eliminar nota"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
