import type { ChatMessage } from "@/components/Chat";
import type { EmotionalProfile } from "@/types/emotional-profile";

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEFAULT_CONVERSATION_TITLE = "Nueva conversacion";

// ─── Types (shared between page.tsx and utils) ───────────────────────────────

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages: ChatMessage[];
  state: string;
  insight: string;
  action: string;
  alerts: string[];
  searchUsed: boolean;
  fallback: boolean;
  flow: {
    currentIntent: string;
    currentStep: number;
    activeFlow: string | null;
    instruction: string | null;
  } | null;
  hasLoadedMessages: boolean;
  isDraft: boolean;
  conversionTrigger: boolean;
  conversionType: string | null;
  journalMode: boolean;
};

export type ActiveGoal = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedCount: number;
  totalCount: number;
  progress: number;
  actions: GoalAction[];
};

export type GoalAction = {
  id: string;
  description: string;
  completed: boolean;
};

export type ConversationsApiResponse = {
  success?: boolean;
  emotionalProfile?: EmotionalProfile;
  conversations?: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
  }>;
  error?: string;
};

// ─── Pure helpers ────────────────────────────────────────────────────────────

export function buildStateInsight(state: string): {
  insight: string;
  action: string;
  alerts: string[];
} {
  if (state === "bloqueo") {
    return {
      insight: "Hay friccion para arrancar. Necesitas reducir el tamano del siguiente paso.",
      action: "Haz una microaccion de 10 minutos ahora mismo.",
      alerts: ["Riesgo de paralisis si no se ejecuta una primera accion hoy."],
    };
  }
  if (state === "ansiedad") {
    return {
      insight: "Tu energia esta dispersa. El foco debe volver a una sola prioridad.",
      action: "Define una prioridad unica y descarta tareas secundarias por hoy.",
      alerts: ["Evita multitarea. Puede aumentar el bloqueo."],
    };
  }
  if (state === "duda") {
    return {
      insight: "Hay incertidumbre real. Necesitas recortar opciones y elegir un foco.",
      action: "Reduce a dos opciones y decide una antes de terminar hoy.",
      alerts: ["Sin direccion clara, la ejecucion se vuelve inestable."],
    };
  }
  if (state === "claridad") {
    return {
      insight: "Ya hay direccion. Este es el momento de convertir claridad en evidencia.",
      action: "Entrega una prueba visible de avance hoy mismo.",
      alerts: [],
    };
  }
  return {
    insight: "Estado estable. Buen momento para mantener ritmo y consistencia.",
    action: "Continua con una accion concreta y medible.",
    alerts: [],
  };
}

export function trimTitle(input: string): string {
  const normalized = input.trim();
  if (!normalized) return DEFAULT_CONVERSATION_TITLE;
  return normalized.length > 48 ? `${normalized.slice(0, 48)}...` : normalized;
}

export function formatFlowLabel(flowName: string | null): string {
  if (flowName === "decision") return "decision";
  if (flowName === "avoidance") return "evitacion";
  return "sin flujo";
}

export function createDraftConversation(index: number): Conversation {
  const now = new Date().toISOString();
  const defaults = buildStateInsight("neutral");
  return {
    id: `draft_${Date.now()}_${index}`,
    title: DEFAULT_CONVERSATION_TITLE,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    messages: [],
    state: "neutral",
    insight: defaults.insight,
    action: defaults.action,
    alerts: defaults.alerts,
    searchUsed: false,
    fallback: false,
    flow: null,
    hasLoadedMessages: true,
    isDraft: true,
    conversionTrigger: false,
    conversionType: null,
    journalMode: false,
  };
}

export function getDominantState(conversations: Conversation[]): string {
  const counter = new Map<string, number>();
  for (const conversation of conversations) {
    counter.set(conversation.state, (counter.get(conversation.state) || 0) + 1);
  }
  let dominant = "neutral";
  let max = -1;
  for (const [state, count] of counter.entries()) {
    if (count > max) {
      max = count;
      dominant = state;
    }
  }
  return dominant;
}

export function mapApiConversationToLocal(
  apiConversation: NonNullable<ConversationsApiResponse["conversations"]>[number],
  existing?: Conversation,
): Conversation {
  const defaults = buildStateInsight(existing?.state || "neutral");
  return {
    id: apiConversation.id,
    title: apiConversation.title || DEFAULT_CONVERSATION_TITLE,
    createdAt: apiConversation.createdAt,
    updatedAt: apiConversation.updatedAt,
    messageCount: apiConversation.messageCount,
    messages: existing?.messages ?? [],
    state: existing?.state || "neutral",
    insight: existing?.insight || defaults.insight,
    action: existing?.action || defaults.action,
    alerts: existing?.alerts || defaults.alerts,
    searchUsed: existing?.searchUsed ?? false,
    fallback: existing?.fallback ?? false,
    flow: existing?.flow ?? null,
    hasLoadedMessages: existing?.hasLoadedMessages ?? false,
    isDraft: false,
    conversionTrigger: existing?.conversionTrigger ?? false,
    conversionType: existing?.conversionType ?? null,
    journalMode: existing?.journalMode ?? false,
  };
}

export function mergeConversations(
  previous: Conversation[],
  fromApi: NonNullable<ConversationsApiResponse["conversations"]>,
): Conversation[] {
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const drafts = previous.filter((item) => item.isDraft);
  const persisted = fromApi.map((item) =>
    mapApiConversationToLocal(item, previousById.get(item.id)),
  );
  return [...drafts, ...persisted];
}
