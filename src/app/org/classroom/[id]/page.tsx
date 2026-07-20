"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Users, Flame, Target, TrendingUp,
  AlertTriangle, ChevronDown, ChevronUp, Copy, Check,
  LogOut, BookOpen, Plus, BarChart3,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Student = {
  id: string;
  name: string | null;
  email: string;
  lastSeen: string;
  messageCount: number;
  riskLevel: string;
  crisisActive: boolean;
  streakDays: number;
  bestStreak: number;
  activeGoal: string | null;
  goalProgress: number;
};

type Code = {
  id: string;
  code: string;
  label: string | null;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
};

type ClassroomData = {
  classroom: { id: string; name: string; description: string | null };
  students: Student[];
  codes: Code[];
  stats: { totalStudents: number; activeLastWeek: number; inCrisis: number; avgStreak: number };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RISK_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  low: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  medium: { bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-400" },
  high: { bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-400" },
};

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? "hoy" : `hace ${d}d`;
}

// ─── Student Card ────────────────────────────────────────────────────────────

function StudentCard({ student }: { student: Student }) {
  const [open, setOpen] = useState(false);
  const risk = RISK_STYLES[student.riskLevel] ?? RISK_STYLES.low;

  return (
    <div className={`rounded-xl border ${risk.border} ${risk.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full ${risk.dot} shrink-0`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{student.name || student.email}</p>
            {/* AI Act art. 5.1(f): prohibida la inferencia emocional individual en
                contexto educativo. El riesgo/crisis se mantiene (excepción de
                seguridad); la emoción y el estado por alumno no se muestran. */}
            <p className="text-xs text-zinc-500">
              {daysAgo(student.lastSeen)} · {student.messageCount} mensajes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {student.crisisActive && <AlertTriangle className="w-4 h-4 text-red-400" />}
          {student.streakDays > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Flame className="w-3 h-3" />{student.streakDays}d
            </span>
          )}
          {/* TrendIcon retirado: progressTrend deriva del modelo emocional →
              misma restricción art. 5.1(f) que la emoción por alumno. */}
          {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3 border-t border-zinc-800/40 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Mensajes</p>
              <p className="text-xs font-medium text-zinc-300">{student.messageCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Racha</p>
              <p className="text-xs font-medium text-zinc-300">{student.streakDays}d (mejor: {student.bestStreak}d)</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Riesgo</p>
              <p className={`text-xs font-medium ${student.riskLevel === "high" ? "text-red-400" : student.riskLevel === "medium" ? "text-amber-400" : "text-emerald-400"}`}>
                {student.riskLevel}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Ultima vez</p>
              <p className="text-xs font-medium text-zinc-300">{daysAgo(student.lastSeen)}</p>
            </div>
          </div>
          {student.activeGoal && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-violet-400" />
                <p className="text-xs text-zinc-300">{student.activeGoal}</p>
                <span className="text-[10px] text-zinc-500 ml-auto">{student.goalProgress}%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${student.goalProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ClassroomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ClassroomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    const orgId = sessionStorage.getItem("org_id");
    const token = sessionStorage.getItem("org_token");
    if (!orgId || !token) { router.push("/org/login"); return; }

    fetch(`/api/org/classrooms/${params.id}?orgId=${orgId}&token=${token}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: ClassroomData) => setData(d))
      .catch(() => router.push("/org/login"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function handleGenerateCode() {
    const orgId = sessionStorage.getItem("org_id");
    const token = sessionStorage.getItem("org_token");
    if (!orgId || !token) return;

    setGeneratingCode(true);
    try {
      const res = await fetch(`/api/org/classrooms/${params.id}/codes?orgId=${orgId}&token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxUses: 0 }),
      });
      if (res.ok) {
        // Refresh data
        const refreshRes = await fetch(`/api/org/classrooms/${params.id}?orgId=${orgId}&token=${token}`);
        if (refreshRes.ok) setData(await refreshRes.json());
      }
    } finally {
      setGeneratingCode(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { classroom, students, codes, stats } = data;

  // Sort students: crisis first, then by risk, then by last seen
  const sorted = [...students].sort((a, b) => {
    if (a.crisisActive !== b.crisisActive) return a.crisisActive ? -1 : 1;
    const riskOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const riskDiff = (riskOrder[a.riskLevel] ?? 2) - (riskOrder[b.riskLevel] ?? 2);
    if (riskDiff !== 0) return riskDiff;
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          <div>
            <h1 className="text-lg font-bold">{classroom.name}</h1>
            <p className="text-xs text-zinc-500">{stats.totalStudents} alumnos · {stats.activeLastWeek} activos esta semana</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/org/dashboard" className="p-2 text-zinc-500 hover:text-violet-400 transition-colors" title="Dashboard">
            <BarChart3 className="w-4 h-4" />
          </Link>
          <Link href="/org/guia" className="p-2 text-zinc-500 hover:text-violet-400 transition-colors" title="Guia">
            <BookOpen className="w-4 h-4" />
          </Link>
          <button
            onClick={() => { sessionStorage.clear(); router.push("/org/login"); }}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <Users className="w-5 h-5 text-violet-400 mb-3" />
            <p className="text-2xl font-bold">{stats.totalStudents}</p>
            <p className="text-xs text-zinc-500 mt-1">Alumnos</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <TrendingUp className="w-5 h-5 text-cyan-400 mb-3" />
            <p className="text-2xl font-bold">{stats.activeLastWeek}</p>
            <p className="text-xs text-zinc-500 mt-1">Activos (7d)</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <Flame className="w-5 h-5 text-amber-400 mb-3" />
            <p className="text-2xl font-bold">{stats.avgStreak}d</p>
            <p className="text-xs text-zinc-500 mt-1">Racha media</p>
          </div>
          <div className={`rounded-xl border p-5 ${stats.inCrisis > 0 ? "border-red-500/30 bg-red-500/5" : "border-zinc-800 bg-zinc-900/50"}`}>
            <AlertTriangle className={`w-5 h-5 mb-3 ${stats.inCrisis > 0 ? "text-red-400" : "text-zinc-700"}`} />
            <p className="text-2xl font-bold">{stats.inCrisis}</p>
            <p className="text-xs text-zinc-500 mt-1">En crisis</p>
          </div>
        </div>

        {/* Codes section */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Codigos de registro</h3>
            <button
              onClick={() => void handleGenerateCode()}
              disabled={generatingCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white disabled:opacity-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {generatingCode ? "Generando..." : "Nuevo codigo"}
            </button>
          </div>
          {codes.length === 0 ? (
            <p className="text-xs text-zinc-500">Genera un codigo para que los alumnos se registren.</p>
          ) : (
            <div className="space-y-2">
              {codes.filter((c) => c.isActive).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-2.5">
                  <div>
                    <code className="text-sm font-mono font-bold text-violet-300">{c.code}</code>
                    {c.label && <span className="ml-2 text-xs text-zinc-500">{c.label}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">
                      {c.usedCount} usos{c.maxUses > 0 ? `/${c.maxUses}` : ""}
                    </span>
                    <button
                      onClick={() => copyCode(c.code)}
                      className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                      title="Copiar codigo"
                    >
                      {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[10px] text-zinc-600">
            Los alumnos introducen este codigo al registrarse y quedan asignados a tu clase automaticamente.
          </p>
        </div>

        {/* Student list */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Alumnos ({sorted.length})</h3>
          {sorted.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400">Todavia no hay alumnos. Comparte un codigo de registro.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((s) => <StudentCard key={s.id} student={s} />)}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-600">
          Datos anonimizados. Sin acceso al contenido de las conversaciones.
        </p>
      </div>
    </div>
  );
}
