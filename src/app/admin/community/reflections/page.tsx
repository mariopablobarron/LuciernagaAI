"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Edit3, RefreshCw, X } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type Reflection = {
  id: string;
  content: string;
  source: string;
  generatedAt: string;
  approvedAt: string | null;
  publishedAt: string | null;
  readAt: string | null;
  userId: string;
  userEmail: string;
  userName: string | null;
  pulseId: string;
  prompt: string;
  weekStart: string;
  circleId: string;
  circleName: string;
  matchPattern: string;
  matchEmotion: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminReflectionsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Reflection[]>([]);
  const [statusFilter, setStatusFilter] = useState<"pending" | "published" | "all">("pending");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/community/reflections?status=${statusFilter}`, { credentials: "include" });
      if (res.status === 401) { router.replace("/admin/login"); return; }
      if (!res.ok) throw new Error("load_failed");
      const d = (await res.json()) as { reflections: Reflection[] };
      setItems(d.reflections);
    } catch {
      toast.error("Error al cargar reflexiones");
    } finally {
      setLoading(false);
    }
  }, [router, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/community/reflections/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error("approve_failed");
      toast.success("Reflexión publicada");
      void load();
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    if (!confirm("¿Rechazar esta reflexión? Se eliminará y no llegará al usuario.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/community/reflections/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) throw new Error("reject_failed");
      toast.success("Reflexión rechazada");
      void load();
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      const res = await fetch(`/api/admin/community/reflections/${editing.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editing.content }),
      });
      if (!res.ok) throw new Error("edit_failed");
      toast.success("Reflexión editada");
      setEditing(null);
      void load();
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
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
      title="Reflexiones del mentor"
      subtitle="Devolución privada generada por LLM. Aprueba antes de que llegue al usuario."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/community/circles" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Círculos
        </Link>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
        >
          <option value="pending">Pendientes de aprobación</option>
          <option value="published">Publicadas</option>
          <option value="all">Todas</option>
        </select>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refrescar
        </button>
        <p className="ml-auto text-xs text-zinc-500">{items.length} reflexiones</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
          {statusFilter === "pending" ? "No hay reflexiones pendientes." : "Sin resultados."}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const isEditing = editing?.id === r.id;
            return (
              <article key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/users/${r.userId}`} className="text-sm font-semibold text-violet-300 hover:text-violet-200">
                      {r.userName ?? r.userEmail.split("@")[0]}
                    </Link>
                    <p className="text-[11px] text-zinc-500 truncate">{r.userEmail}</p>
                  </div>
                  <div className="text-right shrink-0 text-[11px] text-zinc-500">
                    <Link href={`/admin/community/circles/${r.circleId}`} className="text-cyan-400 hover:text-cyan-300">
                      {r.circleName}
                    </Link>
                    <p>{r.matchEmotion} · {r.matchPattern}</p>
                    <p>{formatDate(r.generatedAt)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
                  <p className="text-[10px] text-cyan-400 italic">Pregunta: &laquo;{r.prompt}&raquo;</p>
                  {isEditing ? (
                    <textarea
                      value={editing.content}
                      onChange={(e) => setEditing({ id: r.id, content: e.target.value })}
                      rows={6}
                      maxLength={2000}
                      className="w-full rounded border border-zinc-700 bg-black/40 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none resize-none"
                    />
                  ) : (
                    <p className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                  )}
                  <p className="text-[10px] text-zinc-500">
                    source: <span className="font-mono">{r.source}</span>
                    {r.publishedAt && ` · publicada ${formatDate(r.publishedAt)}`}
                    {r.readAt && ` · leída ${formatDate(r.readAt)}`}
                  </p>
                </div>

                {!r.publishedAt && (
                  <div className="flex gap-2 flex-wrap">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => void saveEdit()}
                          disabled={busyId === r.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          <Check className="h-3 w-3" /> Guardar edición
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => void approve(r.id)}
                          disabled={busyId === r.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          <Check className="h-3 w-3" /> Aprobar y publicar
                        </button>
                        <button
                          onClick={() => setEditing({ id: r.id, content: r.content })}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                        >
                          <Edit3 className="h-3 w-3" /> Editar
                        </button>
                        <button
                          onClick={() => void reject(r.id)}
                          disabled={busyId === r.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                        >
                          <X className="h-3 w-3" /> Rechazar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
