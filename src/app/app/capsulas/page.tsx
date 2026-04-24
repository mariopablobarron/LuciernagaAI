"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Hourglass, Mail, Sparkles, Lock } from "lucide-react";

type CapsuleSummary = {
  id: string;
  kind: "snapshot" | "letter";
  status: "pending" | "ready" | "delivered" | "expired";
  createdAt: string;
  deliverAt: string;
  openedAt: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (24 * 60 * 60 * 1000));
}

export default function CapsulasPage() {
  const [capsules, setCapsules] = useState<CapsuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/capsules", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const detail = await r.json().catch(() => ({}));
          throw new Error(detail.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setCapsules(data.capsules ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  const ready = capsules.filter((c) => c.status === "ready");
  const pending = capsules.filter((c) => c.status === "pending");
  const delivered = capsules.filter((c) => c.status === "delivered");

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 ring-1 ring-violet-500/20">
            <Hourglass className="h-5 w-5 text-violet-400" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-white">Cápsulas</h1>
          <p className="text-sm text-zinc-400">
            Lo que dijiste, lo que eras, lo que escribiste para ti.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-rose-900/40 bg-rose-950/30 p-4 text-sm text-rose-300">
            {error === "NOT_AUTHENTICATED"
              ? "Necesitas una sesión para ver tus cápsulas."
              : "No se pudieron cargar las cápsulas. Inténtalo más tarde."}
          </div>
        )}

        {!loading && !error && capsules.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
            <p className="text-sm text-zinc-400">
              Aún no hay nada guardado. Las cápsulas aparecen solas, con el tiempo.
            </p>
          </div>
        )}

        {!loading && ready.length > 0 && (
          <Section title="Listas para abrir">
            {ready.map((c) => (
              <CapsuleCard key={c.id} capsule={c} highlight />
            ))}
          </Section>
        )}

        {!loading && pending.length > 0 && (
          <Section title="Esperando el día">
            {pending.map((c) => (
              <CapsuleCard key={c.id} capsule={c} />
            ))}
          </Section>
        )}

        {!loading && delivered.length > 0 && (
          <Section title="Ya abiertas">
            {delivered.map((c) => (
              <CapsuleCard key={c.id} capsule={c} muted />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function CapsuleCard({
  capsule,
  highlight,
  muted,
}: {
  capsule: CapsuleSummary;
  highlight?: boolean;
  muted?: boolean;
}) {
  const isLetter = capsule.kind === "letter";
  const Icon = isLetter ? Mail : Sparkles;
  const label = isLetter ? "Carta" : "Estampa de hace 30 días";

  const daysLeft = daysUntil(capsule.deliverAt);

  if (capsule.status === "pending") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800">
          <Lock className="h-4 w-4 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-300">{label}</p>
          <p className="text-xs text-zinc-500">
            Se abre el {formatDate(capsule.deliverAt)}
            {daysLeft > 0 ? ` · en ${daysLeft} días` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/app/capsulas/${capsule.id}`}
      className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
        highlight
          ? "border-violet-500/40 bg-violet-950/30 hover:bg-violet-950/40"
          : muted
            ? "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 opacity-80"
            : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          highlight ? "bg-violet-500/20 ring-1 ring-violet-500/30" : "bg-zinc-800"
        }`}
      >
        <Icon className={`h-4 w-4 ${highlight ? "text-violet-300" : "text-zinc-400"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${muted ? "text-zinc-400" : "text-white"}`}>
          {label}
        </p>
        <p className="text-xs text-zinc-500">
          {capsule.openedAt
            ? `Abierta el ${formatDate(capsule.openedAt)}`
            : `Lista desde ${formatDate(capsule.deliverAt)}`}
        </p>
      </div>
      {highlight && (
        <span className="shrink-0 rounded-full bg-violet-500 px-3 py-1 text-xs font-semibold text-white">
          Abrir
        </span>
      )}
    </Link>
  );
}
