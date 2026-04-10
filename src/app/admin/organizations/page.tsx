"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Plus, Users, Shield, UserPlus, Link2, Trash2,
  ChevronDown, ChevronRight, X, Check, Copy, Eye, EyeOff,
  AlertCircle, Mail,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type OrgSummary = {
  id: string; name: string; slug: string; type: string; plan: string;
  maxUsers: number; isActive: boolean; contactEmail: string | null;
  createdAt: string; adminCount: number; userCount: number;
};

type OrgAdmin = {
  id: string; email: string; name: string; role: string;
  lastLoginAt: string | null; createdAt: string;
};

type OrgUser = {
  id: string; email: string; name: string | null; isActive: boolean;
  lastSeen: string; createdAt: string; messageCount: number;
  state: string; riskLevel: string; crisisActive: boolean;
  streakDays: number; plan: string;
};

type OrgInvite = {
  id: string; code: string; email: string | null; role: string | null;
  maxUses: number; usedCount: number; expiresAt: string | null;
  createdBy: string; createdAt: string;
};

type OrgDetail = OrgSummary & { admins: OrgAdmin[]; users: OrgUser[]; invites: OrgInvite[] };

const TYPE_LABELS: Record<string, string> = { company: "Empresa", clinic: "Clinica", school: "Escuela", training_center: "Centro de formacion" };
const PLAN_LABELS: Record<string, string> = { team: "Team", enterprise: "Enterprise" };

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${color}`}>
      {children}
    </span>
  );
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create org form
  const [showCreate, setShowCreate] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", slug: "", type: "company", plan: "team", maxUsers: 50, contactEmail: "" });
  const [creating, setCreating] = useState(false);

  // Add admin form
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: "", name: "", password: "", role: "hr" });
  const [showAdminPw, setShowAdminPw] = useState(false);

  // Assign user form
  const [showAssignUser, setShowAssignUser] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({ email: "", maxUses: 10, expiresInDays: 30 });
  const [copiedUrl, setCopiedUrl] = useState("");

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizations");
      if (res.status === 401) { router.replace("/admin/login"); return; }
      if (res.status === 403) { setError("Sin permisos para gestionar organizaciones."); return; }
      setOrgs(await res.json());
    } catch { setError("Error cargando organizaciones"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  async function fetchDetail(id: string) {
    setDetailLoading(true);
    try {
      const [orgRes, usersRes, invitesRes] = await Promise.all([
        fetch(`/api/admin/organizations/${id}`),
        fetch(`/api/admin/organizations/${id}/users`),
        fetch(`/api/admin/organizations/${id}/invites`),
      ]);
      const orgData = await orgRes.json();
      const usersData = await usersRes.json();
      const invitesData = await invitesRes.json();
      setDetail({ ...orgData, users: usersData.users ?? orgData.users, invites: invitesData.invites ?? [] });
    } catch { setError("Error cargando detalles"); }
    finally { setDetailLoading(false); }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); setDetail(null); }
    else { setExpandedId(id); fetchDetail(id); }
    setShowAddAdmin(false); setShowAssignUser(false); setShowInvite(false);
  }

  async function handleCreateOrg() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newOrg, contactEmail: newOrg.contactEmail || null }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.message || "Error creando org"); return; }
      setShowCreate(false); setNewOrg({ name: "", slug: "", type: "company", plan: "team", maxUsers: 50, contactEmail: "" });
      fetchOrgs();
    } catch { setError("Error de red"); }
    finally { setCreating(false); }
  }

  async function handleToggleActive(org: OrgSummary) {
    await fetch(`/api/admin/organizations/${org.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !org.isActive }),
    });
    fetchOrgs();
  }

  async function handleAddAdmin() {
    if (!expandedId) return;
    const res = await fetch(`/api/admin/organizations/${expandedId}/admins`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAdmin),
    });
    if (!res.ok) { const d = await res.json(); setError(d.message || "Error"); return; }
    setShowAddAdmin(false); setNewAdmin({ email: "", name: "", password: "", role: "hr" });
    fetchDetail(expandedId);
  }

  async function handleRemoveAdmin(adminId: string) {
    if (!expandedId || !confirm("Eliminar este admin?")) return;
    await fetch(`/api/admin/organizations/${expandedId}/admins`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId }),
    });
    fetchDetail(expandedId);
  }

  async function handleAssignUser() {
    if (!expandedId) return;
    const res = await fetch(`/api/admin/organizations/${expandedId}/users`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: assignEmail }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.message || d.error || "Error"); return; }
    setShowAssignUser(false); setAssignEmail("");
    fetchDetail(expandedId);
  }

  async function handleUnassignUser(userId: string) {
    if (!expandedId || !confirm("Desasignar usuario de esta organizacion?")) return;
    await fetch(`/api/admin/organizations/${expandedId}/users`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    fetchDetail(expandedId);
  }

  async function handleCreateInvite() {
    if (!expandedId) return;
    const res = await fetch(`/api/admin/organizations/${expandedId}/invites`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteData),
    });
    if (!res.ok) { setError("Error creando invitacion"); return; }
    const data = await res.json();
    setCopiedUrl(data.inviteUrl);
    navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
    setInviteData({ email: "", maxUses: 10, expiresInDays: 30 });
    fetchDetail(expandedId);
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!expandedId) return;
    await fetch(`/api/admin/organizations/${expandedId}/invites`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    fetchDetail(expandedId);
  }

  function handleLogout() {
    fetch("/api/admin/logout", { method: "POST" }).then(() => router.replace("/admin/login"));
  }

  const inputCls = "rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none";
  const btnPrimary = "flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition-colors";
  const btnSecondary = "flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors border border-zinc-700";

  return (
    <AdminShell title="Organizaciones B2B" subtitle="Gestiona empresas, clinicas y escuelas — admins, usuarios, invitaciones y limites" onLogout={handleLogout}>
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-violet-400" />
          <span className="text-sm text-zinc-400">{orgs.length} organizaciones</span>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Nueva organizacion
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card-surface rounded-2xl border border-zinc-800 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-violet-400" /> Crear organizacion
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input placeholder="Nombre" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} className={inputCls} />
            <input placeholder="Slug (url-friendly)" value={newOrg.slug} onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className={inputCls} />
            <select value={newOrg.type} onChange={(e) => setNewOrg({ ...newOrg, type: e.target.value })} className={inputCls}>
              <option value="company">Empresa</option>
              <option value="clinic">Clinica</option>
              <option value="school">Escuela</option>
              <option value="training_center">Centro de formacion</option>
            </select>
            <select value={newOrg.plan} onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })} className={inputCls}>
              <option value="team">Team</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <input type="number" placeholder="Max usuarios" value={newOrg.maxUsers} onChange={(e) => setNewOrg({ ...newOrg, maxUsers: parseInt(e.target.value) || 50 })} className={inputCls} />
            <input type="email" placeholder="Email contacto" value={newOrg.contactEmail} onChange={(e) => setNewOrg({ ...newOrg, contactEmail: e.target.value })} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)} className="text-sm text-zinc-400 hover:text-zinc-200">Cancelar</button>
            <button onClick={handleCreateOrg} disabled={creating || !newOrg.name || !newOrg.slug} className={btnPrimary}>
              <Check className="h-4 w-4" /> {creating ? "Creando..." : "Crear"}
            </button>
          </div>
        </div>
      )}

      {/* Org list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="card-surface rounded-2xl border border-zinc-800 overflow-hidden">
              {/* Org header row */}
              <button onClick={() => toggleExpand(org.id)} className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  {expandedId === org.id ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{org.name}</span>
                      <Badge color={org.isActive ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" : "text-red-400 bg-red-500/15 border-red-500/30"}>
                        {org.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                      <Badge color="text-zinc-400 bg-zinc-500/15 border-zinc-500/30">{TYPE_LABELS[org.type] || org.type}</Badge>
                      <Badge color="text-violet-400 bg-violet-500/15 border-violet-500/30">{PLAN_LABELS[org.plan] || org.plan}</Badge>
                    </div>
                    <span className="text-xs text-zinc-500">/{org.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{org.userCount}/{org.maxUsers}</span>
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" />{org.adminCount} admins</span>
                  <span>{formatDate(org.createdAt)}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {expandedId === org.id && (
                <div className="border-t border-zinc-800 p-4 space-y-4">
                  {detailLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                    </div>
                  ) : detail ? (
                    <>
                      {/* Actions bar */}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleToggleActive(org)} className={btnSecondary}>
                          {org.isActive ? "Desactivar" : "Activar"}
                        </button>
                        <button onClick={() => { setShowAddAdmin(!showAddAdmin); setShowAssignUser(false); setShowInvite(false); }} className={btnSecondary}>
                          <Shield className="h-3.5 w-3.5" /> Nuevo admin
                        </button>
                        <button onClick={() => { setShowAssignUser(!showAssignUser); setShowAddAdmin(false); setShowInvite(false); }} className={btnSecondary}>
                          <UserPlus className="h-3.5 w-3.5" /> Asignar usuario
                        </button>
                        <button onClick={() => { setShowInvite(!showInvite); setShowAddAdmin(false); setShowAssignUser(false); }} className={btnSecondary}>
                          <Link2 className="h-3.5 w-3.5" /> Crear invitacion
                        </button>
                      </div>

                      {/* Add admin form */}
                      {showAddAdmin && (
                        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 space-y-3">
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nuevo admin de organizacion</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input placeholder="Nombre" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} className={inputCls} />
                            <input type="email" placeholder="Email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className={inputCls} />
                            <div className="relative">
                              <input type={showAdminPw ? "text" : "password"} placeholder="Contrasena" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} className={`${inputCls} w-full pr-10`} />
                              <button type="button" onClick={() => setShowAdminPw(!showAdminPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                                {showAdminPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            <select value={newAdmin.role} onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })} className={inputCls}>
                              <option value="hr">HR</option>
                              <option value="therapist">Terapeuta</option>
                              <option value="admin">Admin org</option>
                              <option value="teacher">Profesor</option>
                            </select>
                          </div>
                          <button onClick={handleAddAdmin} disabled={!newAdmin.email || !newAdmin.name || !newAdmin.password} className={btnPrimary}>
                            <Check className="h-4 w-4" /> Crear admin
                          </button>
                        </div>
                      )}

                      {/* Assign user form */}
                      {showAssignUser && (
                        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 space-y-3">
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Asignar usuario existente</p>
                          <div className="flex gap-3">
                            <input type="email" placeholder="Email del usuario" value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} className={`${inputCls} flex-1`} />
                            <button onClick={handleAssignUser} disabled={!assignEmail} className={btnPrimary}>
                              <UserPlus className="h-4 w-4" /> Asignar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Invite form */}
                      {showInvite && (
                        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 space-y-3">
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Crear enlace de invitacion</p>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <input type="email" placeholder="Email (opcional — limitar a uno)" value={inviteData.email} onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })} className={inputCls} />
                            <input type="number" placeholder="Max usos" value={inviteData.maxUses} onChange={(e) => setInviteData({ ...inviteData, maxUses: parseInt(e.target.value) || 1 })} className={inputCls} />
                            <input type="number" placeholder="Dias de validez" value={inviteData.expiresInDays} onChange={(e) => setInviteData({ ...inviteData, expiresInDays: parseInt(e.target.value) || 30 })} className={inputCls} />
                          </div>
                          <button onClick={handleCreateInvite} className={btnPrimary}>
                            <Link2 className="h-4 w-4" /> Generar enlace
                          </button>
                          {copiedUrl && (
                            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300">
                              <Copy className="h-3.5 w-3.5" /> Copiado: <code className="text-emerald-200">{copiedUrl}</code>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admins table */}
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5" /> Admins ({detail.admins.length})
                        </h4>
                        {detail.admins.length > 0 ? (
                          <div className="overflow-x-auto rounded-lg border border-zinc-800">
                            <table className="w-full text-xs">
                              <thead><tr className="border-b border-zinc-800 text-zinc-500">
                                <th className="px-3 py-2 text-left">Nombre</th><th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-left">Rol</th><th className="px-3 py-2 text-left">Ultimo login</th><th className="px-3 py-2"></th>
                              </tr></thead>
                              <tbody className="divide-y divide-zinc-800/50">
                                {detail.admins.map((a) => (
                                  <tr key={a.id} className="hover:bg-zinc-900/50">
                                    <td className="px-3 py-2 text-white">{a.name}</td>
                                    <td className="px-3 py-2 text-zinc-400">{a.email}</td>
                                    <td className="px-3 py-2"><Badge color="text-violet-400 bg-violet-500/15 border-violet-500/30">{a.role}</Badge></td>
                                    <td className="px-3 py-2 text-zinc-500">{formatDate(a.lastLoginAt)}</td>
                                    <td className="px-3 py-2 text-right">
                                      <button onClick={() => handleRemoveAdmin(a.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <p className="text-xs text-zinc-600">Sin admins todavia.</p>}
                      </div>

                      {/* Users table */}
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Usuarios ({detail.users?.length ?? 0}/{detail.maxUsers})
                        </h4>
                        {detail.users?.length > 0 ? (
                          <div className="overflow-x-auto rounded-lg border border-zinc-800">
                            <table className="w-full text-xs">
                              <thead><tr className="border-b border-zinc-800 text-zinc-500">
                                <th className="px-3 py-2 text-left">Nombre</th><th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-left">Estado</th><th className="px-3 py-2 text-left">Racha</th>
                                <th className="px-3 py-2 text-left">Plan</th><th className="px-3 py-2 text-left">Ultimo visto</th><th className="px-3 py-2"></th>
                              </tr></thead>
                              <tbody className="divide-y divide-zinc-800/50">
                                {detail.users.map((u) => (
                                  <tr key={u.id} className="hover:bg-zinc-900/50">
                                    <td className="px-3 py-2 text-white">{u.name || "—"}</td>
                                    <td className="px-3 py-2 text-zinc-400">{u.email}</td>
                                    <td className="px-3 py-2">
                                      <Badge color={u.crisisActive ? "text-red-400 bg-red-500/15 border-red-500/30" : "text-zinc-400 bg-zinc-500/15 border-zinc-500/30"}>
                                        {u.crisisActive ? "CRISIS" : u.state}
                                      </Badge>
                                    </td>
                                    <td className="px-3 py-2 text-zinc-400">{u.streakDays}d</td>
                                    <td className="px-3 py-2"><Badge color="text-violet-400 bg-violet-500/15 border-violet-500/30">{u.plan}</Badge></td>
                                    <td className="px-3 py-2 text-zinc-500">{formatDate(u.lastSeen)}</td>
                                    <td className="px-3 py-2 text-right">
                                      <button onClick={() => handleUnassignUser(u.id)} className="text-zinc-500 hover:text-red-400" title="Desasignar"><X className="h-3.5 w-3.5" /></button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <p className="text-xs text-zinc-600">Sin usuarios asignados.</p>}
                      </div>

                      {/* Invites table */}
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Link2 className="h-3.5 w-3.5" /> Invitaciones ({detail.invites?.length ?? 0})
                        </h4>
                        {detail.invites?.length > 0 ? (
                          <div className="overflow-x-auto rounded-lg border border-zinc-800">
                            <table className="w-full text-xs">
                              <thead><tr className="border-b border-zinc-800 text-zinc-500">
                                <th className="px-3 py-2 text-left">Codigo</th><th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-left">Usos</th><th className="px-3 py-2 text-left">Expira</th><th className="px-3 py-2"></th>
                              </tr></thead>
                              <tbody className="divide-y divide-zinc-800/50">
                                {detail.invites.map((inv) => {
                                  const expired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
                                  const full = inv.usedCount >= inv.maxUses;
                                  return (
                                    <tr key={inv.id} className={`hover:bg-zinc-900/50 ${expired || full ? "opacity-50" : ""}`}>
                                      <td className="px-3 py-2 text-zinc-300 font-mono">{inv.code.slice(0, 12)}...</td>
                                      <td className="px-3 py-2 text-zinc-400">{inv.email || <Mail className="h-3 w-3 text-zinc-600" />}</td>
                                      <td className="px-3 py-2 text-zinc-400">{inv.usedCount}/{inv.maxUses}</td>
                                      <td className="px-3 py-2 text-zinc-500">{formatDate(inv.expiresAt)}</td>
                                      <td className="px-3 py-2 text-right">
                                        <button onClick={() => handleRevokeInvite(inv.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : <p className="text-xs text-zinc-600">Sin invitaciones activas.</p>}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ))}

          {orgs.length === 0 && !loading && (
            <div className="card-surface rounded-2xl border border-zinc-800 p-12 text-center text-zinc-500">
              Sin organizaciones todavia. Crea la primera.
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
