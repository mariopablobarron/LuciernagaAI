"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SAAS_CONFIG } from "@/lib/saas";

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
  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);

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

      const payload = (await response.json()) as { ok?: boolean; next?: string };
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
    <AuthShell
      eyebrow="Admin"
      title="Panel interno"
      description={`${SAAS_CONFIG.name} protege el acceso al dashboard con una sesion separada del usuario final.`}
    >
      <section className="mx-auto w-full max-w-md">
        <Card className="border-border/80 bg-card/95 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Admin Login
              </Badge>
              <Badge variant="warning" className="rounded-full px-3 py-1">
                <ShieldCheck className="mr-1 size-3.5" />
                Acceso restringido
              </Badge>
            </div>
            <CardTitle className="text-2xl">Entrar al dashboard</CardTitle>
            <CardDescription>
              Acceso protegido para operaciones, crisis, insights y decisiones del producto.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Usuario</span>
                <Input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Contrasena</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                  {error}
                </div>
              ) : null}

              <Button type="submit" disabled={isSubmitting} className="w-full justify-between">
                {isSubmitting ? "Entrando..." : "Entrar al panel"}
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </AuthShell>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6">Cargando...</main>}>
      <AdminLoginForm />
    </Suspense>
  );
}
