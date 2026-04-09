/**
 * Personal Project system types — Design for Change adapted.
 * Phases: SENTIR > IMAGINAR > ACTUAR > REFLEXIONAR (cyclical).
 */

export type ProjectPhase = "feel" | "imagine" | "act" | "reflect";
export type ProjectStatus = "active" | "paused" | "completed" | "abandoned";
export type PhaseEntryStatus = "pending" | "completed" | "skipped";
export type FocusAreaStatus = "active" | "completed" | "dropped";
export type ReflectionType = "free" | "prompted" | "milestone" | "phase_transition";
export type InsightType = "blind_spot" | "pattern" | "growth" | "avoidance" | "shift";

export const PROJECT_PHASES: readonly ProjectPhase[] = ["feel", "imagine", "act", "reflect"];

export const PHASE_LABELS: Record<ProjectPhase, string> = {
  feel: "Sentir",
  imagine: "Imaginar",
  act: "Actuar",
  reflect: "Reflexionar",
};

export const PHASE_DESCRIPTIONS: Record<ProjectPhase, string> = {
  feel: "Que esta pasando? Que te molesta? Que quieres cambiar?",
  imagine: "Que perspectivas no estas viendo? Como seria el exito?",
  act: "Cuales son tus focos de accion? Cual es tu primer paso?",
  reflect: "Que aprendiste? Que cambio en ti?",
};

// ─── Core prompts per phase (DFC methodology) ───────────────────────────────

export type PhasePrompt = {
  key: string;
  question: string;
  challengeHint: string; // guidance for the AI reflection
};

export const PHASE_PROMPTS: Record<ProjectPhase, PhasePrompt[]> = {
  feel: [
    {
      key: "feel_what_happening",
      question: "Describe lo que esta pasando en tu vida ahora mismo. No lo que deberia pasar — lo que realmente esta pasando.",
      challengeHint: "Busca lo que da por sentado. Si la respuesta es superficial, pregunta que hay debajo.",
    },
    {
      key: "feel_what_bothers",
      question: "Que es lo que mas te molesta de esta situacion? No lo obvio — lo que te molesta de verdad y quiza no le has dicho a nadie.",
      challengeHint: "Confronta si minimiza. Pregunta desde cuando lo arrastra.",
    },
    {
      key: "feel_what_normalized",
      question: "Que parte de esto has dejado de cuestionar? Que das por normal que quiza no deberia serlo?",
      challengeHint: "Esta es la pregunta clave de gafas nuevas. Si no identifica nada, sugiere areas donde la gente suele normalizar.",
    },
    {
      key: "feel_what_change",
      question: "Si pudieras cambiar una sola cosa de esto, cual seria? Y por que esa y no otra?",
      challengeHint: "Cuestiona la eleccion: es lo que realmente quiere cambiar o es lo mas comodo de nombrar?",
    },
  ],
  imagine: [
    {
      key: "imagine_perspectives",
      question: "Nombra 3 perspectivas que no estas considerando sobre esta situacion. Si solo ves una forma, estas perdiendo algo.",
      challengeHint: "Si da menos de 3 o son muy similares, empuja a pensar desde otros roles: que diria alguien que ya paso por esto?",
    },
    {
      key: "imagine_success",
      question: "Como se veria el exito real para ti? No el exito que otros esperan — el tuyo.",
      challengeHint: "Cuestiona si el exito que describe es propio o heredado. Pregunta: quien decidio que eso es exito?",
    },
    {
      key: "imagine_fear",
      question: "Que pasaria si hicieras lo que te da miedo? Describe el peor escenario realista, no el catastrofico.",
      challengeHint: "Ayuda a separar miedo real de miedo imaginado. Pregunta si el peor escenario ya lo ha vivido antes.",
    },
    {
      key: "imagine_pattern",
      question: "Ves un patron aqui? Esto se parece a algo que ya viviste antes?",
      challengeHint: "Conecta lo local con lo global. Si hay patron, nombra el ciclo sin juzgar.",
    },
    {
      key: "imagine_focus_areas",
      question: "Basandote en lo que descubriste, define tus focos de accion. No lo que crees que deberias hacer — lo que realmente necesitas abordar.",
      challengeHint: "Cuestiona cada foco: por que ese y no otro? Que estas evitando al elegir ese? Este prompt genera ProjectFocusArea.",
    },
  ],
  act: [
    {
      key: "act_priority",
      question: "De todos tus focos, cual es el que si avanza hoy cambia todo lo demas?",
      challengeHint: "Si no puede elegir, confronta: la indecision es una decision. Cual duele mas no hacer?",
    },
    {
      key: "act_resistance",
      question: "Que es lo que te frena de empezar ahora mismo? Se honesto.",
      challengeHint: "Busca excusas disfrazadas de razon. Pregunta: esto te frena o te protege de algo?",
    },
    {
      key: "act_minimum_viable",
      question: "Cual es la version minima de esto que puedes hacer en los proximos 30 minutos?",
      challengeHint: "No dejes que planifique sin actuar. La version minima debe ser ejecutable HOY.",
    },
    {
      key: "act_evidence",
      question: "Que evidencia concreta tendras manana de que avanzaste hoy?",
      challengeHint: "Obliga a definir algo medible. Sentir que avanzo no cuenta.",
    },
  ],
  reflect: [
    {
      key: "reflect_learned",
      question: "Que aprendiste que no sabias cuando empezaste este proyecto?",
      challengeHint: "Si dice nada o poco, pregunta que le sorprendio de si mismo.",
    },
    {
      key: "reflect_shifted",
      question: "Que cambio en ti? No en la situacion — en ti.",
      challengeHint: "Diferencia entre cambio externo y cambio interno. El interno es el que dura.",
    },
    {
      key: "reflect_blind_spots",
      question: "Que puntos ciegos descubriste? Que dabas por hecho que resulto no ser verdad?",
      challengeHint: "Conecta con lo que dijo en SENTIR fase feel_what_normalized. Ha cambiado esa vision?",
    },
    {
      key: "reflect_next",
      question: "Esto que descubriste, como cambia lo que viene? Que haces diferente ahora?",
      challengeHint: "Si descubre algo nuevo, sugiere volver a SENTIR con esa perspectiva. El ciclo es continuo.",
    },
  ],
};

// ─── Coach context type ──────────────────────────────────────────────────────

export type ProjectCoachContext = {
  activeProject: string;
  currentPhase: ProjectPhase;
  focusAreas: string[];
  completedSteps: number;
  totalSteps: number;
  lastReflection: { content: string; phase: string } | null;
  pendingInsights: number;
  daysActive: number;
};

// ─── Progress summary ────────────────────────────────────────────────────────

export type ProjectProgressSummary = {
  projectId: string;
  title: string;
  phase: ProjectPhase;
  status: ProjectStatus;
  focusAreaCount: number;
  completedSteps: number;
  totalSteps: number;
  reflectionCount: number;
  insightCount: number;
  unacknowledgedInsights: number;
  daysActive: number;
};
