"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Plus, Trash2, Check, X, Eye, EyeOff } from "lucide-react";
import { OrgShell } from "@/components/org/OrgShell";

type OrgAdmin = {
  id: string; email: string; name: string; role: string;
  lastLoginAt: string | null; createdAt: string;
};

function getOrgToken() {
  return typeof window !== "undefined" ? sessionStorage.getItem("org_token") : null;
}

function formatDate(iso: string | null) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OrgTeamPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<OrgAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: "", name: "", password: "", role: "hr" });
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);

  async function fetchTeam() {
    setLoading(true);
    const token = getOrgToken();
    if (!token) { router.replace("/org/login"); return; }
    try {
      const res = await fetch("/api/org/team", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace("/org/login"); return; }
      if (res.status === 403) { setError("Solo el rol admin puede gestionar el equipo."); setLoading(false); return; }
      const data = await res.json();
      setAdmins(data.admins ?? []);
    } catch { setError("Error cargando equipo"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchTeam(); }, []);

  async function handleCreate() {
    setCreating(true);
    const token = getOrgToken();
    try {
      const res = await fetch("/api/org/team", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newAdmin),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
      setShowCreate(false); setNewAdmin({ email: "", name: "", password: "", role: "hr" });
      fetchTeam();
    } catch { setError("Error de red"); }
    finally { setCreating(false); }
  }

  async function handleDelete(adminId: string, name: string) {
    if (!confirm(`Eliminar a ${name}?`)) return;
    const token = getOrgToken();
    try {
      const res = await fetch("/api/org/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adminId }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return; }
      fetchTeam();
    } catch { setError("Error de red"); }
  }

  const inputCls = "rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none";

  return (
    <OrgShell title="Equipo" subtitle="Gestiona los administradores de tu organizacion">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{admins.length} miembros</span>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 rounded-xl bg-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors">
          <Plus className="h-4 w-4" /> Nuevo miembro
        </button>
      </div>

      {showCreate && (
        <div className="card-surface rounded-2xl border border-zinc-800 p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Nombre" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} className={inputCls} />
            <input type="email" placeholder="Email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className={inputCls} />
            <div className="relative">
              <input type={showPw ? "text" : "password"} placeholder="Contrasena (min 8)" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} className={`${inputCls} w-full pr-10`} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <select value={newAdmin.role} onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })} className={inputCls}>
              <option value="hr">HR</option>
              <option value="therapist">Terapeuta</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)} className="text-sm text-zinc-400">Cancelar</button>
            <button onClick={handleCreate} disabled={creating || !newAdmin.email || !newAdmin.name || newAdmin.password.length < 8} className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition-colors">
              <Check className="h-4 w-4" /> {creating ? "Creando..." : "Crear"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : (
        <div className="card-surface rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Ultimo login</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-white">{admin.name}</td>
                  <td className="px-5 py-3 text-zinc-400">{admin.email}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300">
                      <Shield className="h-3 w-3" /> {admin.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">{formatDate(admin.lastLoginAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleDelete(admin.id, admin.name)} className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-zinc-500">Sin miembros todavia.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </OrgShell>
  );
}
