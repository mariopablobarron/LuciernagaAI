"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Stethoscope, LogOut, AlertTriangle, CheckCircle2, Clock,
  Flame, Target, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
} from "lucide-react";

type Patient = {
  id: string;
  displayName: string;
  riskFlag: "green" | "yellow" | "red";
  daysSinceActive: number;
  messageCount: number;
  state: string;
  primaryEmotion: string;
  dominantPattern: string;
  progressTrend: string;
  transformationPhase: string;
  riskLevel: string;
  crisisActive: boolean;
  streakDays: number;
  bestStreak: number;
  activeGoal: string | null;
  goalProgress: number;
  lastAvoidance: { type: string; daysAgo: number } | null;
};

const FLAG_STYLES = {
  green: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  yellow: { bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-400" },
  red: { bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-400" },
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "subiendo") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === "bajando") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-zinc-500" />;
}

function PatientCard({ patient }: { patient: Patient }) {
  const [expanded, setExpanded] = useState(false);
  const flag = FLAG_STYLES[patient.riskFlag];

  return (
    <div className={`rounded-xl border ${flag.border} ${flag.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full ${flag.dot} shrink-0`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{patient.displayName}</p>
            <p className="text-xs text-zinc-500 capitalize">{patient.state} · {patient.primaryEmotion}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {patient.crisisActive && (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          {patient.streakDays > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Flame className="w-3 h-3" />{patient.streakDays}d
            </span>
          )}
          <TrendIcon trend={patient.progressTrend} />
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-zinc-800/40 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Fase</p>
              <p className="text-xs font-medium text-zinc-300 capitalize">{patient.transformationPhase}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Patrón</p>
              <p className="text-xs font-medium text-zinc-300">{patient.dominantPattern}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Riesgo</p>
              <p className={`text-xs font-medium ${patient.riskLevel === "high" ? "text-red-400" : patient.riskLevel === "medium" ? "text-amber-400" : "text-emerald-400"}`}>
                {patient.riskLevel}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Mensajes</p>
              <p className="text-xs font-medium text-zinc-300">{patient.messageCount}</p>
            </div>
          </div>

          {patient.activeGoal && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-violet-400" />
                <p className="text-xs text-zinc-300">{patient.activeGoal}</p>
                <span className="text-[10px] text-zinc-500 ml-auto">{patient.goalProgress}%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${patient.goalProgress}%` }} />
              </div>
            </div>
          )}

          {patient.lastAvoidance && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              Evitación ({patient.lastAvoidance.type}) hace {patient.lastAvoidance.daysAgo}d
            </div>
          )}

          <div className="flex items-center gap-4 text-[10px] text-zinc-600 pt-1">
            <span>Última actividad: {patient.daysSinceActive === 0 ? "hoy" : `hace ${patient.daysSinceActive}d`}</span>
            <span>Mejor racha: {patient.bestStreak}d</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapistName, setTherapistName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orgId = sessionStorage.getItem("org_id");
    const token = sessionStorage.getItem("org_token");
    const role = sessionStorage.getItem("org_role");
    if (!orgId || !token || role !== "therapist") { router.push("/org/login"); return; }

    fetch(`/api/org/patients?orgId=${orgId}&token=${token}`)
      .then((r) => r.json())
      .then((d: { patients: Patient[]; therapist: string }) => {
        setPatients(d.patients ?? []);
        setTherapistName(d.therapist ?? "");
      })
      .catch(() => router.push("/org/login"))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    sessionStorage.clear();
    router.push("/org/login");
  }

  // Sort: red first, then yellow, then green
  const sorted = [...patients].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2 };
    return order[a.riskFlag] - order[b.riskFlag];
  });

  const redCount = patients.filter((p) => p.riskFlag === "red").length;
  const yellowCount = patients.filter((p) => p.riskFlag === "yellow").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Stethoscope className="w-5 h-5 text-cyan-400" />
          <div>
            <h1 className="text-lg font-bold">Portal del Terapeuta</h1>
            <p className="text-xs text-zinc-500">{therapistName} · {patients.length} pacientes</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Summary bar */}
        {(redCount > 0 || yellowCount > 0) && (
          <div className="flex gap-3">
            {redCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs font-medium text-red-300">{redCount} crisis</span>
              </div>
            )}
            {yellowCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-medium text-amber-300">{yellowCount} atención</span>
              </div>
            )}
          </div>
        )}

        {/* Patient list */}
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400">No hay pacientes asignados</p>
          </div>
        ) : (
          sorted.map((p) => <PatientCard key={p.id} patient={p} />)
        )}

        <p className="text-center text-[11px] text-zinc-600 pt-4">
          Sin acceso al contenido de los chats. Solo metadatos clínicos.
        </p>
      </div>
    </div>
  );
}
