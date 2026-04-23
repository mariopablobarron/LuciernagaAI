"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AssessmentFlow from "@/components/AssessmentFlow";
import { fetchBrowserSession, type BrowserSessionUser } from "@/lib/session-client";

export default function AssessmentsPage() {
  const [user, setUser] = useState<BrowserSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await fetchBrowserSession();
        if (!cancelled) setUser(session.user ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/app"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al chat
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-white">Evaluaciones</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Si tu mentor ha asignado una escala (PHQ-9 / GAD-7), aparecerá aquí. Las respuestas son
        privadas y ayudan a afinar el acompañamiento.
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : !user?.id ? (
        <p className="text-sm text-zinc-500">Necesitas iniciar sesión para ver tus evaluaciones.</p>
      ) : (
        <>
          <AssessmentFlow userId={user.id} />
          <p className="mt-6 text-xs text-zinc-600">
            Si no tienes evaluaciones pendientes, no verás nada aquí.
          </p>
        </>
      )}
    </main>
  );
}
