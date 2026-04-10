"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen } from "lucide-react";

type DiaryEntry = {
  id: string;
  content: string;
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
  "ansiedad",
  "calma",
  "frustracion",
  "esperanza",
  "confusion",
  "tristeza",
  "alegria",
  "miedo",
  "gratitud",
  "determinacion",
] as const;

export default function DiarioPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const fetchEntries = useCallback(() => {
    fetch("/api/diary?days=7", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          mood: selectedMood,
          tags: selectedTags,
        }),
      });
      if (res.ok) {
        setContent("");
        setSelectedMood(null);
        setSelectedTags([]);
        fetchEntries();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Mood distribution for bar chart
  const moodCounts: Record<string, number> = { great: 0, good: 0, neutral: 0, bad: 0, awful: 0 };
  for (const entry of entries) {
    if (entry.mood && entry.mood in moodCounts) {
      moodCounts[entry.mood]++;
    }
  }
  const maxCount = Math.max(1, ...Object.values(moodCounts));

  // Group entries by day
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  };

  const getMoodEmoji = (mood: string | null) => {
    return MOODS.find((m) => m.value === mood)?.emoji ?? "📝";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Diario Emocional</h1>
        </div>
        <p className="text-sm text-zinc-400 max-w-xl">
          Un espacio para registrar lo que sientes. Sin juicio, sin filtro.
        </p>
      </div>

      {/* Entry form */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="¿Qué estás sintiendo hoy?"
          rows={4}
          className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
        />

        {/* Mood selector */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Estado de ánimo</span>
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
                onClick={() => toggleTag(tag)}
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
          disabled={!content.trim() || saving}
          className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Guardando..." : "Guardar entrada"}
        </button>
      </div>

      {/* Mood distribution chart */}
      {entries.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300">Distribución de ánimo (7 días)</h2>
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

      {/* Week entries */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
          <p className="text-sm text-zinc-500">
            No tienes entradas esta semana. Escribe tu primera reflexión arriba.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Últimos 7 días</h2>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getMoodEmoji(entry.mood)}</span>
                  <span className="text-xs text-zinc-500">{formatDate(entry.createdAt)}</span>
                </div>
                {entry.tags.length > 0 && (
                  <div className="flex gap-1.5">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-zinc-300 line-clamp-3">{entry.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
