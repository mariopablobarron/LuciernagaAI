"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_AGE_BUCKETS, ALL_AGE_BUCKET_LABELS, type AgeBucket } from "@/lib/age-range";

type AgeState =
  | { kind: "unknown" }
  | { kind: "blocked" }
  | { kind: "declared"; ageRange: string };

/**
 * Gates access to its children behind an age declaration. The first time
 * the user shows up (no cookie + no DB row), a full-screen blocking
 * dialog asks them to pick a bucket. Picking "Menos de 14 años" sends
 * them to /menores. Other choices unlock the children.
 *
 * Flow:
 *   1. On mount, fetch /api/auth/age-state.
 *   2. kind === "blocked" → router.replace("/menores").
 *   3. kind === "declared" → render children.
 *   4. kind === "unknown" → render gate UI on top of children.
 */
export default function AgeGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AgeState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/age-state", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setState({ kind: "unknown" });
          return;
        }
        const json = (await res.json()) as AgeState;
        if (cancelled) return;
        if (json.kind === "blocked") {
          router.replace("/menores");
          return;
        }
        setState(json);
      } catch {
        if (!cancelled) setState({ kind: "unknown" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function declare(bucket: AgeBucket) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/declare-age", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket }),
        credentials: "include",
      });
      const json = (await res.json()) as { blocked?: boolean; redirect?: string; ageRange?: string };
      if (!res.ok) {
        setError("No se pudo guardar tu elección. Inténtalo de nuevo.");
        return;
      }
      if (json.blocked) {
        router.replace(json.redirect ?? "/menores");
        return;
      }
      setState({ kind: "declared", ageRange: json.ageRange ?? bucket });
    } catch {
      setError("Error de red. Comprueba tu conexión.");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === null) {
    // Loading — keep blank to avoid flashing children to under-14 users.
    return <div className="min-h-screen bg-zinc-950" aria-hidden="true" />;
  }

  if (state.kind === "declared") {
    return <>{children}</>;
  }

  // kind === "unknown" → show gate
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur flex items-center justify-center px-6 py-12 overflow-y-auto">
      <div className="max-w-lg w-full">
        <h2
          className="text-3xl md:text-4xl font-semibold text-white mb-3 leading-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Antes de empezar
        </h2>
        <p className="text-base text-zinc-300 mb-1">
          Para hablarte de la forma adecuada, ¿en qué franja de edad estás?
        </p>
        <p className="text-xs text-zinc-500 mb-6">
          Solo guardamos un rango. Tu edad exacta no nos hace falta.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_AGE_BUCKETS.map((bucket) => (
            <button
              key={bucket}
              type="button"
              disabled={submitting}
              onClick={() => void declare(bucket)}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-base text-zinc-100 hover:bg-violet-500/10 hover:border-violet-500/40 transition disabled:opacity-50 text-left"
            >
              {ALL_AGE_BUCKET_LABELS[bucket]}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        ) : null}

        <p className="mt-6 text-xs text-zinc-500 leading-relaxed">
          Al continuar declaras que la edad indicada es correcta. Si tienes
          14-17, recomendamos que un adulto de confianza esté al tanto.
        </p>
      </div>
    </div>
  );
}
