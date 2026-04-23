"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Brain, Check, ChevronDown, ClipboardList, Clock, Download, Mail, MessageSquareText, NotebookPen, Pencil, Power, RefreshCw, Shield, ShieldAlert, Tag, Target, Trash2, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { AdminShell } from "@/features/admin/components/AdminShell";
import UserUsageSection from "@/components/admin/UserUsageSection";
import UserAdminMessages from "@/components/admin/UserAdminMessages";

// ─── Psychologist panel types ──────────────────────────────────────────────────

type ClinicalNote = { id: string; content: string; tags: string[]; createdAt: string };
type AssessmentItem = {
  id: string; type: string; title: string; status: string; createdAt: string;
  response: { totalScore: number; severity: string; completedAt: string } | null;
};
type TimelineEntry = { date: string; emotionalState: string; mood: string | null; momentum: number | null; hasCheckin: boolean };
type CrisisMarker = { date: string; level: string };

const SEVERITY_LABELS: Record<string, string> = {
  minimal: "Mínimo", mild: "Leve", moderate: "Moderado",
  moderately_severe: "Mod. severo", severe: "Severo",
};
const SEVERITY_COLORS: Record<string, string> = {
  minimal: "text-emerald-400", mild: "text-yellow-400",
  moderate: "text-orange-400", moderately_severe: "text-orange-500", severe: "text-red-500",
};
const STATE_COLORS: Record<string, string> = {
  activo: "bg-emerald-500", bloqueado: "bg-red-500", ansioso: "bg-amber-500",
  desmotivado: "bg-purple-500", perdido: "bg-blue-400", neutral: "bg-zinc-500", unknown: "bg-zinc-700",
};

type UserDetailResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
    lastSeen: string;
    counts: {
      conversations: number;
      messages: number;
      goals: number;
      userChallenges: number;
      dailyLogs: number;
    };
  };
  state: null | {
    state: string;
    transformationPhase: string;
    primaryEmotion: string;
    dominantPattern: string;
    focusArea: string;
    energyLevel: string;
    riskLevel: string;
    progressTrend: string;
    crisisActive: boolean;
    crisisActivatedAt: string | null;
    crisisActiveUntil: string | null;
    updatedAt: string;
  };
  profile: null | {
    code: string;
    type: string;
    title: string;
    description: string;
    operationalFocus: string;
    scores: {
      claridad: number;
      autoestima: number;
      energia: number;
      disciplina: number;
      social: number;
      total: number;
    };
    updatedAt: string;
  };
  streak: null | {
    currentDays: number;
    bestDays: number;
    status: string;
    lastCheckInDate: string | null;
    updatedAt: string;
  };
  subscription: null | {
    plan: string;
    status: string;
    createdAt: string;
  };
  activity7d: {
    checkins: number;
    crisisEvents: number;
    avoidanceEvents: number;
  };
  conversations: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
  }>;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
    conversationId: string;
  }>;
  activeGoals: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    totalActions: number;
    completedActions: number;
    actions: Array<{
      id: string;
      description: string;
      completed: boolean;
    }>;
  }>;
  crisisEvents: Array<{
    id: string;
    level: string;
    message: string;
    response: string;
    createdAt: string;
  }>;
  avoidanceEvents: Array<{
    id: string;
    type: string;
    createdAt: string;
    action: {
      id: string;
      description: string;
      goalId: string | null;
      goalTitle: string | null;
    };
  }>;
  challenges: Array<{
    id: string;
    status: string;
    progress: number;
    totalDays: number;
    completedDays: number;
    startedAt: string;
    endsAt: string | null;
    challenge: {
      id: string;
      title: string;
      type: string;
      difficulty: number;
    };
  }>;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tags, audit, GDPR state
  const [userTags, setUserTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<Array<{ tag: string; count: number }>>([]);
  const [tagsSaving, setTagsSaving] = useState(false);
  const [auditEntries, setAuditEntries] = useState<
    Array<{ id: string; actorId: string; actorType: string; action: string; metadata: unknown; createdAt: string }>
  >([]);
  const [gdprBusy, setGdprBusy] = useState<null | "anonymize">(null);

  // Psychologist panel state
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [crisisMarkers, setCrisisMarkers] = useState<CrisisMarker[]>([]);
  const userId = useRef<string | null>(null);

  // ── Admin action state ──────────────────────────────────────────────────────
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ section: string; type: "success" | "error"; message: string } | null>(null);

  // Edit user info
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [savingUser, setSavingUser] = useState(false);

  // Change plan
  const [newPlan, setNewPlan] = useState("free");
  const [planReason, setPlanReason] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);

  // Reset password
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Send email
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Deactivate / reactivate
  const [togglingActive, setTogglingActive] = useState(false);

  // Track whether user is active (defaults true, updated from data)
  const [isUserActive, setIsUserActive] = useState(true);

  function toggleSection(id: string) {
    setOpenSection((prev) => (prev === id ? null : id));
    setActionFeedback(null);
  }

  function showFeedback(section: string, type: "success" | "error", message: string) {
    setActionFeedback({ section, type, message });
    setTimeout(() => setActionFeedback(null), 5000);
  }

  // Sync edit fields when data loads
  useEffect(() => {
    if (data) {
      setEditName(data.user.name || "");
      setEditEmail(data.user.email);
      setEditRole(data.user.role);
      setNewPlan(data.subscription?.plan || "free");
    }
  }, [data]);

  async function handleSaveUserInfo() {
    if (!params?.id) return;
    setSavingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName, email: editEmail, role: editRole }),
      });
      if (!res.ok) throw new Error("Error al guardar cambios.");
      setData((prev) => prev ? {
        ...prev,
        user: { ...prev.user, name: editName, email: editEmail, role: editRole },
      } : prev);
      showFeedback("edit-user", "success", "Datos del usuario actualizados correctamente.");
    } catch {
      showFeedback("edit-user", "error", "No se pudieron guardar los cambios.");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleChangePlan() {
    if (!params?.id) return;
    if (!window.confirm(`Cambiar plan a "${newPlan}"? Esta accion puede afectar la facturacion del usuario.`)) return;
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: newPlan, reason: planReason }),
      });
      if (!res.ok) throw new Error("Error al cambiar plan.");
      setData((prev) => prev ? {
        ...prev,
        subscription: prev.subscription
          ? { ...prev.subscription, plan: newPlan }
          : { plan: newPlan, status: "active", createdAt: new Date().toISOString() },
      } : prev);
      setPlanReason("");
      showFeedback("change-plan", "success", `Plan cambiado a "${newPlan}" correctamente.`);
    } catch {
      showFeedback("change-plan", "error", "No se pudo cambiar el plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleResetPassword() {
    if (!params?.id || !newPassword.trim()) return;
    if (!window.confirm("Resetear la contrasena de este usuario? Se cerraran sus sesiones activas.")) return;
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) throw new Error("Error al resetear contraseña.");
      setNewPassword("");
      showFeedback("reset-password", "success", "Contraseña reseteada correctamente.");
    } catch {
      showFeedback("reset-password", "error", "No se pudo resetear la contrasena.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSendEmail() {
    if (!params?.id || !emailSubject.trim() || !emailBody.trim()) return;
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
      });
      if (!res.ok) throw new Error("Error al enviar email.");
      setEmailSubject("");
      setEmailBody("");
      showFeedback("send-email", "success", "Email enviado correctamente.");
    } catch {
      showFeedback("send-email", "error", "No se pudo enviar el email.");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleToggleActive() {
    if (!params?.id) return;
    const activating = !isUserActive;
    const msg = activating
      ? "Reactivar este usuario?"
      : "Desactivar este usuario? Perdera acceso a la plataforma.";
    if (!window.confirm(msg)) return;
    setTogglingActive(true);
    try {
      if (activating) {
        const res = await fetch(`/api/admin/users/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isActive: true }),
        });
        if (!res.ok) throw new Error("Error al reactivar usuario.");
      } else {
        const res = await fetch(`/api/admin/users/${params.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al desactivar usuario.");
      }
      setIsUserActive(activating);
      showFeedback("toggle-active", "success", activating ? "Usuario reactivado." : "Usuario desactivado.");
    } catch {
      showFeedback("toggle-active", "error", activating ? "No se pudo reactivar el usuario." : "No se pudo desactivar el usuario.");
    } finally {
      setTogglingActive(false);
    }
  }

  useEffect(() => {
    async function fetchDetail() {
      if (!params?.id) {
        setError("ID de usuario no válido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/users/${params.id}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (response.status === 401) {
          router.replace(`/admin/login?next=/admin/users/${params.id}`);
          return;
        }

        const payload = (await response.json().catch(() => null)) as UserDetailResponse | null;
        if (!response.ok || !payload) {
          throw new Error("No se pudo cargar la ficha del usuario.");
        }

        setData(payload);
        userId.current = params?.id ?? null;

        // Load psychologist panel data in parallel — errors are non-blocking
        const id = params?.id;
        if (id) {
          void Promise.allSettled([
            fetch(`/api/admin/clinical-notes/${id}`, { credentials: "include" })
              .then((r) => r.ok ? r.json() as Promise<{ notes: ClinicalNote[] }> : null)
              .then((d) => { if (d) setNotes(d.notes ?? []); }),
            fetch(`/api/admin/assessments/${id}`, { credentials: "include" })
              .then((r) => r.ok ? r.json() as Promise<{ assessments: AssessmentItem[] }> : null)
              .then((d) => { if (d) setAssessments(d.assessments ?? []); }),
            fetch(`/api/admin/users/${id}/emotional-history?days=30`, { credentials: "include" })
              .then((r) => r.ok ? r.json() as Promise<{ timeline: TimelineEntry[]; crisisMarkers: CrisisMarker[] }> : null)
              .then((d) => { if (d) { setTimeline(d.timeline ?? []); setCrisisMarkers(d.crisisMarkers ?? []); } }),
            fetch(`/api/admin/users/${id}/tags`, { credentials: "include" })
              .then((r) => r.ok ? r.json() as Promise<{ tags: string[] }> : null)
              .then((d) => { if (d) setUserTags(d.tags ?? []); }),
            fetch(`/api/admin/tags`, { credentials: "include" })
              .then((r) => r.ok ? r.json() as Promise<{ tags: Array<{ tag: string; count: number }> }> : null)
              .then((d) => { if (d) setTagSuggestions(d.tags ?? []); }),
            fetch(`/api/admin/users/${id}/audit`, { credentials: "include" })
              .then((r) => r.ok ? r.json() as Promise<{ entries: typeof auditEntries }> : null)
              .then((d) => { if (d) setAuditEntries(d.entries ?? []); }),
          ]);
        }
      } catch (fetchError: unknown) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Error cargando ficha del usuario.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void fetchDetail();
  }, [params?.id, router]);

  async function saveTags(nextTags: string[]) {
    if (!params?.id) return;
    setTagsSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${params.id}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tags: nextTags }),
      });
      const d = (await res.json()) as { tags: string[] };
      setUserTags(d.tags ?? []);
    } finally {
      setTagsSaving(false);
    }
  }

  function addTagFromInput() {
    const raw = tagInput.trim().toLowerCase();
    if (!raw || userTags.includes(raw) || userTags.length >= 20) {
      setTagInput("");
      return;
    }
    const cleaned = raw.replace(/[^a-z0-9_-]/g, "").slice(0, 40);
    if (!cleaned) { setTagInput(""); return; }
    const next = [...userTags, cleaned];
    setTagInput("");
    void saveTags(next);
  }

  function removeTag(tag: string) {
    void saveTags(userTags.filter((t) => t !== tag));
  }

  async function handleAnonymize() {
    if (!params?.id) return;
    const confirmed = window.confirm(
      "¿Anonimizar este usuario? Se reemplazará su email, nombre y datos personales. Los mensajes y métricas se mantienen. ESTO NO SE PUEDE DESHACER.",
    );
    if (!confirmed) return;
    setGdprBusy("anonymize");
    try {
      const res = await fetch(`/api/admin/users/${params.id}/anonymize`, {
        method: "POST",
        credentials: "include",
        headers: { "X-Confirm-Anonymize": "true" },
      });
      if (!res.ok) throw new Error("ANONYMIZE_FAILED");
      window.alert("Usuario anonimizado. Recargando ficha.");
      window.location.reload();
    } catch {
      window.alert("No se pudo anonimizar el usuario.");
    } finally {
      setGdprBusy(null);
    }
  }

  async function handleSaveNote() {
    if (!noteInput.trim() || !userId.current) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/admin/clinical-notes/${userId.current}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: noteInput.trim() }),
      });
      const d = (await res.json()) as { note: ClinicalNote };
      setNotes((prev) => [d.note, ...prev]);
      setNoteInput("");
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!userId.current) return;
    await fetch(`/api/admin/clinical-notes/${userId.current}?noteId=${noteId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  async function handleAssignAssessment(type: "phq9" | "gad7") {
    if (!userId.current) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/assessments/${userId.current}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type }),
      });
      const d = (await res.json()) as { assessment: AssessmentItem };
      setAssessments((prev) => [{ ...d.assessment, response: null }, ...prev]);
    } finally {
      setAssigning(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } finally {
      router.replace("/admin/login");
    }
  }

  return (
    <AdminShell
      title="Ficha de Usuario"
      subtitle="Detalle operativo para soporte y seguimiento: salud, actividad, riesgo y comportamiento."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="size-4" />
            Volver al listado
          </Link>
        </Button>
        {params?.id && (
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <a
              href={`/api/admin/users/${params.id}/export-pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Exportar expediente (PDF)
            </a>
          </Button>
        )}
      </div>

      {error ? (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="p-4 text-white">{error}</CardContent>
        </Card>
      ) : null}

      {loading || !data ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-5 text-zinc-500">
            Cargando ficha de usuario...
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-zinc-800 bg-zinc-900/50 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={`/api/user/avatar/${data.user.id}`}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover border-2 border-zinc-700 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div>
                    <p className="text-xl font-semibold text-white">
                      {data.user.name || data.user.email}
                    </p>
                    <p className="text-sm text-zinc-500">{data.user.email}</p>
                    <p className="mt-1 text-xs text-zinc-500">ID {data.user.id}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Rol {data.user.role}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Plan {data.subscription?.plan || "free"}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Estado sub {data.subscription?.status || "inactive"}
                  </Badge>
                  {data.state?.crisisActive ? (
                    <Badge variant="danger" className="rounded-full px-3 py-1">
                      <ShieldAlert className="mr-1 size-3.5" />
                      Crisis activa
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/35 px-3 py-2">
                  <p className="text-xs text-zinc-500">Conversaciones</p>
                  <p className="font-semibold text-white">{data.user.counts.conversations}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/35 px-3 py-2">
                  <p className="text-xs text-zinc-500">Mensajes</p>
                  <p className="font-semibold text-white">{data.user.counts.messages}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/35 px-3 py-2">
                  <p className="text-xs text-zinc-500">Check-ins 7d</p>
                  <p className="font-semibold text-white">{data.activity7d.checkins}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/35 px-3 py-2">
                  <p className="text-xs text-zinc-500">Crisis 7d</p>
                  <p className="font-semibold text-[color:color-mix(in_oklab,var(--signal-danger)_60%,var(--foreground))]">
                    {data.activity7d.crisisEvents}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-800/35 px-3 py-2">
                  <p className="text-xs text-zinc-500">Evasión 7d</p>
                  <p className="font-semibold text-[color:color-mix(in_oklab,var(--signal-warning)_60%,var(--foreground))]">
                    {data.activity7d.avoidanceEvents}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <p className="text-zinc-500">
                  Última actividad: {formatDate(data.user.lastSeen)}
                </p>
                <p className="text-zinc-500">Creado: {formatDate(data.user.createdAt)}</p>
                <p className="text-zinc-500">
                  Actualizado: {formatDate(data.user.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── ADMIN ACTIONS ────────────────────────────────────────── */}
          <AdminPanel title="Acciones de administrador" description="Gestionar datos, plan, acceso y comunicaciones del usuario.">
            {/* ── 1. Edit User Info ── */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("edit-user")}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-800/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Pencil className="size-4 text-violet-400" />
                  Editar datos del usuario
                </span>
                <ChevronDown className={`size-4 text-zinc-500 transition-transform ${openSection === "edit-user" ? "rotate-180" : ""}`} />
              </button>
              {openSection === "edit-user" && (
                <div className="space-y-3 border-t border-zinc-800 px-4 py-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Nombre</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                      placeholder="Nombre del usuario"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Rol</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white focus:border-violet-500 focus:outline-none"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  {actionFeedback?.section === "edit-user" && (
                    <p className={`text-xs font-medium ${actionFeedback.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                      {actionFeedback.message}
                    </p>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    loading={savingUser}
                    loadingText="Guardando..."
                    onClick={() => void handleSaveUserInfo()}
                  >
                    <Check className="size-4" />
                    Guardar cambios
                  </Button>
                </div>
              )}
            </div>

            {/* ── 2. Change Plan ── */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("change-plan")}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-800/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <RefreshCw className="size-4 text-violet-400" />
                  Cambiar plan
                </span>
                <ChevronDown className={`size-4 text-zinc-500 transition-transform ${openSection === "change-plan" ? "rotate-180" : ""}`} />
              </button>
              {openSection === "change-plan" && (
                <div className="space-y-3 border-t border-zinc-800 px-4 py-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Plan</label>
                    <select
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value)}
                      className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white focus:border-violet-500 focus:outline-none"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Motivo (opcional)</label>
                    <textarea
                      value={planReason}
                      onChange={(e) => setPlanReason(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none resize-none"
                      placeholder="Motivo del cambio de plan..."
                    />
                  </div>
                  {actionFeedback?.section === "change-plan" && (
                    <p className={`text-xs font-medium ${actionFeedback.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                      {actionFeedback.message}
                    </p>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    loading={savingPlan}
                    loadingText="Cambiando..."
                    onClick={() => void handleChangePlan()}
                  >
                    Cambiar plan
                  </Button>
                </div>
              )}
            </div>

            {/* ── 3. Reset Password ── */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("reset-password")}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-800/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-amber-400" />
                  Resetear contrasena
                </span>
                <ChevronDown className={`size-4 text-zinc-500 transition-transform ${openSection === "reset-password" ? "rotate-180" : ""}`} />
              </button>
              {openSection === "reset-password" && (
                <div className="space-y-3 border-t border-zinc-800 px-4 py-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Nueva contrasena</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 pr-10 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                        placeholder="Nueva contrasena"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                        {showPw ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                  {actionFeedback?.section === "reset-password" && (
                    <p className={`text-xs font-medium ${actionFeedback.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                      {actionFeedback.message}
                    </p>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    loading={savingPassword}
                    loadingText="Reseteando..."
                    disabled={!newPassword.trim()}
                    onClick={() => void handleResetPassword()}
                  >
                    Resetear contrasena
                  </Button>
                </div>
              )}
            </div>

            {/* ── 4. Send Email ── */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("send-email")}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-800/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Mail className="size-4 text-violet-400" />
                  Enviar email
                </span>
                <ChevronDown className={`size-4 text-zinc-500 transition-transform ${openSection === "send-email" ? "rotate-180" : ""}`} />
              </button>
              {openSection === "send-email" && (
                <div className="space-y-3 border-t border-zinc-800 px-4 py-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Asunto</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
                      placeholder="Asunto del email"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Cuerpo</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none resize-none"
                      placeholder="Contenido del email..."
                    />
                  </div>
                  {actionFeedback?.section === "send-email" && (
                    <p className={`text-xs font-medium ${actionFeedback.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                      {actionFeedback.message}
                    </p>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    loading={sendingEmail}
                    loadingText="Enviando..."
                    disabled={!emailSubject.trim() || !emailBody.trim()}
                    onClick={() => void handleSendEmail()}
                  >
                    <Mail className="size-4" />
                    Enviar email
                  </Button>
                </div>
              )}
            </div>

            {/* ── 5. Deactivate / Reactivate ── */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("toggle-active")}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-800/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Power className={`size-4 ${isUserActive ? "text-red-400" : "text-emerald-400"}`} />
                  {isUserActive ? "Desactivar usuario" : "Reactivar usuario"}
                </span>
                <ChevronDown className={`size-4 text-zinc-500 transition-transform ${openSection === "toggle-active" ? "rotate-180" : ""}`} />
              </button>
              {openSection === "toggle-active" && (
                <div className="space-y-3 border-t border-zinc-800 px-4 py-4">
                  <p className="text-xs text-zinc-500">
                    {isUserActive
                      ? "Al desactivar el usuario, perdera acceso inmediato a la plataforma. Esta accion es reversible."
                      : "Al reactivar el usuario, recuperara acceso a la plataforma con su plan actual."}
                  </p>
                  {actionFeedback?.section === "toggle-active" && (
                    <p className={`text-xs font-medium ${actionFeedback.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                      {actionFeedback.message}
                    </p>
                  )}
                  <Button
                    variant={isUserActive ? "danger" : "primary"}
                    size="sm"
                    loading={togglingActive}
                    loadingText={isUserActive ? "Desactivando..." : "Reactivando..."}
                    onClick={() => void handleToggleActive()}
                  >
                    <Power className="size-4" />
                    {isUserActive ? "Desactivar usuario" : "Reactivar usuario"}
                  </Button>
                </div>
              )}
            </div>
          </AdminPanel>

          {/* Tags */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-violet-400" /> Etiquetas
              </CardTitle>
              <CardDescription>Para segmentar y encontrar usuarios. Máx 20.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {userTags.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sin etiquetas.</p>
                ) : (
                  userTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => removeTag(t)}
                      disabled={tagsSaving}
                      className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200 hover:bg-violet-500/20"
                      title="Click para eliminar"
                    >
                      {t} <span className="text-violet-400/80">×</span>
                    </button>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTagFromInput())}
                  placeholder="Nueva etiqueta (minúsculas, guiones)"
                  list="admin-tag-suggestions"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600"
                  maxLength={40}
                />
                <datalist id="admin-tag-suggestions">
                  {tagSuggestions
                    .filter((s) => !userTags.includes(s.tag))
                    .slice(0, 30)
                    .map((s) => (
                      <option key={s.tag} value={s.tag}>{`${s.tag} (${s.count})`}</option>
                    ))}
                </datalist>
                <Button type="button" size="sm" onClick={addTagFromInput} disabled={tagsSaving || !tagInput.trim()}>
                  Añadir
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit timeline */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-400" /> Historial de acciones admin
              </CardTitle>
              <CardDescription>Últimas 50 acciones sobre este usuario.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditEntries.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin acciones registradas.</p>
              ) : (
                <ol className="space-y-2">
                  {auditEntries.map((entry) => {
                    const meta = entry.metadata as Record<string, unknown> | null;
                    const metaSummary = meta
                      ? Object.entries(meta)
                          .filter(([, v]) => v !== null && v !== undefined && v !== "")
                          .map(([k, v]) => `${k}=${String(v).slice(0, 40)}`)
                          .join(" · ")
                      : "";
                    return (
                      <li key={entry.id} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs">
                        <span className="shrink-0 font-mono text-zinc-500">
                          {new Date(entry.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                        <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 font-semibold text-zinc-300">
                          {entry.action}
                        </span>
                        <span className="flex-1 text-zinc-400">
                          <span className="text-zinc-200">{entry.actorId}</span>
                          {metaSummary ? <span className="ml-1 text-zinc-500">· {metaSummary}</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* GDPR */}
          <Card className="border-red-500/20 bg-red-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-300">
                <Shield className="h-4 w-4" /> GDPR · Privacidad
              </CardTitle>
              <CardDescription className="text-red-300/70">
                Export (art. 15) · Anonymize / Erase (art. 17). Las 2 últimas no se pueden deshacer.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <a
                href={`/api/admin/users/${params?.id}/gdpr-export`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
              >
                <Download className="h-3.5 w-3.5" /> Export completo (JSON)
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAnonymize}
                disabled={gdprBusy !== null}
                className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              >
                <UserX className="mr-1.5 h-3.5 w-3.5" />
                {gdprBusy === "anonymize" ? "Anonimizando…" : "Anonymize (conserva métricas)"}
              </Button>
              <a
                href={`/admin/users/${params?.id}#danger`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                onClick={(e) => {
                  e.preventDefault();
                  window.alert(
                    "Para borrar físicamente (erase total), usa el panel de Acciones → Desactivar usuario, y después confirma el borrado duro desde la herramienta de soporte. Esto evita borrados accidentales desde la ficha.",
                  );
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Erase total (usa flujo seguro)
              </a>
            </CardContent>
          </Card>

          <UserUsageSection userId={data.user.id} />

          <UserAdminMessages userId={data.user.id} userEmail={data.user.email} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-3">
                <CardTitle>Estado emocional-operativo</CardTitle>
                <CardDescription>Lectura activa para soporte y retención.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!data.state ? (
                  <p className="text-zinc-500">Sin estado registrado.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Estado {data.state.state}</Badge>
                      <Badge variant="secondary">Fase {data.state.transformationPhase}</Badge>
                      <Badge variant="secondary">Riesgo {data.state.riskLevel}</Badge>
                    </div>
                    <p className="text-zinc-500">
                      Emoción primaria: {data.state.primaryEmotion}
                    </p>
                    <p className="text-zinc-500">
                      Patrón dominante: {data.state.dominantPattern}
                    </p>
                    <p className="text-zinc-500">Área foco: {data.state.focusArea}</p>
                    <p className="text-zinc-500">
                      Nivel de energía: {data.state.energyLevel}
                    </p>
                    <p className="text-zinc-500">Tendencia: {data.state.progressTrend}</p>
                    <p className="text-zinc-500">
                      Actualizado: {formatDate(data.state.updatedAt)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-3">
                <CardTitle>Perfil Impulso y Racha</CardTitle>
                <CardDescription>Diagnóstico y constancia.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {data.profile ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{data.profile.title}</Badge>
                      <Badge variant="secondary">Tipo {data.profile.type}</Badge>
                      <Badge variant="secondary">Código {data.profile.code}</Badge>
                    </div>
                    <p className="text-zinc-500">{data.profile.description}</p>
                    <p className="text-zinc-500">
                      Foco operativo: {data.profile.operationalFocus}
                    </p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      <div className="rounded-lg border border-zinc-800 px-2 py-2">
                        Claridad {data.profile.scores.claridad}
                      </div>
                      <div className="rounded-lg border border-zinc-800 px-2 py-2">
                        Autoestima {data.profile.scores.autoestima}
                      </div>
                      <div className="rounded-lg border border-zinc-800 px-2 py-2">
                        Energía {data.profile.scores.energia}
                      </div>
                      <div className="rounded-lg border border-zinc-800 px-2 py-2">
                        Disciplina {data.profile.scores.disciplina}
                      </div>
                      <div className="rounded-lg border border-zinc-800 px-2 py-2">
                        Social {data.profile.scores.social}
                      </div>
                      <div className="rounded-lg border border-zinc-800 px-2 py-2">
                        Total {data.profile.scores.total}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-zinc-500">Sin perfil diagnóstico asignado.</p>
                )}

                <div className="rounded-xl border border-zinc-800 bg-zinc-800/35 px-3 py-3">
                  <p className="text-sm font-medium text-white">Racha</p>
                  <p className="mt-1 text-zinc-500">
                    Actual {data.streak?.currentDays || 0} días · Mejor {data.streak?.bestDays || 0}{" "}
                    días
                  </p>
                  <p className="text-zinc-500">
                    Estado {data.streak?.status || "inactive"}
                  </p>
                  <p className="text-zinc-500">
                    Último check-in {formatDate(data.streak?.lastCheckInDate || null)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-4" />
                  Objetivos activos ({data.activeGoals.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {data.activeGoals.length === 0 ? (
                  <p className="text-sm text-zinc-500">Sin objetivos activos.</p>
                ) : (
                  data.activeGoals.map((goal) => {
                    const progress =
                      goal.totalActions > 0
                        ? Math.round((goal.completedActions / goal.totalActions) * 100)
                        : 0;

                    return (
                      <div key={goal.id} className="rounded-xl border border-zinc-800 p-3">
                        <p className="text-sm font-semibold text-white">{goal.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {goal.completedActions}/{goal.totalActions} acciones
                        </p>
                        <Progress className="mt-2 h-2" value={progress} />
                        <div className="mt-2 space-y-1">
                          {goal.actions.slice(0, 5).map((action) => (
                            <p key={action.id} className="text-xs text-zinc-500">
                              {action.completed ? "[x]" : "[ ]"} {action.description}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Link
              href={`/admin/users/${data.user.id}/contenido`}
              className="group flex items-center justify-between rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/5 px-4 py-3 transition-all hover:border-violet-500/50 hover:from-violet-500/15"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-500/20 p-2 text-violet-300">
                  <MessageSquareText className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Ver todo lo que ha escrito</p>
                  <p className="text-xs text-zinc-500">
                    Timeline unificado: mensajes · comunidad · diario · check-ins · feedback. Con filtros y exportación CSV/TXT.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-violet-300 group-hover:text-violet-200 whitespace-nowrap">
                Abrir →
              </span>
            </Link>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareText className="size-4" />
                  Todas las conversaciones ({data.conversations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {data.conversations.length === 0 ? (
                  <p className="text-sm text-zinc-500">Sin conversaciones registradas.</p>
                ) : (
                  data.conversations.map((conversation) => (
                    <div key={conversation.id} className="rounded-xl border border-zinc-800 p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{conversation.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {conversation.messageCount} mensajes · {formatDate(conversation.updatedAt)}
                        </p>
                      </div>
                      <Link
                        href={`/admin/users/${data.user.id}/conversations/${conversation.id}`}
                        className="shrink-0 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap"
                      >
                        Ver chat →
                      </Link>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-3">
                <CardTitle>Eventos de crisis ({data.crisisEvents.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {data.crisisEvents.length === 0 ? (
                  <p className="text-sm text-zinc-500">Sin eventos de crisis.</p>
                ) : (
                  data.crisisEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="danger">{event.level}</Badge>
                        <span className="text-xs text-zinc-500">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-white">{event.message}</p>
                      <p className="mt-1 text-xs text-zinc-500">Respuesta: {event.response}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-3">
                <CardTitle>Eventos de evasion ({data.avoidanceEvents.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {data.avoidanceEvents.length === 0 ? (
                  <p className="text-sm text-zinc-500">Sin eventos de evasión.</p>
                ) : (
                  data.avoidanceEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="warning">{event.type}</Badge>
                        <span className="text-xs text-zinc-500">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-white">{event.action.description}</p>
                      {event.action.goalTitle ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          Objetivo: {event.action.goalTitle}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── EMOTIONAL TIMELINE ────────────────────────────────────── */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Brain className="size-4" />
                Estado emocional — últimos 30 días
              </CardTitle>
              <CardDescription>Un cuadrado por día. Color = estado registrado en check-in.</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin datos de check-in en los últimos 30 días.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {timeline.map((entry) => {
                    const isCrisis = crisisMarkers.some((m) => m.date === entry.date);
                    const color = STATE_COLORS[entry.emotionalState] ?? STATE_COLORS.unknown;
                    return (
                      <div
                        key={entry.date}
                        title={`${entry.date} · ${entry.emotionalState}${entry.momentum ? ` · energía ${entry.momentum}` : ""}${isCrisis ? " · ⚠ crisis" : ""}`}
                        className={`h-7 w-7 rounded-md ${color} ${isCrisis ? "ring-2 ring-red-500" : ""} cursor-default`}
                      />
                    );
                  })}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                {Object.entries(STATE_COLORS).filter(([k]) => k !== "unknown").map(([state, cls]) => (
                  <span key={state} className="flex items-center gap-1">
                    <span className={`inline-block h-3 w-3 rounded-sm ${cls}`} />
                    {state}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── CLINICAL NOTES ────────────────────────────────────────── */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <NotebookPen className="size-4" />
                Notas clínicas
              </CardTitle>
              <CardDescription>Privadas — solo visibles desde el panel de admin.</CardDescription>
            </CardHeader>
            <div className="mx-6 mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300 leading-relaxed">
              <strong>Aviso legal:</strong> Esta sección es exclusiva para profesionales de salud mental habilitados. El uso por parte de personal no clínico puede constituir una infracción ética y regulatoria (LOPDGDD / GDPR, art. 9 — datos de salud). Si no eres psicólogo/a u otro profesional sanitario colegiado, no introduzcas observaciones diagnósticas ni de salud mental en este campo.
            </div>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Observación clínica, patrón detectado, nota de sesión..."
                  rows={3}
                  className="resize-none text-sm"
                />
                <Button
                  onClick={() => void handleSaveNote()}
                  disabled={noteSaving || !noteInput.trim()}
                  size="sm"
                  className="self-end"
                >
                  Guardar
                </Button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin notas registradas.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="group rounded-xl border border-zinc-800 bg-zinc-800/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-white whitespace-pre-wrap">{note.content}</p>
                        <button
                          onClick={() => void handleDeleteNote(note.id)}
                          className="shrink-0 text-zinc-500 opacity-0 group-hover:opacity-100 transition hover:text-red-400"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{new Date(note.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── ASSESSMENTS ───────────────────────────────────────────── */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-4" />
                Escalas de evaluación
              </CardTitle>
              <CardDescription>Asigna PHQ-9 o GAD-7. El usuario las recibe en la app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={assigning}
                  onClick={() => void handleAssignAssessment("phq9")}
                >
                  Asignar PHQ-9
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={assigning}
                  onClick={() => void handleAssignAssessment("gad7")}
                >
                  Asignar GAD-7
                </Button>
              </div>
              {assessments.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin evaluaciones asignadas.</p>
              ) : (
                <div className="space-y-2">
                  {assessments.map((a) => (
                    <div key={a.id} className="rounded-xl border border-zinc-800 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white">{a.title}</p>
                        <Badge variant={a.status === "completed" ? "secondary" : "warning"}>
                          {a.status === "completed" ? "Completada" : "Pendiente"}
                        </Badge>
                      </div>
                      {a.response ? (
                        <p className={`mt-1 text-sm font-semibold ${SEVERITY_COLORS[a.response.severity] ?? ""}`}>
                          Puntuación {a.response.totalScore} · {SEVERITY_LABELS[a.response.severity] ?? a.response.severity}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-zinc-500">Esperando respuesta del usuario</p>
                      )}
                      <p className="mt-1 text-xs text-zinc-500">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle>Todos los mensajes ({data.messages.length})</CardTitle>
              <CardDescription>
                Historial completo de mensajes del usuario.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {data.messages.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin mensajes.</p>
              ) : (
                data.messages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-zinc-800 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <Badge variant="secondary">{message.role}</Badge>
                      <span>{formatDate(message.createdAt)}</span>
                      <span>Conversación {message.conversationId}</span>
                    </div>
                    <p className="mt-2 text-sm text-white">{message.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AdminShell>
  );
}
