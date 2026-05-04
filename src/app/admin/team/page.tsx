"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Shield,
  ShieldCheck,
  Pencil,
  Trash2,
  X,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const ROLE_OPTIONS = [
  {
    value: "superadmin",
    label: "Superadmin",
    color: "text-red-400 bg-red-500/15 border-red-500/30",
  },
  {
    value: "admin",
    label: "Admin",
    color: "text-violet-400 bg-violet-500/15 border-violet-500/30",
  },
  {
    value: "clinical",
    label: "Clinical",
    color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  },
  {
    value: "marketing",
    label: "Marketing",
    color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  },
  { value: "support", label: "Support", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  { value: "content", label: "Content", color: "text-pink-400 bg-pink-500/15 border-pink-500/30" },
  { value: "ops", label: "Ops", color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" },
];

function getRoleBadge(role: string) {
  const opt = ROLE_OPTIONS.find((r) => r.value === role);
  const cls = opt?.color ?? "text-zinc-400 bg-zinc-500/15 border-zinc-500/30";
  const label = opt?.label ?? role;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      <Shield className="h-3 w-3" />
      {label}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminTeamPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Create form
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit form
  const [editRole, setEditRole] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team", { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (res.status === 403) {
        setError("No tienes permisos para gestionar el equipo.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setAdmins(data.admins ?? []);
      setError(null);
    } catch {
      setError("Error cargando equipo");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/team", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          password: newPassword,
          role: newRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error === "EMAIL_ALREADY_EXISTS" ? "Email ya existe" : "Error creando usuario"
        );
        return;
      }
      setShowCreate(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("admin");
      fetchAdmins();
    } catch {
      setError("Error de red");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, isActive: editActive }),
      });
      setEditId(null);
      fetchAdmins();
    } catch {
      setError("Error actualizando");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Eliminar a ${name}? Esta accion no se puede deshacer.`)) return;
    try {
      await fetch(`/api/admin/team/${id}`, { method: "DELETE", credentials: "include" });
      fetchAdmins();
    } catch {
      setError("Error eliminando");
    }
  }

  function handleLogout() {
    fetch("/api/admin/logout", { credentials: "include", method: "POST" }).then(() =>
      router.replace("/admin/login")
    );
  }

  return (
    <AdminShell
      title="Equipo Admin"
      subtitle="Gestiona los usuarios internos y sus roles de acceso"
      onLogout={handleLogout}
    >
      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-400" />
          <span className="text-sm text-zinc-400">{admins.length} miembros</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-xl bg-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo miembro
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card-surface rounded-2xl border border-zinc-800 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-400" />
            Crear nuevo admin
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Nombre"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newEmail || !newName || !newPassword}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              {creating ? "Creando..." : "Crear"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : (
        <div className="card-surface rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Ultimo login</th>
                  <th className="px-5 py-3">Creado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-white">{admin.name}</td>
                    <td className="px-5 py-3 text-zinc-400">{admin.email}</td>
                    <td className="px-5 py-3">
                      {editId === admin.id ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        getRoleBadge(admin.role)
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {editId === admin.id ? (
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                            className="rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500/50"
                          />
                          <span className={editActive ? "text-emerald-400" : "text-red-400"}>
                            {editActive ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                      ) : (
                        <span
                          className={`text-xs font-medium ${admin.isActive ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {admin.isActive ? "Activo" : "Inactivo"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">
                      {formatDate(admin.lastLoginAt)}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">
                      {formatDate(admin.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {editId === admin.id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(admin.id)}
                              disabled={saving}
                              className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-700 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditId(admin.id);
                                setEditRole(admin.role);
                                setEditActive(admin.isActive);
                              }}
                              className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(admin.id, admin.name)}
                              className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                      No hay miembros del equipo admin todavia. Crea el primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions legend */}
      <div className="card-surface rounded-2xl border border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Permisos por rol</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs text-zinc-400">
          <div>
            <span className="text-red-400 font-semibold">Superadmin</span> — Acceso total, gestion
            de roles, config global
          </div>
          <div>
            <span className="text-violet-400 font-semibold">Admin</span> — Usuarios, metricas,
            contenido, crisis
          </div>
          <div>
            <span className="text-emerald-400 font-semibold">Clinical</span> — Panel clinico,
            intervenciones, notas
          </div>
          <div>
            <span className="text-amber-400 font-semibold">Marketing</span> — Campanas, CRM, funnel,
            broadcasts
          </div>
          <div>
            <span className="text-blue-400 font-semibold">Support</span> — Usuarios, conversaciones,
            reset password
          </div>
          <div>
            <span className="text-pink-400 font-semibold">Content</span> — Journeys, quizzes,
            recursos
          </div>
          <div>
            <span className="text-cyan-400 font-semibold">Ops</span> — Backups, LLM usage,
            auditoria, sistema
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
