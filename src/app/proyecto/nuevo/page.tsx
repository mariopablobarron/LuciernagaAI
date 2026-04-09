"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, ArrowRight, Heart, Lightbulb, Rocket, Eye } from "lucide-react";

const PHASES = [
  { icon: Heart, label: "Sentir", desc: "Que esta pasando? Que te molesta?", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
  { icon: Lightbulb, label: "Imaginar", desc: "Que perspectivas no ves?", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { icon: Rocket, label: "Actuar", desc: "Define tus focos y actua", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { icon: Eye, label: "Reflexionar", desc: "Que aprendiste? Que cambio?", color: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
];

export default function NuevoProyectoPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) { setError("Error creando proyecto"); return; }
      const data = await res.json();
      router.push(`/proyecto/${data.project.id}`);
    } catch { setError("Error de conexion"); }
    finally { setCreating(false); }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
          <Compass className="h-8 w-8 text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Nuevo proyecto personal</h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Define algo que quieras cambiar, explorar o resolver.
          No necesitas tenerlo claro — el proceso te ayuda a descubrirlo.
        </p>
      </div>

      {/* Phases preview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PHASES.map((p, i) => {
          const Icon = p.icon;
          return (
            <div key={i} className={`rounded-xl border p-3 text-center space-y-1 ${p.color}`}>
              <Icon className="h-5 w-5 mx-auto" />
              <p className="text-xs font-semibold">{p.label}</p>
              <p className="text-[10px] opacity-70">{p.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Form */}
      <div className="card-surface rounded-2xl border border-zinc-800 p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Que quieres trabajar?
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Cambiar de trabajo, mejorar mi relacion, encontrar mi direccion..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Contexto (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Algo mas que quieras contar sobre la situacion..."
            rows={3}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none resize-none"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</div>
        )}

        <button
          onClick={handleCreate}
          disabled={creating || !title.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition-colors"
        >
          {creating ? "Creando..." : "Empezar proyecto"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Empezaras en la fase Sentir — explorando que esta pasando de verdad.
      </p>
    </div>
  );
}
