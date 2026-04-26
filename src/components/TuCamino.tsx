"use client";

import { useEffect, useState } from "react";

type Milestone = { id: string; label: string; at: string };

type PathData = {
  arrivedAt: string;
  milestones: Milestone[];
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function timeAccompanying(arrivedIso: string): string {
  const days = Math.floor((Date.now() - new Date(arrivedIso).getTime()) / 86400000);
  if (days < 1) return "Hoy mismo";
  if (days === 1) return "Un día acompañándote";
  if (days < 30) return `${days} días acompañándote`;
  const months = Math.floor(days / 30);
  if (months === 1) return "Un mes acompañándote";
  if (months < 12) return `${months} meses acompañándote`;
  const years = Math.floor(months / 12);
  return years === 1 ? "Un año acompañándote" : `${years} años acompañándote`;
}

export default function TuCamino() {
  const [data, setData] = useState<PathData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/path", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: PathData | null) => {
        if (!cancelled && json) setData(json);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="card-surface p-5 h-32 animate-pulse bg-zinc-900/40" />;
  }

  if (!data || data.milestones.length === 0) {
    return null;
  }

  return (
    <section className="card-surface p-5 sm:p-6 space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Tu camino</p>
        <p className="text-base text-zinc-300">{timeAccompanying(data.arrivedAt)}.</p>
      </div>

      <ol className="relative border-l border-zinc-800 ml-2 space-y-4 pl-5">
        {data.milestones.map((m) => (
          <li key={m.id} className="relative">
            <span
              aria-hidden
              className="absolute -left-[27px] top-1.5 w-2 h-2 rounded-full bg-zinc-600"
            />
            <p className="text-sm text-zinc-300 leading-snug">{m.label}</p>
            <p className="text-xs text-zinc-600 mt-0.5">{formatDate(m.at)}</p>
          </li>
        ))}
      </ol>

      <p className="text-xs text-zinc-600 leading-relaxed pt-2 border-t border-zinc-800/60">
        No hay nada que cumplir aquí. Solo lo que ya has cruzado.
      </p>
    </section>
  );
}
