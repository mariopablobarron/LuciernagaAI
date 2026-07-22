"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookMarked, PlusCircle, Trash2, Save, X } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminPanel } from "@/features/admin/components/AdminPanel";

type Topic = {
  id: string;
  slug: string;
  label: string;
  enabled: boolean;
  triggers: string[];
  mentorGuidance: string;
  exerciseTitle: string;
  exerciseGoal: string;
  exerciseSteps: string[];
};

type FormState = {
  slug: string;
  label: string;
  enabled: boolean;
  triggers: string; // una frase por línea
  mentorGuidance: string;
  exerciseTitle: string;
  exerciseGoal: string;
  exerciseSteps: string; // un paso por línea
};

const EMPTY_FORM: FormState = {
  slug: "",
  label: "",
  enabled: true,
  triggers: "",
  mentorGuidance: "",
  exerciseTitle: "",
  exerciseGoal: "",
  exerciseSteps: "",
};

function toForm(t: Topic): FormState {
  return {
    slug: t.slug,
    label: t.label,
    enabled: t.enabled,
    triggers: t.triggers.join("\n"),
    mentorGuidance: t.mentorGuidance,
    exerciseTitle: t.exerciseTitle,
    exerciseGoal: t.exerciseGoal,
    exerciseSteps: t.exerciseSteps.join("\n"),
  };
}

export default function GlossaryAdminPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null); // null = no editando; "new" = creando
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/glossary", { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) {
        toast.error("Error cargando el glosario");
        return;
      }
      const data = await res.json();
      setTopics(Array.isArray(data.topics) ? data.topics : []);
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setEditingId("new");
  }

  function startEdit(t: Topic) {
    setForm(toForm(t));
    setEditingId(t.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.label.trim()) {
      toast.error("Ponle un nombre al tema");
      return;
    }
    if (editingId === "new" && !form.slug.trim()) {
      toast.error("El identificador (slug) es requerido");
      return;
    }
    if (!form.mentorGuidance.trim()) {
      toast.error("La guía del mentor es requerida");
      return;
    }
    setSaving(true);
    try {
      const isNew = editingId === "new";
      const body = {
        slug: form.slug.trim().toLowerCase(),
        label: form.label.trim(),
        enabled: form.enabled,
        triggers: form.triggers,
        mentorGuidance: form.mentorGuidance,
        exerciseTitle: form.exerciseTitle,
        exerciseGoal: form.exerciseGoal,
        exerciseSteps: form.exerciseSteps,
      };
      const res = await fetch(isNew ? "/api/admin/glossary" : `/api/admin/glossary/${editingId}`, {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? `Error ${res.status}`);
        return;
      }
      toast.success(isNew ? "Tema creado" : "Tema guardado");
      cancelEdit();
      void load();
    } catch {
      toast.error("Error de red");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: Topic) {
    if (!confirm(`Eliminar el tema "${t.label}"? No se puede deshacer.`)) return;
    const res = await fetch(`/api/admin/glossary/${t.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast.success("Tema eliminado");
      if (editingId === t.id) cancelEdit();
      void load();
    } else {
      toast.error("Error al eliminar");
    }
  }

  async function toggleEnabled(t: Topic) {
    const res = await fetch(`/api/admin/glossary/${t.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !t.enabled }),
    });
    if (res.ok) void load();
    else toast.error("No se pudo cambiar el estado");
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50";
  const labelCls = "block text-xs font-semibold text-zinc-400 mb-1";

  return (
    <AdminShell
      title="Glosario"
      subtitle="Temas que el mentor detecta y trabaja con material curado"
      onLogout={handleLogout}
    >
      <AdminPanel
        id="glossary-list"
        title="Temas del glosario"
        description="Cuando alguien expresa un disparador en el chat, el mentor recibe la guía y puede ofrecer el ejercicio. Es psicoeducación, no diagnóstico."
        headerRight={
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" /> Nuevo tema
          </button>
        }
      >
        {loading ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : topics.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay temas. Crea el primero.</p>
        ) : (
          <div className="space-y-2">
            {topics.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-violet-400 shrink-0" />
                    <p className="text-sm font-semibold text-white truncate">{t.label}</p>
                    {!t.enabled && (
                      <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">
                        desactivado
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t.triggers.length} disparadores · {t.exerciseTitle || "sin ejercicio"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleEnabled(t)}
                    className="rounded-lg px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/5"
                    title={t.enabled ? "Desactivar" : "Activar"}
                  >
                    {t.enabled ? "On" : "Off"}
                  </button>
                  <button
                    onClick={() => startEdit(t)}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-violet-300 hover:bg-violet-500/10"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="rounded-lg p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>

      {editingId !== null && (
        <AdminPanel
          id="glossary-editor"
          title={editingId === "new" ? "Nuevo tema" : "Editar tema"}
          description="El mentor nunca diagnostica: ofrece el tema como hipótesis. Escribe los disparadores como frases naturales, una por línea."
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Nombre visible</label>
                <input
                  className={inputCls}
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Síndrome del impostor"
                />
              </div>
              <div>
                <label className={labelCls}>Identificador (slug)</label>
                <input
                  className={inputCls}
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="impostor"
                  disabled={editingId !== "new"}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Disparadores — frases que activan el tema (una por línea)
              </label>
              <textarea
                className={`${inputCls} min-h-24 font-mono`}
                value={form.triggers}
                onChange={(e) => setForm({ ...form, triggers: e.target.value })}
                placeholder={"me van a descubrir\nno me lo merezco\ntodo ha sido suerte"}
              />
            </div>

            <div>
              <label className={labelCls}>Guía para el mentor (cómo acompañar)</label>
              <textarea
                className={`${inputCls} min-h-32`}
                value={form.mentorGuidance}
                onChange={(e) => setForm({ ...form, mentorGuidance: e.target.value })}
                placeholder="Cómo trabajar el tema. Recuerda: hipótesis, no diagnóstico; no etiquetar a la persona."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Título del ejercicio</label>
                <input
                  className={inputCls}
                  value={form.exerciseTitle}
                  onChange={(e) => setForm({ ...form, exerciseTitle: e.target.value })}
                  placeholder="El registro de evidencia"
                />
              </div>
              <div>
                <label className={labelCls}>Objetivo del ejercicio</label>
                <input
                  className={inputCls}
                  value={form.exerciseGoal}
                  onChange={(e) => setForm({ ...form, exerciseGoal: e.target.value })}
                  placeholder="Reatribuir logros a la propia capacidad"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Pasos del ejercicio (uno por línea)</label>
              <textarea
                className={`${inputCls} min-h-28`}
                value={form.exerciseSteps}
                onChange={(e) => setForm({ ...form, exerciseSteps: e.target.value })}
                placeholder={"Recordar 3 logros recientes…\nPara cada uno, la explicación que se da…"}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Activo (el mentor lo detecta y lo ofrece)
            </label>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
              </button>
              <button
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
              >
                <X className="h-4 w-4" /> Cancelar
              </button>
            </div>
          </div>
        </AdminPanel>
      )}
    </AdminShell>
  );
}
