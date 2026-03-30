"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Search, ShieldAlert, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AdminShell } from "@/features/admin/components/AdminShell";

type AdminUsersResponse = {
  items: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
    lastSeen: string;
    state: string;
    riskLevel: string;
    crisisActive: boolean;
    plan: string;
    subscriptionStatus: string;
    profileTitle: string | null;
    streakDays: number;
    counts: {
      conversations: number;
      messages: number;
      goals: number;
      checkins7d: number;
      crisisEvents7d: number;
      avoidanceEvents7d: number;
    };
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    q: string;
    state: string;
    riskOnly: boolean;
  };
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function riskVariant(level: string): "secondary" | "warning" | "danger" {
  if (level === "critical") return "danger";
  if (level === "high") return "warning";
  return "secondary";
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [riskOnly, setRiskOnly] = useState(false);
  const [page, setPage] = useState(1);

  const stateOptions = useMemo(
    () => ["all", "neutral", "duda", "bloqueo", "ansiedad", "claridad"],
    []
  );

  async function fetchUsers() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (stateFilter !== "all") {
      params.set("state", stateFilter);
    }
    if (riskOnly) {
      params.set("risk", "1");
    }

    try {
      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });

      if (response.status === 401) {
        router.replace("/admin/login?next=/admin/users");
        return;
      }

      const payload = (await response.json().catch(() => null)) as AdminUsersResponse | null;
      if (!response.ok || !payload) {
        throw new Error("No se pudo cargar el listado de usuarios.");
      }

      setData(payload);
    } catch (fetchError: unknown) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Error cargando listado de usuarios.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } finally {
      router.replace("/admin/login");
    }
  }

  function applyFilters() {
    setPage(1);
    void fetchUsers();
  }

  const users = data?.items || [];

  return (
    <AdminShell
      title="Usuarios y Fichas"
      subtitle="Vista operativa completa de usuarios: estado emocional, actividad, riesgo y contexto para soporte de producto y retencion."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <Card className="border-border/80 bg-card/95 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Explorador de usuarios</CardTitle>
          <CardDescription>
            Filtra por estado, riesgo o búsqueda textual para abrir la ficha completa de cada
            usuario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_0.7fr_0.55fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por email o nombre"
                className="pl-9"
              />
            </div>

            <select
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {stateOptions.map((state) => (
                <option key={state} value={state}>
                  {state === "all" ? "Todos los estados" : state}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 rounded-md border border-input px-3 text-sm">
              <input
                type="checkbox"
                checked={riskOnly}
                onChange={(event) => setRiskOnly(event.target.checked)}
              />
              Solo riesgo
            </label>

            <Button type="button" variant="outline" onClick={applyFilters}>
              Aplicar
            </Button>

            <Button type="button" variant="secondary" onClick={() => void fetchUsers()}>
              <RefreshCw className="size-4" />
              Refrescar
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Card className="border-border/80 bg-muted/40">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Usuarios</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {data?.pagination.total ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-muted/40">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Con riesgo</p>
                <p className="mt-2 text-2xl font-semibold text-amber-700">
                  {
                    users.filter(
                      (user) => user.riskLevel === "high" || user.riskLevel === "critical"
                    ).length
                  }
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-muted/40">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Crisis activa
                </p>
                <p className="mt-2 text-2xl font-semibold text-rose-700">
                  {users.filter((user) => user.crisisActive).length}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-muted/40">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Mensajes (página)
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {users.reduce((acc, user) => acc + user.counts.messages, 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 text-rose-800">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card className="border-border/80 bg-card/95">
          <CardContent className="p-5 text-muted-foreground">Cargando usuarios...</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.length === 0 ? (
            <Card className="border-border/80 bg-card/95">
              <CardContent className="p-5 text-muted-foreground">
                No hay usuarios para el filtro actual.
              </CardContent>
            </Card>
          ) : (
            users.map((user) => (
              <Card key={user.id} className="border-border/80 bg-card/95 shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        {user.name || user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">ID {user.id}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        Rol {user.role}
                      </Badge>
                      <Badge
                        variant={riskVariant(user.riskLevel)}
                        className="rounded-full px-3 py-1"
                      >
                        Riesgo {user.riskLevel}
                      </Badge>
                      {user.crisisActive ? (
                        <Badge variant="danger" className="rounded-full px-3 py-1">
                          <ShieldAlert className="mr-1 size-3.5" />
                          Crisis activa
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        Plan {user.plan}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-6">
                    <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Estado</p>
                      <p className="font-semibold text-foreground capitalize">{user.state}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Perfil</p>
                      <p className="font-semibold text-foreground">
                        {user.profileTitle || "Sin perfil"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Conversaciones</p>
                      <p className="font-semibold text-foreground">{user.counts.conversations}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Mensajes</p>
                      <p className="font-semibold text-foreground">{user.counts.messages}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Check-ins 7d</p>
                      <p className="font-semibold text-foreground">{user.counts.checkins7d}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/35 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Racha</p>
                      <p className="font-semibold text-foreground">{user.streakDays} dias</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-3">
                      <span>Ultima actividad {formatDate(user.lastSeen)}</span>
                      <span>Alta {formatDate(user.createdAt)}</span>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/users/${user.id}`}>
                        Ver ficha
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          <Card className="border-border/80 bg-card/95">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted-foreground">
                Página {data?.pagination.page ?? 1} de{" "}
                {Math.max(data?.pagination.totalPages ?? 1, 1)}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={(data?.pagination.page ?? 1) <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={(data?.pagination.page ?? 1) >= (data?.pagination.totalPages ?? 1)}
                  onClick={() =>
                    setPage((prev) => Math.min(data?.pagination.totalPages ?? prev, prev + 1))
                  }
                >
                  Siguiente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-dashed border-border bg-muted/30">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <UserRound className="mt-0.5 size-4 shrink-0" />
          Esta vista está diseñada para operación SaaS: soporte, retención, riesgo y lectura rápida
          de contexto por usuario sin salir del admin.
        </CardContent>
      </Card>
    </AdminShell>
  );
}
