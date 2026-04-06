import type { Intent } from "@/services/intent";

export type DialogueState = {
  currentIntent: Intent;
  currentStep: number;
  activeFlow: string | null;
};

export type FlowContext = DialogueState & {
  instruction: string | null;
};

type FlowStep = {
  step: number;
  instruction: string;
};

type FlowDefinition = {
  name: "decision" | "avoidance";
  steps: FlowStep[];
};

const FLOW_DEFINITIONS: Record<FlowDefinition["name"], FlowDefinition> = {
  decision: {
    name: "decision",
    steps: [
      { step: 1, instruction: "Aclara el problema central en una frase concreta." },
      {
        step: 2,
        instruction: "Define opciones reales y limita la conversación a alternativas accionables.",
      },
      {
        step: 3,
        instruction: "Fuerza una decisión explícita entre opciones, sin dejar salida ambigua.",
      },
      {
        step: 4,
        instruction: "Convierte la decisión en una acción específica para hoy con evidencia.",
      },
    ],
  },
  avoidance: {
    name: "avoidance",
    steps: [
      { step: 1, instruction: "Señala la evitación con claridad, sin rodeos." },
      { step: 2, instruction: "Confronta la incoherencia entre lo que dice y lo que hace." },
      { step: 3, instruction: "Exige compromiso explícito hoy con un paso verificable." },
    ],
  },
};

const DEFAULT_DIALOGUE_STATE: DialogueState = {
  currentIntent: "clarification",
  currentStep: 0,
  activeFlow: null,
};

// In-memory cache — hydrated from DB on first load, written back on save
const DIALOGUE_STATE_CACHE = new Map<string, DialogueState>();

function getFlowNameByIntent(intent: Intent): FlowDefinition["name"] | null {
  if (intent === "problem" || intent === "doubt" || intent === "goal_creation") {
    return "decision";
  }

  if (intent === "postpone" || intent === "refusal") {
    return "avoidance";
  }

  return null;
}

function getStepInstruction(flowName: FlowDefinition["name"], step: number): string | null {
  const flow = FLOW_DEFINITIONS[flowName];
  const flowStep = flow.steps.find((item) => item.step === step);
  return flowStep?.instruction ?? null;
}

export function loadDialogueState(userId: string): DialogueState {
  return DIALOGUE_STATE_CACHE.get(userId) ?? { ...DEFAULT_DIALOGUE_STATE };
}

export function saveDialogueState(userId: string, state: DialogueState): void {
  DIALOGUE_STATE_CACHE.set(userId, state);
}

/** Hydrate cache from DB — call once at the start of each request */
export async function hydrateDialogueState(userId: string): Promise<DialogueState> {
  const cached = DIALOGUE_STATE_CACHE.get(userId);
  if (cached) return cached;

  try {
    const { getPrismaClient } = await import("@/db/prisma");
    const prisma = getPrismaClient();
    const record = await prisma.userState.findUnique({
      where: { userId },
      select: { dialogueIntent: true, dialogueStep: true, dialogueFlow: true },
    });

    if (record) {
      const state: DialogueState = {
        currentIntent: record.dialogueIntent as DialogueState["currentIntent"],
        currentStep: record.dialogueStep,
        activeFlow: record.dialogueFlow as DialogueState["activeFlow"],
      };
      DIALOGUE_STATE_CACHE.set(userId, state);
      return state;
    }
  } catch {
    // Fall through to default
  }

  return { ...DEFAULT_DIALOGUE_STATE };
}

/** Persist dialogue state to DB — fire-and-forget after saving to cache */
export async function persistDialogueState(userId: string, state: DialogueState): Promise<void> {
  DIALOGUE_STATE_CACHE.set(userId, state);

  try {
    const { getPrismaClient } = await import("@/db/prisma");
    const prisma = getPrismaClient();
    await prisma.userState.updateMany({
      where: { userId },
      data: {
        dialogueIntent: state.currentIntent,
        dialogueStep: state.currentStep,
        dialogueFlow: state.activeFlow ?? null,
      },
    });
  } catch {
    // Silently fail — cache still valid for this request lifecycle
  }
}

export function runFlow(state: DialogueState, message: string): FlowContext {
  const nextState: DialogueState = {
    currentIntent: state.currentIntent,
    currentStep: state.currentStep,
    activeFlow: state.activeFlow,
  };

  if (!message.trim()) {
    return {
      ...nextState,
      instruction: null,
    };
  }

  if (nextState.currentIntent === "action_done") {
    nextState.activeFlow = null;
    nextState.currentStep = 0;
    return {
      ...nextState,
      instruction: "Reconoce el avance y define la siguiente acción para mantener momentum.",
    };
  }

  if (nextState.activeFlow) {
    const activeDefinition = FLOW_DEFINITIONS[nextState.activeFlow as FlowDefinition["name"]];
    const maxStep = activeDefinition.steps.length;
    const nextStep = nextState.currentStep > 0 ? Math.min(nextState.currentStep + 1, maxStep) : 1;

    nextState.currentStep = nextStep;
    return {
      ...nextState,
      instruction: getStepInstruction(activeDefinition.name, nextStep),
    };
  }

  const flowName = getFlowNameByIntent(nextState.currentIntent);
  if (!flowName) {
    nextState.activeFlow = null;
    nextState.currentStep = 0;
    return {
      ...nextState,
      instruction: null,
    };
  }

  nextState.activeFlow = flowName;
  nextState.currentStep = 1;

  return {
    ...nextState,
    instruction: getStepInstruction(flowName, 1),
  };
}
