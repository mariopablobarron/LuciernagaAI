"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Heart, Lightbulb, Rocket, Eye, Plus, Check, ChevronRight,
  Pause, Play, X, Send, Target, AlertCircle, Sparkles,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type PhaseEntry = {
  id: string; phase: string; promptKey: string; question: string;
  response: string | null; aiReflection: string | null; status: string; order: number;
};

type FocusArea = {
  id: string; title: string; description: string | null; priority: number;
  status: string; steps: Step[];
};

type Step = {
  id: string; description: string; completed: boolean; completedAt: string | null;
  dueDate: string | null; reflection: string | null; order: number;
};

type Reflection = {
  id: string; phase: string; type: string; content: string;
  aiChallenge: string | null; createdAt: string;
};

type Insight = {
  id: string; type: string; content: string; phase: string;
  acknowledged: boolean; createdAt: string;
};

type Project = {
  id: string; title: string; description: string | null; phase: string;
  status: string; startedAt: string; completedAt: string | null;
  phaseEntries: PhaseEntry[];
  focusAreas: FocusArea[];
  reflections: Reflection[];
  insights: Insight[];
};

type Phase = "feel" | "imagine" | "act" | "reflect";

// ─── Config ──────────────────────────────────────────────────────────────────

const PHASES: { key: Phase; label: string; icon: typeof Heart; color: string; activeColor: string }[] = [
  { key: "feel", label: "Sentir", icon: Heart, color: "text-rose-400", activeColor: "bg-rose-500/15 border-rose-500/30 text-rose-300" },
  { key: "imagine", label: "Imaginar", icon: Lightbulb, color: "text-amber-400", activeColor: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
  { key: "act", label: "Actuar", icon: Rocket, color: "text-emerald-400", activeColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
  { key: "reflect", label: "Reflexionar", icon: Eye, color: "text-violet-400", activeColor: "bg-violet-500/15 border-violet-500/30 text-violet-300" },
];

const PHASE_ORDER: Phase[] = ["feel", "imagine", "act", "reflect"];

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewPhase, setViewPhase] = useState<Phase>("feel");
  const [error, setError] = useState<string | null>(null);

  // Entry response form
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Focus area form
  const [showAddFocus, setShowAddFocus] = useState(false);
  const [newFocusTitle, setNewFocusTitle] = useState("");

  // Step form
  const [addingStepTo, setAddingStepTo] = useState<string | null>(null);
  const [newStepDesc, setNewStepDesc] = useState("");

  // Reflection form
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState("");

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      if (res.status === 401) { router.replace("/login"); return; }
      if (!res.ok) { setError("Proyecto no encontrado"); setLoading(false); return; }
      const data = await res.json();
      setProject(data);
      setViewPhase(data.phase as Phase);
    } catch { setError("Error cargando proyecto"); }
    finally { setLoading(false); }
  }, [projectId, router]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleSubmitResponse(entryId: string) {
    if (!responseText.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/projects/${projectId}/entries`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, response: responseText.trim() }),
      });
      setRespondingTo(null); setResponseText("");
      fetchProject();
    } catch { setError("Error guardando respuesta"); }
    finally { setSubmitting(false); }
  }

  async function handleAdvancePhase() {
    if (!project) return;
    const currentIdx = PHASE_ORDER.indexOf(project.phase as Phase);
    const nextPhase = PHASE_ORDER[currentIdx + 1];
    if (!nextPhase) return;
    if (!confirm(`Avanzar a fase ${PHASES.find((p) => p.key === nextPhase)?.label}?`)) return;

    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: nextPhase }),
    });
    fetchProject();
  }

  async function handleBackToFeel() {
    if (!confirm("Volver a Sentir con nueva perspectiva?")) return;
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "feel" }),
    });
    fetchProject();
  }

  async function handleAddFocusArea() {
    if (!newFocusTitle.trim()) return;
    await fetch(`/api/projects/${projectId}/focus`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newFocusTitle.trim() }),
    });
    setNewFocusTitle(""); setShowAddFocus(false);
    fetchProject();
  }

  async function handleAddStep(focusId: string) {
    if (!newStepDesc.trim()) return;
    await fetch(`/api/projects/${projectId}/focus/${focusId}/steps`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: newStepDesc.trim() }),
    });
    setNewStepDesc(""); setAddingStepTo(null);
    fetchProject();
  }

  async function handleCompleteStep(stepId: string, focusId: string) {
    await fetch(`/api/projects/${projectId}/focus/${focusId}/steps`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId }),
    });
    fetchProject();
  }

  async function handleAddReflection() {
    if (!reflectionText.trim() || !project) return;
    await fetch(`/api/projects/${projectId}/reflections`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reflectionText.trim(), type: "free", phase: project.phase }),
    });
    setReflectionText(""); setShowReflection(false);
    fetchProject();
  }

  async function handleAcknowledgeInsight(insightId: string) {
    await fetch(`/api/projects/${projectId}/insights`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ insightId }),
    });
    fetchProject();
  }

  async function handlePauseResume() {
    if (!project) return;
    const newStatus = project.status === "active" ? "paused" : "active";
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchProject();
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-zinc-500">
        {error || "Proyecto no encontrado"}
      </div>
    );
  }

  const phaseEntries = project.phaseEntries.filter((e) => e.phase === viewPhase).sort((a, b) => a.order - b.order);
  const currentPhaseIdx = PHASE_ORDER.indexOf(project.phase as Phase);
  const canAdvance = currentPhaseIdx < PHASE_ORDER.length - 1 && viewPhase === project.phase;
  const isReflectPhase = project.phase === "reflect";
  const unackedInsights = project.insights.filter((i) => !i.acknowledged);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 flex justify-between">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Project header */}
      <div className="card-surface rounded-2xl border border-zinc-800 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{project.title}</h1>
            {project.description && <p className="mt-1 text-sm text-zinc-400">{project.description}</p>}
          </div>
          <button onClick={handlePauseResume} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors">
            {project.status === "active" ? <><Pause className="h-3.5 w-3.5" /> Pausar</> : <><Play className="h-3.5 w-3.5" /> Reanudar</>}
          </button>
        </div>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PHASES.map((p, i) => {
          const Icon = p.icon;
          const isCurrent = project.phase === p.key;
          const isViewing = viewPhase === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setViewPhase(p.key)}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                isViewing ? p.activeColor : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {p.label}
              {isCurrent && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-current" />}
            </button>
          );
        })}
      </div>

      {/* Unacknowledged insights banner */}
      {unackedInsights.length > 0 && (
        <div className="space-y-2">
          {unackedInsights.map((insight) => (
            <div key={insight.id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">{insight.type.replace("_", " ")}</p>
                  <p className="text-sm text-zinc-200 mt-1">{insight.content}</p>
                </div>
              </div>
              <button onClick={() => handleAcknowledgeInsight(insight.id)} className="text-xs text-amber-400 hover:text-amber-300">
                Entendido
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Phase entries (Q&A) */}
      <div className="space-y-4">
        {phaseEntries.map((entry) => (
          <div key={entry.id} className="card-surface rounded-2xl border border-zinc-800 p-5 space-y-3">
            {/* Question */}
            <p className="text-sm font-medium text-white">{entry.question}</p>

            {/* Response */}
            {entry.response ? (
              <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{entry.response}</p>
              </div>
            ) : respondingTo === entry.id ? (
              <div className="space-y-2">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Tu respuesta..."
                  rows={4}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setRespondingTo(null); setResponseText(""); }} className="text-xs text-zinc-500">Cancelar</button>
                  <button
                    onClick={() => handleSubmitResponse(entry.id)}
                    disabled={submitting || !responseText.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition-colors"
                  >
                    <Send className="h-3 w-3" /> {submitting ? "Enviando..." : "Responder"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setRespondingTo(entry.id)}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Responder
              </button>
            )}

            {/* AI Reflection */}
            {entry.aiReflection && (
              <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4">
                <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-1">Reflexion del sistema</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{entry.aiReflection}</p>
              </div>
            )}
          </div>
        ))}

        {phaseEntries.length === 0 && (
          <p className="text-center text-sm text-zinc-600 py-8">
            {viewPhase === project.phase ? "Las preguntas de esta fase aparecerán cuando avances aqui." : "Sin entradas en esta fase todavia."}
          </p>
        )}
      </div>

      {/* Focus areas (visible in imagine & act phases) */}
      {(viewPhase === "imagine" || viewPhase === "act") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> Focos de accion
            </h3>
            <button onClick={() => setShowAddFocus(!showAddFocus)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Nuevo foco
            </button>
          </div>

          {showAddFocus && (
            <div className="flex gap-2">
              <input
                value={newFocusTitle} onChange={(e) => setNewFocusTitle(e.target.value)}
                placeholder="Nombre del foco de accion..."
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                autoFocus
              />
              <button onClick={handleAddFocusArea} disabled={!newFocusTitle.trim()} className="rounded-xl bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition-colors">
                <Check className="h-4 w-4" />
              </button>
            </div>
          )}

          {project.focusAreas.map((fa) => (
            <div key={fa.id} className="card-surface rounded-xl border border-zinc-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">{fa.title}</h4>
                <span className="text-[10px] text-zinc-500">{fa.steps.filter((s) => s.completed).length}/{fa.steps.length} pasos</span>
              </div>

              {/* Steps */}
              <div className="space-y-1.5">
                {fa.steps.sort((a, b) => a.order - b.order).map((step) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <button
                      onClick={() => !step.completed && handleCompleteStep(step.id, fa.id)}
                      className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        step.completed
                          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                          : "border-zinc-700 hover:border-violet-500/50"
                      }`}
                    >
                      {step.completed && <Check className="h-3 w-3" />}
                    </button>
                    <span className={`text-sm ${step.completed ? "text-zinc-500 line-through" : "text-zinc-300"}`}>
                      {step.description}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add step */}
              {addingStepTo === fa.id ? (
                <div className="flex gap-2">
                  <input
                    value={newStepDesc} onChange={(e) => setNewStepDesc(e.target.value)}
                    placeholder="Paso concreto..."
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleAddStep(fa.id)}
                  />
                  <button onClick={() => handleAddStep(fa.id)} disabled={!newStepDesc.trim()} className="rounded-lg bg-zinc-800 px-2 py-1.5 text-zinc-400 hover:text-zinc-200">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setAddingStepTo(fa.id); setNewStepDesc(""); }} className="text-[10px] text-zinc-500 hover:text-violet-400 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Anadir paso
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add reflection */}
      <div className="flex items-center gap-3">
        {!showReflection ? (
          <button onClick={() => setShowReflection(true)} className="text-xs text-zinc-500 hover:text-violet-400 flex items-center gap-1.5 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Anadir reflexion libre
          </button>
        ) : (
          <div className="w-full space-y-2">
            <textarea
              value={reflectionText} onChange={(e) => setReflectionText(e.target.value)}
              placeholder="Que estas pensando o descubriendo..."
              rows={3}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowReflection(false); setReflectionText(""); }} className="text-xs text-zinc-500">Cancelar</button>
              <button onClick={handleAddReflection} disabled={!reflectionText.trim()} className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition-colors">
                <Send className="h-3 w-3" /> Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reflections list */}
      {project.reflections.filter((r) => r.phase === viewPhase).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Reflexiones</h3>
          {project.reflections.filter((r) => r.phase === viewPhase).map((r) => (
            <div key={r.id} className="rounded-xl bg-zinc-900/30 border border-zinc-800/50 p-3 space-y-1">
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.content}</p>
              {r.aiChallenge && (
                <p className="text-xs text-violet-400 italic mt-2">{r.aiChallenge}</p>
              )}
              <p className="text-[10px] text-zinc-600">{new Date(r.createdAt).toLocaleDateString("es-ES")}</p>
            </div>
          ))}
        </div>
      )}

      {/* Phase navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        {isReflectPhase && viewPhase === "reflect" ? (
          <button onClick={handleBackToFeel} className="flex items-center gap-2 text-xs text-rose-400 hover:text-rose-300 transition-colors">
            <Heart className="h-3.5 w-3.5" /> Volver a Sentir (nuevo ciclo)
          </button>
        ) : <div />}

        {canAdvance && (
          <button onClick={handleAdvancePhase} className="flex items-center gap-2 rounded-xl bg-violet-500/20 border border-violet-500/30 px-4 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/30 transition-colors">
            Avanzar a {PHASES[currentPhaseIdx + 1]?.label}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
