"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock, CheckCircle2, ChevronRight, Clock, ExternalLink, Plus, RefreshCw, Repeat, XCircle,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type Routine = {
  id: string;
  triggerId: string;
  name: string;
  purpose: string | null;
  scheduledFor: string | null;
  cronExpression: string | null;
  promptSummary: string;
  model: string | null;
  repo: string | null;
  status: "scheduled" | "ran" | "cancelled";
  resultUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

const STATUS_LABEL: Record<Routine["status"], string> = {
  scheduled: "Programada",
  ran: "Ejecutada",
  cancelled: "Cancelada",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

function daysFromNow(iso: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  if (days < 0) return `hace ${Math.abs(days)}d`;
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days}d`;
}

export default function AdminRoutinesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "scheduled" | "ran" | "cancelled">("scheduled");
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form
  const [newTriggerId, setNewTriggerId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState("");
  const [newScheduledFor, setNewScheduledFor] = useState("");
  const [newCron, setNewCron] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newModel, setNewModel] = useState("claude-sonnet-4-6");
  const [newRepo, setNewRepo] = useState("https://github.com/mariopablobarron/LuciernagaAI");
  const [savingNew, setSavingNew] = useState(false);

  // Per-row state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editResultUrl, setEditResultUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/routines?status=${filter}`, { credentials: "include" });
      if (res.status === 401) { router.replace("/admin/login?next=/admin/routines"); return; }
      if (!res.ok) throw new Error("load_failed");
      const d = (await res.json()) as { routines: Routine[] };
      setItems(d.routines);
    } catch {
      toast.error("Error al cargar routines");
    } finally {
      setLoading(false);
    }
  }, [router, filter]);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate() {
    if (!newTriggerId.trim() || !newName.trim() || !newPrompt.trim()) {
      toast.error("triggerId, nombre y prompt son obligatorios");
      return;
    }
    if (!newScheduledFor && !newCron.trim()) {
      toast.error("Indica fecha o cron");
      return;
    }
    setSavingNew(true);
    try {
      const res = await fetch("/api/admin/routines", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerId: newTriggerId.trim(),
          name: newName.trim(),
          purpose: newPurpose.trim() || null,
          scheduledFor: newScheduledFor ? new Date(newScheduledFor).toISOString() : null,
          cronExpression: newCron.trim() || null,
          promptSummary: newPrompt.trim(),
          model: newModel.trim() || null,
          repo: newRepo.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`Error: ${data.error ?? "no creado"}`);
        return;
      }
      toast.success("Routine registrada");
      setNewTriggerId(""); setNewName(""); setNewPurpose("");
      setNewScheduledFor(""); setNewCron(""); setNewPrompt("");
      setShowAddForm(false);
      void load();
    } finally {
      setSavingNew(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/routines/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(`Error: ${data.error ?? "no actualizado"}`);
        return;
      }
      toast.success("Actualizado");
      void load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveEdit(id: string) {
    await patch(id, { resultUrl: editResultUrl, notes: editNotes });
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar registro local? La routine en claude.ai NO se cancela — usa el panel de claude.ai para eso.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/routines/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { toast.error("No se pudo eliminar"); return; }
      toast.success("Eliminado");
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
      title="Agentes programados"
      subtitle="Routines remotas creadas con /schedule. Catálogo local con link al panel de claude.ai."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
        >
          <option value="scheduled">Programadas</option>
          <option value="ran">Ejecutadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="all">Todas</option>
        </select>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refrescar
        </button>
        <a
          href="https://claude.ai/code/routines"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          <ExternalLink className="h-4 w-4" /> Panel claude.ai
        </a>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" /> Registrar routine
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-3">
          <p className="text-base font-bold text-white">Registrar routine remota existente</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Tras crear una routine con <code className="text-violet-300">/schedule</code> en Claude Code, pega aquí su <code className="text-violet-300">trigger_id</code> y metadata.
            Esta página NO crea routines en claude.ai — solo las cataloga para que las veas desde admin.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">Trigger ID</label>
              <input
                value={newTriggerId}
                onChange={(e) => setNewTriggerId(e.target.value)}
                placeholder="trig_..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white font-mono placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">Nombre</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Trackers cleanup..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">Fecha y hora (one-shot)</label>
              <input
                type="datetime-local"
                value={newScheduledFor}
                onChange={(e) => setNewScheduledFor(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">Cron (recurrente)</label>
              <input
                value={newCron}
                onChange={(e) => setNewCron(e.target.value)}
                placeholder="0 9 * * 1"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white font-mono placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">Modelo</label>
              <input
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">Repo</label>
              <input
                value={newRepo}
                onChange={(e) => setNewRepo(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">Propósito (1-3 líneas)</label>
            <textarea
              value={newPurpose}
              onChange={(e) => setNewPurpose(e.target.value)}
              rows={2}
              maxLength={1000}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs uppercase font-semibold text-zinc-400 mb-1">Resumen del prompt (≤500 chars)</label>
            <textarea
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleCreate()}
              disabled={savingNew}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              {savingNew ? "Guardando…" : "Registrar"}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-base text-zinc-500">
          {filter === "scheduled" ? "No hay routines programadas." : "Sin resultados."}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const days = daysFromNow(r.scheduledFor);
            const isEditing = editingId === r.id;
            return (
              <article key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                <header className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-white">{r.name}</h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border ${
                        r.status === "scheduled"
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          : r.status === "ran"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-600 bg-zinc-800 text-zinc-400"
                      }`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono mt-1">{r.triggerId}</p>
                  </div>
                  <a
                    href={`https://claude.ai/code/routines/${r.triggerId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-zinc-600 hover:text-white shrink-0"
                  >
                    Abrir en claude.ai <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </header>

                <div className="flex items-center gap-4 flex-wrap text-sm text-zinc-400">
                  {r.cronExpression ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Repeat className="h-3.5 w-3.5 text-violet-400" />
                      <code className="font-mono text-violet-300">{r.cronExpression}</code>
                    </span>
                  ) : r.scheduledFor ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-cyan-400" />
                      {formatDateTime(r.scheduledFor)}
                      {days && <span className="text-cyan-400 ml-1">· {days}</span>}
                    </span>
                  ) : null}
                  {r.model && <span className="text-[11px] text-zinc-500">model: {r.model}</span>}
                  {r.repo && <span className="text-[11px] text-zinc-500 truncate max-w-xs">{r.repo}</span>}
                </div>

                {r.purpose && (
                  <p className="text-sm text-zinc-300 leading-relaxed">{r.purpose}</p>
                )}

                <details className="text-xs text-zinc-500">
                  <summary className="cursor-pointer hover:text-zinc-300">Resumen del prompt</summary>
                  <p className="mt-2 whitespace-pre-wrap text-zinc-400 leading-relaxed">{r.promptSummary}</p>
                </details>

                {(r.resultUrl || r.notes || isEditing) && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
                    {isEditing ? (
                      <>
                        <input
                          value={editResultUrl}
                          onChange={(e) => setEditResultUrl(e.target.value)}
                          placeholder="URL del PR/issue creado por el agente"
                          className="w-full rounded border border-zinc-700 bg-black/40 px-2 py-1.5 text-sm text-zinc-100"
                        />
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={3}
                          maxLength={2000}
                          placeholder="Notas — qué pasó, qué hace falta hacer ahora"
                          className="w-full rounded border border-zinc-700 bg-black/40 px-2 py-1.5 text-sm text-zinc-100 resize-none"
                        />
                      </>
                    ) : (
                      <>
                        {r.resultUrl && (
                          <p className="text-sm">
                            <span className="text-zinc-500">Resultado: </span>
                            <a href={r.resultUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline break-all">
                              {r.resultUrl}
                            </a>
                          </p>
                        )}
                        {r.notes && <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{r.notes}</p>}
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {r.status === "scheduled" && (
                    <>
                      <button
                        onClick={() => void patch(r.id, { status: "ran" })}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Marcar ejecutada
                      </button>
                      <button
                        onClick={() => void patch(r.id, { status: "cancelled" })}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-500/20"
                      >
                        <XCircle className="h-4 w-4" /> Cancelar
                      </button>
                    </>
                  )}
                  {r.status === "ran" && r.completedAt && (
                    <span className="text-xs text-zinc-500 inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Ejecutada {formatDateTime(r.completedAt)}
                    </span>
                  )}
                  {!isEditing ? (
                    <button
                      onClick={() => {
                        setEditingId(r.id);
                        setEditResultUrl(r.resultUrl ?? "");
                        setEditNotes(r.notes ?? "");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      Anotar resultado
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => void handleSaveEdit(r.id)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => void handleDelete(r.id)}
                    disabled={busyId === r.id}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:text-red-400 hover:border-red-500/40"
                  >
                    Eliminar registro
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-xs text-zinc-500 mt-4">
        <ChevronRight className="inline h-3 w-3 mr-1" />
        Eliminar el registro local <strong>NO</strong> cancela la routine en claude.ai. Para cancelarla, abre el panel oficial.
      </p>
    </AdminShell>
  );
}
