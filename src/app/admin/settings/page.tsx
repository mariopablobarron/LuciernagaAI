"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import NotificationSettings from "@/components/admin/NotificationSettings";

// ── Types ───────────────────────────────────────────────────────────────────

type SystemHealth = {
  database: "ok" | "down";
  email: boolean;
  telegram: boolean;
  sentry: boolean;
};

type QuickStats = {
  totalUsers: number;
  activeUsers: number;
  proUsers: number;
  organizationCount: number;
  totalMessages: number;
};

type SettingsData = {
  adminUsername: string;
  system: SystemHealth;
  stats: QuickStats;
};

type OrgListItem = {
  id: string;
  name: string;
  slug: string;
  type: string;
  plan: string;
  maxUsers: number;
  isActive: boolean;
  contactEmail: string | null;
  createdAt: string;
  adminCount: number;
  userCount: number;
};

type OrgAdmin = {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
};

type OrgDetail = OrgListItem & {
  contactName: string | null;
  updatedAt: string;
  admins: OrgAdmin[];
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    isActive: boolean;
    lastSeen: string;
    createdAt: string;
  }>;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`}
    />
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const router = useRouter();

  // System data
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Organizations
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Create org form
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: "",
    slug: "",
    type: "company",
    plan: "team",
    maxUsers: 50,
    contactName: "",
    contactEmail: "",
  });
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Expanded org detail
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit org
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    type: "",
    plan: "",
    maxUsers: 0,
    contactName: "",
    contactEmail: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Add admin form
  const [showAddAdmin, setShowAddAdmin] = useState<string | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    name: "",
    role: "hr",
    password: "",
  });
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [showSettingsPw, setShowSettingsPw] = useState(false);

  // General
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────

  const loadSettings = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include", signal });
      if (res.status === 401) {
        router.replace("/admin/login?next=/admin/settings");
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as SettingsData;
      setSettings(data);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[admin/settings] failed to load settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  }, [router]);

  const loadOrgs = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/admin/organizations", { credentials: "include", signal });
      if (res.status === 401) return;
      if (!res.ok) return;
      const data = (await res.json()) as OrgListItem[];
      if (Array.isArray(data)) setOrgs(data);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[admin/settings] failed to load orgs:", err);
    } finally {
      setLoadingOrgs(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSettings(controller.signal);
    loadOrgs(controller.signal);
    return () => controller.abort();
  }, [loadSettings, loadOrgs]);

  // ── Org detail expand ─────────────────────────────────────────────────

  async function handleExpandOrg(orgId: string) {
    if (expandedOrgId === orgId) {
      setExpandedOrgId(null);
      setOrgDetail(null);
      return;
    }

    setExpandedOrgId(orgId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`);
      if (res.ok) {
        const data = (await res.json()) as OrgDetail;
        setOrgDetail(data);
      }
    } catch (err) {
      console.error("[admin/settings] failed to load org detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  }

  // ── Create org ────────────────────────────────────────────────────────

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setCreatingOrg(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/organizations", { credentials: "include",         method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrg),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? "Error al crear organizacion.");
        return;
      }
      setNewOrg({
        name: "",
        slug: "",
        type: "company",
        plan: "team",
        maxUsers: 50,
        contactName: "",
        contactEmail: "",
      });
      setShowCreateOrg(false);
      await loadOrgs();
    } catch {
      setError("Error de red al crear organizacion.");
    } finally {
      setCreatingOrg(false);
    }
  }

  // ── Edit org ──────────────────────────────────────────────────────────

  function startEdit(org: OrgListItem) {
    setEditingOrgId(org.id);
    setEditForm({
      name: org.name,
      slug: org.slug,
      type: org.type,
      plan: org.plan,
      maxUsers: org.maxUsers,
      contactName: "",
      contactEmail: org.contactEmail ?? "",
    });
  }

  async function handleSaveEdit(orgId: string) {
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? "Error al actualizar organizacion.");
        return;
      }
      setEditingOrgId(null);
      await loadOrgs();
      if (expandedOrgId === orgId) {
        await handleExpandOrg(orgId);
      }
    } catch {
      setError("Error de red al actualizar organizacion.");
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Deactivate org ────────────────────────────────────────────────────

  async function handleDeactivateOrg(orgId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? "Error al desactivar organizacion.");
        return;
      }
      await loadOrgs();
    } catch {
      setError("Error de red al desactivar organizacion.");
    }
  }

  // ── Reactivate org ────────────────────────────────────────────────────

  async function handleReactivateOrg(orgId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? "Error al reactivar organizacion.");
        return;
      }
      await loadOrgs();
    } catch {
      setError("Error de red al reactivar organizacion.");
    }
  }

  // ── Add org admin ─────────────────────────────────────────────────────

  async function handleAddAdmin(orgId: string, e: React.FormEvent) {
    e.preventDefault();
    setAddingAdmin(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? "Error al crear admin.");
        return;
      }
      setNewAdmin({ email: "", name: "", role: "hr", password: "" });
      setShowAddAdmin(null);
      // Refresh detail
      if (expandedOrgId === orgId) {
        await handleExpandOrg(orgId);
      }
      await loadOrgs();
    } catch {
      setError("Error de red al crear admin.");
    } finally {
      setAddingAdmin(false);
    }
  }

  // ── Remove org admin ──────────────────────────────────────────────────

  async function handleRemoveAdmin(orgId: string, adminId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/admins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? "Error al eliminar admin.");
        return;
      }
      if (expandedOrgId === orgId) {
        await handleExpandOrg(orgId);
      }
      await loadOrgs();
    } catch {
      setError("Error de red al eliminar admin.");
    }
  }

  // ── Refresh all ───────────────────────────────────────────────────────

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([loadSettings(), loadOrgs()]);
    } finally {
      setRefreshing(false);
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (loadingSettings && loadingOrgs) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/95 p-6 text-zinc-500">
          Cargando configuracion...
        </div>
      </main>
    );
  }

  return (
    <AdminShell
      title="Configuración del sistema"
      subtitle="Estado del sistema, estadisticas rapidas y gestion de organizaciones B2B."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando..." : "Actualizar datos"}
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
          {[
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/users", label: "Usuarios" },
            { href: "/admin/marketing", label: "Marketing" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 text-xs text-red-400 underline hover:text-red-300"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Section 1: Admin Info + System Health */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AdminPanel
          title="Informacion del administrador"
          description="Credenciales y estado de sesion."
        >
          <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-violet-400" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Usuario admin
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {settings?.adminUsername ?? "---"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Las credenciales de admin se configuran via variables de entorno
              (ADMIN_USERNAME / ADMIN_PASSWORD). No se pueden cambiar desde esta interfaz.
            </p>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Estado del sistema"
          description="Conectividad de servicios externos."
          tooltip="Indica si cada servicio externo tiene su variable de entorno configurada y, en el caso de la base de datos, si responde a queries."
        >
          <div className="space-y-3">
            {[
              {
                label: "Base de datos",
                ok: settings?.system?.database === "ok",
                detail: settings?.system?.database === "ok" ? "Conectada" : "Sin conexion",
                icon: <Database className="h-4 w-4" />,
              },
              {
                label: "Email (Resend)",
                ok: settings?.system?.email ?? false,
                detail: settings?.system?.email ? "RESEND_API_KEY configurada" : "No configurada",
                icon: <Mail className="h-4 w-4" />,
              },
              {
                label: "Telegram Bot",
                ok: settings?.system?.telegram ?? false,
                detail: settings?.system?.telegram
                  ? "TELEGRAM_BOT_TOKEN configurado"
                  : "No configurado",
                icon: <Send className="h-4 w-4" />,
              },
              {
                label: "Sentry",
                ok: settings?.system?.sentry ?? false,
                detail: settings?.system?.sentry ? "DSN configurado" : "No configurado",
                icon: <Activity className="h-4 w-4" />,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">{item.icon}</span>
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={item.ok} />
                  <span
                    className={`text-xs font-semibold ${item.ok ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {item.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>

      {/* Section 2: Quick Stats */}
      <AdminPanel
        title="Estadisticas rapidas"
        description="Resumen global de la plataforma."
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <AdminMetricCard
            label="Total usuarios"
            value={settings?.stats?.totalUsers ?? 0}
            icon={<Users className="h-5 w-5" />}
          />
          <AdminMetricCard
            label="Activos (7d)"
            value={settings?.stats?.activeUsers ?? 0}
            accent="emerald"
            icon={<User className="h-5 w-5" />}
            hint="Usuarios vistos en los ultimos 7 dias"
          />
          <AdminMetricCard
            label="Pro"
            value={settings?.stats?.proUsers ?? 0}
            accent="violet"
            hint="Suscripciones pro activas"
          />
          <AdminMetricCard
            label="Organizaciones"
            value={settings?.stats?.organizationCount ?? 0}
            accent="sky"
            icon={<Building2 className="h-5 w-5" />}
          />
          <AdminMetricCard
            label="Total mensajes"
            value={settings?.stats?.totalMessages ?? 0}
            accent="amber"
            icon={<MessageSquare className="h-5 w-5" />}
          />
        </div>
      </AdminPanel>

      {/* Section 3: Organization Management */}
      <AdminPanel
        title="Gestion de organizaciones"
        description="Crear, editar y administrar organizaciones B2B y sus administradores."
        tooltip="Las organizaciones agrupan usuarios. Cada organizacion puede tener multiples admins (HR, therapist, admin) que acceden al panel de la organizacion."
        headerRight={
          <button
            type="button"
            onClick={() => setShowCreateOrg(!showCreateOrg)}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/25 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear organizacion
          </button>
        }
      >
        {/* Create form */}
        {showCreateOrg && (
          <form
            onSubmit={handleCreateOrg}
            className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-4"
          >
            <p className="text-sm font-semibold text-white">Nueva organizacion</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={newOrg.name}
                  onChange={(e) => {
                    setNewOrg({
                      ...newOrg,
                      name: e.target.value,
                      slug: slugify(e.target.value),
                    });
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  required
                  value={newOrg.slug}
                  onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                  placeholder="acme-corp"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Tipo
                </label>
                <select
                  value={newOrg.type}
                  onChange={(e) => setNewOrg({ ...newOrg, type: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="company">Empresa</option>
                  <option value="clinic">Clinica</option>
                  <option value="school">Centro educativo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Plan
                </label>
                <select
                  value={newOrg.plan}
                  onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="team">Team</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Max usuarios
                </label>
                <input
                  type="number"
                  min={1}
                  value={newOrg.maxUsers}
                  onChange={(e) =>
                    setNewOrg({ ...newOrg, maxUsers: parseInt(e.target.value, 10) || 50 })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Email de contacto
                </label>
                <input
                  type="email"
                  value={newOrg.contactEmail}
                  onChange={(e) => setNewOrg({ ...newOrg, contactEmail: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                  placeholder="contacto@acme.com"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={creatingOrg}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {creatingOrg ? "Creando..." : "Crear organizacion"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateOrg(false)}
                className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Org list */}
        {loadingOrgs ? (
          <p className="text-sm text-zinc-500">Cargando organizaciones...</p>
        ) : orgs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4 text-sm text-zinc-500">
            No hay organizaciones creadas todavia.
          </div>
        ) : (
          <div className="space-y-3">
            {orgs.map((org) => (
              <div key={org.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50">
                {/* Org row */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => handleExpandOrg(org.id)}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {expandedOrgId === org.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{org.name}</span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-500">
                        {org.slug}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          org.isActive
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {org.isActive ? "Activa" : "Inactiva"}
                      </span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                        {org.type}
                      </span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                        {org.plan}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>{org.adminCount} admins</span>
                      <span>{org.userCount} / {org.maxUsers} usuarios</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingOrgId !== org.id && (
                      <button
                        type="button"
                        onClick={() => startEdit(org)}
                        className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {org.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivateOrg(org.id)}
                        className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Desactivar"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReactivateOrg(org.id)}
                        className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-400 hover:text-emerald-400 transition-colors"
                        title="Reactivar"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit form (inline) */}
                {editingOrgId === org.id && (
                  <div className="border-t border-zinc-800 p-4 space-y-3">
                    <p className="text-xs font-semibold text-zinc-400">Editar organizacion</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                        placeholder="Nombre"
                      />
                      <input
                        type="text"
                        value={editForm.slug}
                        onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                        placeholder="Slug"
                      />
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                      >
                        <option value="company">Empresa</option>
                        <option value="clinic">Clinica</option>
                        <option value="school">Centro educativo</option>
                      </select>
                      <select
                        value={editForm.plan}
                        onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                      >
                        <option value="team">Team</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={editForm.maxUsers}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            maxUsers: parseInt(e.target.value, 10) || 50,
                          })
                        }
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                        placeholder="Max usuarios"
                      />
                      <input
                        type="email"
                        value={editForm.contactEmail}
                        onChange={(e) =>
                          setEditForm({ ...editForm, contactEmail: e.target.value })
                        }
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                        placeholder="Email contacto"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(org.id)}
                        disabled={savingEdit}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
                      >
                        {savingEdit ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingOrgId(null)}
                        className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded detail */}
                {expandedOrgId === org.id && (
                  <div className="border-t border-zinc-800 p-4 space-y-4">
                    {loadingDetail ? (
                      <p className="text-sm text-zinc-500">Cargando detalles...</p>
                    ) : orgDetail ? (
                      <>
                        {/* Admins section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                              Administradores ({orgDetail.admins.length})
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setShowAddAdmin(
                                  showAddAdmin === org.id ? null : org.id,
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                              Agregar admin
                            </button>
                          </div>

                          {showAddAdmin === org.id && (
                            <form
                              onSubmit={(e) => handleAddAdmin(org.id, e)}
                              className="mb-3 rounded-lg border border-zinc-700 bg-zinc-800/30 p-3 space-y-3"
                            >
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <input
                                  type="text"
                                  required
                                  value={newAdmin.name}
                                  onChange={(e) =>
                                    setNewAdmin({ ...newAdmin, name: e.target.value })
                                  }
                                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                                  placeholder="Nombre"
                                />
                                <input
                                  type="email"
                                  required
                                  value={newAdmin.email}
                                  onChange={(e) =>
                                    setNewAdmin({ ...newAdmin, email: e.target.value })
                                  }
                                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                                  placeholder="email@ejemplo.com"
                                />
                                <select
                                  value={newAdmin.role}
                                  onChange={(e) =>
                                    setNewAdmin({ ...newAdmin, role: e.target.value })
                                  }
                                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                                >
                                  <option value="hr">HR</option>
                                  <option value="therapist">Terapeuta</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <div className="relative">
                                  <input
                                    type={showSettingsPw ? "text" : "password"}
                                    required
                                    minLength={8}
                                    value={newAdmin.password}
                                    onChange={(e) =>
                                      setNewAdmin({ ...newAdmin, password: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 pr-10 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                                    placeholder="Contraseña (mín 8 chars)"
                                  />
                                  <button type="button" onClick={() => setShowSettingsPw(!showSettingsPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                                    {showSettingsPw ? "🙈" : "👁️"}
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="submit"
                                  disabled={addingAdmin}
                                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
                                >
                                  {addingAdmin ? "Creando..." : "Crear admin"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowAddAdmin(null)}
                                  className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          )}

                          {orgDetail.admins.length === 0 ? (
                            <p className="text-xs text-zinc-500">
                              Sin administradores. Agrega uno con el boton de arriba.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {orgDetail.admins.map((admin) => (
                                <div
                                  key={admin.id}
                                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/30 px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-white">
                                        {admin.name}
                                      </span>
                                      <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                                        {admin.role}
                                      </span>
                                    </div>
                                    <p className="text-xs text-zinc-500">{admin.email}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAdmin(org.id, admin.id)}
                                    className="rounded-lg p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                                    title="Eliminar admin"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Users summary */}
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Usuarios ({orgDetail.userCount})
                          </p>
                          {orgDetail.users.length === 0 ? (
                            <p className="text-xs text-zinc-500">Sin usuarios asignados.</p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-800">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-zinc-800 bg-zinc-800/30">
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                      Email
                                    </th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                      Nombre
                                    </th>
                                    <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                      Activo
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orgDetail.users.map((user) => (
                                    <tr
                                      key={user.id}
                                      className="border-b border-zinc-800 last:border-b-0"
                                    >
                                      <td className="px-3 py-2 text-xs text-zinc-400">
                                        {user.email}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-white">
                                        {user.name ?? "---"}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <StatusDot ok={user.isActive} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-zinc-500">Error cargando detalles.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
      <NotificationSettings />
    </AdminShell>
  );
}
