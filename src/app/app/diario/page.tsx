"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { BookOpen, Pencil, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { blocksToPlainText } from "@/components/BlockEditor";
import type { Block } from "@blocknote/core";

const BlockEditor = dynamic(() => import("@/components/BlockEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-80 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
  ),
});

type DiaryEntry = {
  id: string;
  content: string;
  blocks: Block[] | null;
  mood: string | null;
  tags: string[];
  createdAt: string;
};

const MOODS = [
  { value: "great", emoji: "😄", label: "Genial" },
  { value: "good", emoji: "🙂", label: "Bien" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "bad", emoji: "😔", label: "Mal" },
  { value: "awful", emoji: "😢", label: "Terrible" },
] as const;

const MOOD_COLORS: Record<string, string> = {
  great: "bg-emerald-500",
  good: "bg-cyan-500",
  neutral: "bg-zinc-500",
  bad: "bg-amber-500",
  awful: "bg-rose-500",
};

const TAG_OPTIONS = [
  "ansiedad", "calma", "frustracion", "esperanza", "confusion",
  "tristeza", "alegria", "miedo", "gratitud", "determinacion",
] as const;

export default function DiarioPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New entry state
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const blocksRef = useRef<Block[]>([]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMood, setEditMood] = useState<string | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const editBlocksRef = useRef<Block[]>([]);

  const fetchEntries = useCallback(() => {
    fetch("/api/diary?days=30", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ─── Create ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const blocks = blocksRef.current;
    const content = blocksToPlainText(blocks);
    if (!content.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          blocks,
          mood: selectedMood,
          tags: selectedTags,
        }),
      });
      if (res.ok) {
        setSelectedMood(null);
        setSelectedTags([]);
        blocksRef.current = [];
        fetchEntries();
        // Force remount of editor by toggling key
        setEditorKey((k) => k + 1);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const [editorKey, setEditorKey] = useState(0);

  // ─── Edit ───────────────────────────────────────────────────────────────────

  const startEdit = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setEditMood(entry.mood);
    setEditTags([...entry.tags]);
    editBlocksRef.current = entry.blocks ?? [];
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const blocks = editBlocksRef.current;
    const content = blocksToPlainText(blocks);

    setSaving(true);
    try {
      const res = await fetch(`/api/diary/${editingId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          blocks,
          mood: editMood,
          tags: editTags,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchEntries();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta entrada? No se puede deshacer.")) return;
    try {
      await fetch(`/api/diary/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchEntries();
    } catch {
      // silent
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const toggleTag = (tag: string, setter: typeof setSelectedTags) => {
    setter((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const getMoodEmoji = (mood: string | null) =>
    MOODS.find((m) => m.value === mood)?.emoji ?? "📝";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

  // Mood distribution
  const moodCounts: Record<string, number> = { great: 0, good: 0, neutral: 0, bad: 0, awful: 0 };
  for (const entry of entries) {
    if (entry.mood && entry.mood in moodCounts) moodCounts[entry.mood]++;
  }
  const maxCount = Math.max(1, ...Object.values(moodCounts));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Diario Emocional</h1>
        </div>
        <p className="text-sm text-zinc-400 max-w-xl">
          Un espacio para registrar lo que sientes. Texto, listas, encabezados — escribe como quieras.
        </p>
      </div>

      {/* New entry form with BlockNote */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
        <BlockEditor
          key={editorKey}
          onChange={(blocks) => { blocksRef.current = blocks; }}
        />

        {/* Mood selector */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Estado de animo</span>
          <div className="flex gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setSelectedMood(selectedMood === m.value ? null : m.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2 text-xs transition-colors ${
                  selectedMood === m.value
                    ? "border-violet-500/50 bg-violet-500/10 text-white"
                    : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700"
                }`}
              >
                <span className="text-lg">{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tag pills */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Etiquetas</span>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag, setSelectedTags)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Guardando..." : "Guardar entrada"}
        </button>
      </div>

      {/* Mood distribution chart */}
      {entries.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300">Distribucion de animo (30 dias)</h2>
          <div className="flex items-end gap-3 h-32">
            {MOODS.map((m) => {
              const count = moodCounts[m.value];
              const height = count > 0 ? Math.max(8, (count / maxCount) * 100) : 4;
              return (
                <div key={m.value} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs text-zinc-500">{count}</span>
                  <div className="w-full flex justify-center">
                    <div
                      className={`w-8 rounded-t-md transition-all ${MOOD_COLORS[m.value]}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-sm">{m.emoji}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
          <p className="text-sm text-zinc-500">
            No tienes entradas. Escribe tu primera reflexion arriba.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Tus entradas</h2>
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-700 transition-colors">
              {editingId === entry.id ? (
                /* ─── Editing mode ─── */
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-violet-400">Editando entrada</span>
                    <button onClick={cancelEdit} className="p-1 text-zinc-500 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <BlockEditor
                    initialBlocks={entry.blocks ?? undefined}
                    onChange={(blocks) => { editBlocksRef.current = blocks; }}
                  />

                  {/* Mood */}
                  <div className="flex gap-2">
                    {MOODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setEditMood(editMood === m.value ? null : m.value)}
                        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors ${
                          editMood === m.value
                            ? "border-violet-500/50 bg-violet-500/10 text-white"
                            : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                        }`}
                      >
                        <span>{m.emoji}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {TAG_OPTIONS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag, setEditTags)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          editTags.includes(tag)
                            ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                            : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="rounded-lg bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-400 transition-colors disabled:opacity-40"
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── Read mode ─── */
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getMoodEmoji(entry.mood)}</span>
                      <span className="text-xs text-zinc-500">{formatDate(entry.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {entry.tags.length > 0 && (
                        <div className="flex gap-1 mr-2">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => startEdit(entry)}
                        className="p-1.5 text-zinc-600 hover:text-violet-400 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                    {entry.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
