"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";

function normalizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }
  if (value.startsWith("/api/") || value.startsWith("/admin/login")) {
    return "/admin";
  }
  return value;
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next")),
    [searchParams],
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, next: nextPath }),
      });

      if (!response.ok) {
        setError("Credenciales inválidas.");
        return;
      }

      const payload = (await response.json()) as {
        ok?: boolean;
        next?: string;
      };
      if (payload.ok) {
        router.replace(payload.next || "/admin");
        return;
      }

      setError("No se pudo iniciar sesión.");
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-zinc-950">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-fuchsia-500/6 blur-3xl" />
      </div>

      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          <div className="card-surface overflow-hidden rounded-2xl border border-zinc-800">
            <div className="grid lg:grid-cols-[1fr_1.1fr]">
              {/* ── Left panel — Info ──────────────────────────────── */}
              <div className="border-b border-zinc-800 bg-linear-to-br from-zinc-900 to-zinc-950 p-8 lg:border-b-0 lg:border-r">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3 py-1 text-[11px] font-semibold text-violet-300 border border-violet-500/30">
                    <Sparkles className="h-3 w-3" />
                    Admin
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                    <Lock className="h-3 w-3" />
                    Acceso restringido
                  </span>
                </div>

                {/* Title */}
                <h1 className="mt-6 text-3xl font-bold text-white">
                  Panel interno
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
                  Acceso protegido para operaciones, crisis, insights y
                  decisiones del producto.
                </p>

                {/* Info cards */}
                <div className="mt-8 space-y-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <p className="text-sm font-semibold text-white">
                      Tres Mil Millones de Latidos
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                      Plataforma de acompañamiento para el desarrollo personal y
                      bienestar emocional.
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                      Garantías
                    </p>
                    <div className="mt-3 space-y-2.5">
                      <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500/70" />
                        <span>Sesión admin separada del usuario final</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500/70" />
                        <span>
                          Acceso controlado y orientado a operación
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Right panel — Form ─────────────────────────────── */}
              <div className="p-8">
                {/* Form header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400 border border-zinc-700">
                      Admin Login
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30">
                      <ShieldCheck className="h-3 w-3" />
                      Restringido
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-white">
                    Entrar al dashboard
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Acceso protegido para operaciones, crisis, insights y
                    decisiones del producto.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Usuario
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                      placeholder="admin"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Contraseña
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                      placeholder="••••••••"
                    />
                  </label>

                  {/* Error */}
                  {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-between rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-50"
                  >
                    <span>
                      {isSubmitting ? "Entrando..." : "Entrar al panel"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="mt-6 text-center text-xs text-zinc-700">
            Tres Mil Millones de Latidos no sustituye terapia ni intervención psicológica
            profesional.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
