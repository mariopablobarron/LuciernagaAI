"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  /** Called after the server confirms the save, with the stored name. */
  onSaved: (name: string) => void;
};

const MAX_NAME_LENGTH = 60;

export default function NameCaptureModal({ open, onSaved }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) return;
    if (trimmed.length > MAX_NAME_LENGTH) {
      toast.error(`Demasiado largo (máx ${MAX_NAME_LENGTH}).`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(body.message ?? "No se pudo guardar el nombre.");
        return;
      }
      onSaved(trimmed);
    } catch {
      toast.error("Error de red. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 sm:px-6 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-capture-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 animate-in zoom-in-95 duration-200 space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-violet-400 font-semibold">
            Antes de seguir
          </p>
          <h2
            id="name-capture-title"
            className="text-xl sm:text-2xl font-serif text-white leading-tight"
          >
            ¿Cómo te llamas?
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Solo tu nombre, el que quieras que use el mentor para dirigirse a ti.
            No necesito tu email ni nada más — con esto basta para empezar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            autoFocus
            maxLength={MAX_NAME_LENGTH}
            disabled={saving}
            className="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="w-full rounded-xl bg-violet-500 hover:bg-violet-400 px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando…" : "Continuar"}
          </button>
        </form>

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Puedes cambiarlo cuando quieras desde Ajustes.
        </p>
      </div>
    </div>
  );
}
