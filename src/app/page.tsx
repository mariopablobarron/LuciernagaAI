"use client";

import { useEffect, useMemo, useState } from "react";
import Chat, { type ChatMessage } from "@/components/Chat";
import InsightsPanel from "@/components/InsightsPanel";
import Sidebar, { type SidebarConversation } from "@/components/Sidebar";
import { DEFAULT_EMOTIONAL_PROFILE, type EmotionalProfile } from "@/types/emotional-profile";

type Conversation = {
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
  flow: FlowSignal | null;
  hasLoadedMessages: boolean;
  isDraft: boolean;
};

type GoalAction = {
  id: string;
  description: string;
  completed: boolean;
  createdAt: string;
};

type ActiveGoal = {
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

type ActionLockState = {
  message: string;
  action: {
    id: string;
    title: string;
  };
};

type FlowSignal = {
  currentIntent: string;
  currentStep: number;
  activeFlow: string | null;
  instruction: string | null;
};

type ChatApiResponse = {
  type?: "action_required";
  message?: string;
  success?: boolean;
  response?: string;
  state?: string;
  emotionalProfile?: EmotionalProfile;
  insight?: string;
  persistenceAvailable?: boolean;
  action?:
    | string
    | {
        id: string;
        title: string;
      };
  alerts?: string[];
  searchUsed?: boolean;
  fallback?: boolean;
  error?: string;
  conversationId?: string;
  goal?: ActiveGoal | null;
  flow?: FlowSignal | null;
};

type ConversationsApiResponse = {
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

type MessagesApiResponse = {
  success?: boolean;
  conversationId?: string;
  messages?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
  error?: string;
};

type GoalApiResponse = {
  success?: boolean;
  goal?: ActiveGoal | null;
  error?: string;
};

type AdminLoginStatusResponse = {
  authenticated?: boolean;
};

type SessionBootstrapResponse = {
  ok?: boolean;
  userId?: string;
  source?: string;
  error?: string;
};

type CheckinApiResponse = {
  ok?: boolean;
  state?: string;
  emotionalProfile?: EmotionalProfile;
  checkinsToday?: number;
  error?: string;
};

const DEFAULT_CONVERSATION_TITLE = "Nueva conversación";

function buildStateInsight(state: string): {
  insight: string;
  action: string;
  alerts: string[];
} {
  if (state === "bloqueo") {
    return {
      insight: "Hay fricción para arrancar. Necesitas reducir el tamaño del siguiente paso.",
      action: "Haz una microacción de 10 minutos ahora mismo.",
      alerts: ["Riesgo de parálisis si no se ejecuta una primera acción hoy."],
    };
  }

  if (state === "ansiedad") {
    return {
      insight: "Tu energía está dispersa. El foco debe volver a una sola prioridad.",
      action: "Define una prioridad única y descarta tareas secundarias por hoy.",
      alerts: ["Evita multitarea. Puede aumentar el bloqueo."],
    };
  }

  if (state === "duda") {
    return {
      insight: "Hay incertidumbre real. Necesitas recortar opciones y elegir un foco.",
      action: "Reduce a dos opciones y decide una antes de terminar hoy.",
      alerts: ["Sin dirección clara, la ejecución se vuelve inestable."],
    };
  }

  if (state === "claridad") {
    return {
      insight: "Ya hay dirección. Este es el momento de convertir claridad en evidencia.",
      action: "Entrega una prueba visible de avance hoy mismo.",
      alerts: [],
    };
  }

  return {
    insight: "Estado estable. Buen momento para mantener ritmo y consistencia.",
    action: "Continúa con una acción concreta y medible.",
    alerts: [],
  };
}

function trimTitle(input: string): string {
  const normalized = input.trim();
  if (!normalized) {
    return DEFAULT_CONVERSATION_TITLE;
  }
  return normalized.length > 48 ? `${normalized.slice(0, 48)}...` : normalized;
}

function formatIntentLabel(intent: string): string {
  if (intent === "goal_creation") return "crear objetivo";
  if (intent === "action_done") return "acción completada";
  if (intent === "postpone") return "postergar";
  if (intent === "refusal") return "rechazo";
  if (intent === "problem") return "problema";
  if (intent === "doubt") return "duda";
  return intent || "sin clasificar";
}

function formatFlowLabel(flowName: string | null): string {
  if (flowName === "decision") return "decisión";
  if (flowName === "avoidance") return "evitación";
  return "sin flujo";
}

function createDraftConversation(index: number): Conversation {
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
  };
}

function getDominantState(conversations: Conversation[]): string {
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

function mapApiConversationToLocal(
  apiConversation: NonNullable<ConversationsApiResponse["conversations"]>[number],
  existing?: Conversation
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
  };
}

function mergeConversations(
  previous: Conversation[],
  fromApi: NonNullable<ConversationsApiResponse["conversations"]>
): Conversation[] {
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const drafts = previous.filter((item) => item.isDraft);
  const persisted = fromApi.map((item) =>
    mapApiConversationToLocal(item, previousById.get(item.id))
  );
  return [...drafts, ...persisted];
}

export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGoal, setActiveGoal] = useState<ActiveGoal | null>(null);
  const [actionLock, setActionLock] = useState<ActionLockState | null>(null);
  const [emotionalProfile, setEmotionalProfile] =
    useState<EmotionalProfile>(DEFAULT_EMOTIONAL_PROFILE);
  const [goalLoading, setGoalLoading] = useState(false);
  const [checkinInput, setCheckinInput] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState<{
    message: string;
    checkinsToday: number;
    state: string;
    savedAt: string;
  } | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  const handleUnauthorizedSession = () => {
    setSessionReady(false);
    setError("Sesión inválida o expirada. Recarga la página para continuar.");
  };

  const bootstrapSession = async (): Promise<void> => {
    const response = await fetch("/api/auth/bootstrap", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<SessionBootstrapResponse>;

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "No se pudo iniciar la sesión.");
    }

    setSessionReady(true);
    setError(null);
  };

  const activeConversation = useMemo(() => {
    if (activeConversationId) {
      return conversations.find((conversation) => conversation.id === activeConversationId);
    }
    return conversations[0];
  }, [activeConversationId, conversations]);

  const safeConversation: Conversation = useMemo(() => {
    if (activeConversation) {
      return activeConversation;
    }
    return createDraftConversation(0);
  }, [activeConversation]);

  const sidebarConversations: SidebarConversation[] = useMemo(() => {
    return conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messageCount,
    }));
  }, [conversations]);

  const progress = useMemo(() => {
    const completedActions =
      activeGoal?.actions.filter((action) => action.completed).length ??
      conversations.reduce((accumulator, conversation) => {
        return conversation.messageCount > 0 ? accumulator + 1 : accumulator;
      }, 0);
    const totalActions = activeGoal?.actions.length ?? Math.max(conversations.length, 1);

    return {
      completedActions,
      totalActions: Math.max(totalActions, 1),
      dominantState: getDominantState(conversations),
    };
  }, [activeGoal, conversations]);

  const pendingActionsCount = useMemo(() => {
    if (!activeGoal) {
      return 0;
    }

    return activeGoal.actions.filter((action) => !action.completed).length;
  }, [activeGoal]);

  const pendingGoalAction = useMemo(() => {
    return activeGoal?.actions.find((goalAction) => !goalAction.completed) ?? null;
  }, [activeGoal]);

  const effectiveActionLock = useMemo(() => {
    if (actionLock) {
      return actionLock;
    }

    if (!pendingGoalAction || safeConversation.state === "ansiedad") {
      return null;
    }

    return {
      message: "Tienes una acción pendiente antes de continuar.",
      action: {
        id: pendingGoalAction.id,
        title: pendingGoalAction.description,
      },
    };
  }, [actionLock, pendingGoalAction, safeConversation.state]);

  const loadMessages = async (conversationId: string): Promise<void> => {
    const response = await fetch(
      `/api/messages?conversationId=${encodeURIComponent(conversationId)}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    const payload = (await response.json().catch(() => ({}))) as Partial<MessagesApiResponse>;

    if (response.status === 401) {
      handleUnauthorizedSession();
      throw new Error("Sesión inválida o expirada");
    }

    if (!response.ok) {
      throw new Error(payload.error || "No se pudieron cargar los mensajes.");
    }

    const nextMessages: ChatMessage[] = (payload.messages || []).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    }));

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: nextMessages,
              messageCount: nextMessages.length,
              hasLoadedMessages: true,
            }
          : conversation
      )
    );
  };

  const refreshConversations = async (preferredConversationId?: string): Promise<string | null> => {
    const response = await fetch("/api/conversations", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<ConversationsApiResponse>;

    if (response.status === 401) {
      handleUnauthorizedSession();
      throw new Error("Sesión inválida o expirada");
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "No se pudieron cargar las conversaciones.");
    }

    if (payload.emotionalProfile) {
      setEmotionalProfile(payload.emotionalProfile);
    }

    const apiConversations = payload.conversations || [];
    let mergedResult: Conversation[] = [];
    setConversations((previous) => {
      mergedResult = mergeConversations(previous, apiConversations);
      return mergedResult;
    });

    const nextActiveConversationId = (() => {
      if (
        preferredConversationId &&
        mergedResult.some((conversation) => conversation.id === preferredConversationId)
      ) {
        return preferredConversationId;
      }

      if (
        activeConversationId &&
        mergedResult.some((conversation) => conversation.id === activeConversationId)
      ) {
        return activeConversationId;
      }

      return mergedResult[0]?.id ?? null;
    })();

    setActiveConversationId(nextActiveConversationId);
    return nextActiveConversationId;
  };

  const refreshActiveGoal = async (): Promise<void> => {
    const response = await fetch("/api/goals", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<GoalApiResponse>;

    if (response.status === 401) {
      handleUnauthorizedSession();
      throw new Error("Sesión inválida o expirada");
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "No se pudo cargar el objetivo activo.");
    }

    const nextGoal = payload.goal || null;
    setActiveGoal(nextGoal);
    setActionLock((previous) => {
      if (!previous || !nextGoal) {
        return nextGoal ? previous : null;
      }

      const nextPending = nextGoal.actions.find((goalAction) => !goalAction.completed);
      if (!nextPending) {
        return null;
      }

      return {
        ...previous,
        action: {
          id: nextPending.id,
          title: nextPending.description,
        },
      };
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function initializeConversations() {
      let bootstrapOk = false;
      try {
        setSessionLoading(true);
        await bootstrapSession();
        bootstrapOk = true;

        const nextActive = await refreshConversations();
        if (!cancelled && nextActive) {
          await loadMessages(nextActive);
        }
        if (!cancelled) {
          await refreshActiveGoal();
        }
      } catch {
        if (!cancelled) {
          const draft = createDraftConversation(1);
          setConversations([draft]);
          setActiveConversationId(draft.id);
          if (!bootstrapOk) {
            setError("No se pudo iniciar sesión. Intenta recargar la página.");
          }
        }
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
      }
    }

    void initializeConversations();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminSession() {
      setAdminLoading(true);
      try {
        const response = await fetch("/api/admin/login", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setAdminAuthenticated(false);
          }
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as AdminLoginStatusResponse;

        if (!cancelled) {
          setAdminAuthenticated(Boolean(payload.authenticated));
        }
      } catch {
        if (!cancelled) {
          setAdminAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setAdminLoading(false);
        }
      }
    }

    void checkAdminSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNewConversation = () => {
    const next = createDraftConversation(conversations.length + 1);
    setConversations((previous) => [next, ...previous]);
    setActiveConversationId(next.id);
    setInput("");
    setError(null);
  };

  const handleSelectConversation = (conversationId: string) => {
    if (!sessionReady) {
      setError("Necesitas una sesión válida para abrir conversaciones.");
      return;
    }

    setActiveConversationId(conversationId);
    setInput("");
    setError(null);

    const selected = conversations.find((conversation) => conversation.id === conversationId);
    if (selected && !selected.isDraft && !selected.hasLoadedMessages) {
      void loadMessages(conversationId).catch(() => {
        setError("No se pudieron cargar los mensajes de la conversación.");
      });
    }
  };

  const handleAdminLogout = async () => {
    setAdminLoading(true);
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setAdminAuthenticated(false);
      setAdminLoading(false);
    }
  };

  const handleToggleAction = async (actionId: string, completed: boolean) => {
    if (!sessionReady) {
      handleUnauthorizedSession();
      return;
    }

    setGoalLoading(true);
    try {
      const response = await fetch("/api/actions", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionId, completed }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<GoalApiResponse>;

      if (response.status === 401) {
        handleUnauthorizedSession();
        return;
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "No se pudo actualizar la acción.");
      }

      const nextGoal = payload.goal || null;
      setActiveGoal(nextGoal);
      setActionLock((previous) => {
        if (!previous || !nextGoal) {
          return nextGoal ? previous : null;
        }

        const nextPending = nextGoal.actions.find((goalAction) => !goalAction.completed);
        if (!nextPending) {
          return null;
        }

        return {
          ...previous,
          action: {
            id: nextPending.id,
            title: nextPending.description,
          },
        };
      });
    } catch (toggleError: unknown) {
      const message =
        toggleError instanceof Error ? toggleError.message : "No se pudo actualizar la acción.";
      setError(message);
    } finally {
      setGoalLoading(false);
    }
  };

  const handleCheckinSubmit = async () => {
    const responseText = checkinInput.trim();
    if (!responseText || checkinLoading) {
      return;
    }

    if (!sessionReady) {
      try {
        await bootstrapSession();
      } catch {
        handleUnauthorizedSession();
        return;
      }
    }

    setCheckinLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ response: responseText }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<CheckinApiResponse>;

      if (response.status === 401) {
        handleUnauthorizedSession();
        return;
      }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "No se pudo guardar el check-in.");
      }

      const nextState = payload.state || safeConversation.state;
      const fallbackInsight = buildStateInsight(nextState);
      const seededConversation =
        conversations.length === 0 ? createDraftConversation(1) : null;

      if (payload.emotionalProfile) {
        setEmotionalProfile(payload.emotionalProfile);
      }

      setConversations((previous) => {
        if (previous.length === 0 && seededConversation) {
          return [
            {
              ...seededConversation,
              state: nextState,
              insight: fallbackInsight.insight,
              action: fallbackInsight.action,
              alerts: fallbackInsight.alerts,
            },
          ];
        }

        return previous.map((conversation) =>
          conversation.id === safeConversation.id
            ? {
                ...conversation,
                state: nextState,
                insight: fallbackInsight.insight,
                action: fallbackInsight.action,
                alerts: fallbackInsight.alerts,
              }
            : conversation
        );
      });
      if (seededConversation) {
        setActiveConversationId(seededConversation.id);
      }

      setCheckinStatus({
        message: "Check-in guardado y estado actualizado.",
        checkinsToday: payload.checkinsToday ?? 1,
        state: nextState,
        savedAt: new Date().toISOString(),
      });
      setCheckinInput("");
    } catch (submitError: unknown) {
      const message =
        submitError instanceof Error ? submitError.message : "No se pudo guardar el check-in.";
      setError(message);
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    if (!sessionReady) {
      try {
        await bootstrapSession();
      } catch {
        handleUnauthorizedSession();
        return;
      }
    }

    if (!trimmed || loading) {
      return;
    }

    let resolvedConversation = activeConversation;
    if (!resolvedConversation) {
      const draft = createDraftConversation(conversations.length + 1);
      setConversations((previous) => [draft, ...previous]);
      setActiveConversationId(draft.id);
      resolvedConversation = draft;
    }

    const currentConversationId = resolvedConversation.id;
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setInput("");
    setError(null);
    setLoading(true);

    console.info("[CHAT_UI] send_started", {
      conversationId: currentConversationId,
      isDraft: resolvedConversation.isDraft,
      length: trimmed.length,
    });

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === currentConversationId
          ? {
              ...conversation,
              title:
                conversation.messageCount === 0
                  ? trimTitle(trimmed)
                  : conversation.title || DEFAULT_CONVERSATION_TITLE,
              updatedAt: new Date().toISOString(),
              messageCount: conversation.messageCount + 1,
              messages: [...conversation.messages, userMessage],
            }
          : conversation
      )
    );

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          conversationId: resolvedConversation.isDraft ? undefined : currentConversationId,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<ChatApiResponse>;

      if (response.status === 401) {
        handleUnauthorizedSession();
        const assistantUnauthorized: ChatMessage = {
          id: `assistant_401_${Date.now()}`,
          role: "assistant",
          content: "Tu sesión expiró. Recarga la página para continuar.",
          isError: true,
        };
        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === currentConversationId
              ? {
                  ...conversation,
                  updatedAt: new Date().toISOString(),
                  messageCount: conversation.messageCount + 1,
                  messages: [...conversation.messages, assistantUnauthorized],
                }
              : conversation
          )
        );
        return;
      }

      if (!response.ok) {
        const message = payload.error || payload.response || `Error ${response.status}`;
        console.error("[CHAT_UI] send_failed", {
          status: response.status,
          message,
        });
        const assistantError: ChatMessage = {
          id: `assistant_error_${Date.now()}`,
          role: "assistant",
          content: message,
          isError: true,
        };
        setError(message);
        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === currentConversationId
              ? {
                  ...conversation,
                  updatedAt: new Date().toISOString(),
                  messageCount: conversation.messageCount + 1,
                  messages: [...conversation.messages, assistantError],
                }
              : conversation
          )
        );
        return;
      }

      const assistantText =
        payload.message?.trim() ||
        payload.response?.trim() ||
        "No pude generar una respuesta en este momento.";
      const nextState = payload.state || "neutral";
      const persistenceAvailable = payload.persistenceAvailable !== false;
      const nextActionLock =
        payload.type === "action_required" &&
        payload.action &&
        typeof payload.action !== "string"
          ? {
              message: assistantText,
              action: payload.action,
            }
          : null;
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: assistantText,
        variant: nextActionLock ? "action_required" : undefined,
        meta: {
          searchUsed: Boolean(payload.searchUsed),
          fallback: Boolean(payload.fallback),
        },
      };

      const fallbackInsight = buildStateInsight(nextState);
      const nextInsight = payload.insight || fallbackInsight.insight;
      const nextAction =
        typeof payload.action === "string" ? payload.action : fallbackInsight.action;
      const nextAlerts =
        Array.isArray(payload.alerts) && payload.alerts.length > 0
          ? payload.alerts
          : fallbackInsight.alerts;
      const resolvedConversationId = persistenceAvailable
        ? payload.conversationId || currentConversationId
        : currentConversationId;
      const nextGoal = payload.goal ?? null;
      const nextEmotionalProfile = payload.emotionalProfile ?? emotionalProfile;
      const nextFlow = payload.flow ?? null;

      console.info("[CHAT_UI] send_succeeded", {
        type: payload.type || "normal",
        persistenceAvailable,
        returnedConversationId: payload.conversationId || null,
        localConversationId: resolvedConversationId,
      });

      setConversations((previous) => {
        const next = previous.map((conversation) =>
          conversation.id === currentConversationId
            ? {
                ...conversation,
                id: resolvedConversationId,
                isDraft: persistenceAvailable ? false : conversation.isDraft,
                hasLoadedMessages: persistenceAvailable ? true : conversation.hasLoadedMessages,
                updatedAt: new Date().toISOString(),
                state: nextState,
                insight: nextInsight,
                action: nextAction,
                alerts: nextAlerts,
                searchUsed: Boolean(payload.searchUsed),
                fallback: Boolean(payload.fallback),
                flow: nextFlow,
                messageCount: conversation.messageCount + 1,
                messages: [...conversation.messages, assistantMessage],
              }
            : conversation
        );

        const dedupById = new Map<string, Conversation>();
        for (const item of next) {
          if (!dedupById.has(item.id)) {
            dedupById.set(item.id, item);
          }
        }
        return Array.from(dedupById.values());
      });
      setEmotionalProfile(nextEmotionalProfile);
      setActionLock(nextActionLock);

      if (resolvedConversationId !== currentConversationId) {
        setActiveConversationId(resolvedConversationId);
      }

      if (nextGoal) {
        setActiveGoal(nextGoal);
        if (!nextActionLock && !nextGoal.actions.some((goalAction) => !goalAction.completed)) {
          setActionLock(null);
        }
      } else {
        setActionLock(null);
      }

      try {
        if (persistenceAvailable) {
          await refreshConversations(resolvedConversationId);
          await loadMessages(resolvedConversationId);
          if (!nextGoal) {
            await refreshActiveGoal();
          }
        } else {
          setError(
            "La respuesta llegó, pero no se pudo guardar en base de datos. Revisa los logs del servidor."
          );
          console.warn("[CHAT_UI] persistence_unavailable", {
            conversationId: currentConversationId,
            payloadConversationId: payload.conversationId || null,
          });
        }
      } catch {
        console.error("[CHAT_UI] refresh_failed_after_send", {
          conversationId: resolvedConversationId,
          persistenceAvailable,
        });
        // La UI ya tiene estado local optimista; ignoramos refresco fallido.
      }
    } catch (requestError: unknown) {
      const fallbackMessage =
        requestError instanceof Error && requestError.message
          ? requestError.message
          : "No se pudo conectar con el servidor.";
      console.error("[CHAT_UI] network_error", {
        message: fallbackMessage,
      });
      const assistantError: ChatMessage = {
        id: `assistant_network_${Date.now()}`,
        role: "assistant",
        content: fallbackMessage,
        isError: true,
      };
      setError(fallbackMessage);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === currentConversationId
            ? {
                ...conversation,
                updatedAt: new Date().toISOString(),
                messageCount: conversation.messageCount + 1,
                messages: [...conversation.messages, assistantError],
              }
            : conversation
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto h-full max-w-[1700px] p-4 lg:p-6">
        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Continuidad de sesión
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <span>
                Objetivo activo:{" "}
                <span className="font-semibold">{activeGoal?.title || "Sin objetivo"}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span>
                Progreso:{" "}
                <span className="font-semibold">
                  {progress.completedActions}/{progress.totalActions}
                </span>
              </span>
              {pendingActionsCount > 0 ? (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                  {pendingActionsCount === 1
                    ? "Tienes 1 acción pendiente"
                    : `Tienes ${pendingActionsCount} acciones pendientes`}
                </span>
              ) : (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  Sin acciones pendientes
                </span>
              )}
              {effectiveActionLock ? (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                  Modo responsabilidad activo
                </span>
              ) : null}
              {safeConversation.searchUsed ? (
                <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                  Internet usado
                </span>
              ) : null}
              {safeConversation.fallback ? (
                <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                  Fallback IA activo
                </span>
              ) : null}
              {safeConversation.flow?.activeFlow ? (
                <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                  Flujo {formatFlowLabel(safeConversation.flow.activeFlow)} · paso{" "}
                  {safeConversation.flow.currentStep}
                </span>
              ) : null}
            </div>
            {safeConversation.flow?.activeFlow ? (
              <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-sm text-violet-950">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                  Coach empujando flujo activo
                </p>
                <p className="mt-1 font-semibold">
                  {formatFlowLabel(safeConversation.flow.activeFlow)} · intent{" "}
                  {formatIntentLabel(safeConversation.flow.currentIntent)}
                </p>
                {safeConversation.flow.instruction ? (
                  <p className="mt-1 text-violet-900">{safeConversation.flow.instruction}</p>
                ) : null}
              </div>
            ) : null}
            {effectiveActionLock ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                  Acción pendiente prioritaria
                </p>
                <p className="mt-1 font-semibold">{effectiveActionLock.action.title}</p>
                <p className="mt-1 text-amber-900">{effectiveActionLock.message}</p>
              </div>
            ) : pendingGoalAction ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Siguiente acción sugerida
                </p>
                <p className="mt-1 font-medium text-slate-900">{pendingGoalAction.description}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Check-in diario
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Registra cómo llegas hoy aunque no quieras abrir otra conversación.
                </p>
              </div>
              {checkinStatus ? (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  {checkinStatus.checkinsToday} hoy
                </span>
              ) : null}
            </div>
            <textarea
              value={checkinInput}
              onChange={(event) => setCheckinInput(event.target.value)}
              rows={3}
              disabled={checkinLoading}
              placeholder="Ejemplo: Hoy estoy bloqueado y me cuesta arrancar."
              className="mt-3 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-700 focus:bg-white disabled:opacity-60"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {checkinStatus ? (
                  <span>
                    Último guardado: {new Date(checkinStatus.savedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · estado {checkinStatus.state}
                  </span>
                ) : (
                  <span>Sin check-in registrado en esta sesión.</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleCheckinSubmit()}
                disabled={checkinLoading || !checkinInput.trim()}
                className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkinLoading ? "Guardando..." : "Guardar check-in"}
              </button>
            </div>
            {checkinStatus ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                {checkinStatus.message}
              </div>
            ) : null}
          </section>
        </div>

        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="min-h-[280px] lg:col-span-3 lg:min-h-0">
            <Sidebar
              conversations={sidebarConversations}
              activeConversationId={activeConversationId || safeConversation.id}
              progress={progress}
              activeGoal={activeGoal}
              actionLock={
                effectiveActionLock
                  ? {
                      message: effectiveActionLock.message,
                      actionTitle: effectiveActionLock.action.title,
                    }
                  : null
              }
              profile={{ name: "Startidea", plan: "Plan Pro" }}
              adminAuthenticated={adminAuthenticated}
              adminLoading={adminLoading}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onAdminLogout={handleAdminLogout}
            />
          </div>

          <div className="min-h-[460px] lg:col-span-6 lg:min-h-0">
            <Chat
              title={safeConversation.title}
              messages={safeConversation.messages}
              input={input}
              loading={loading || sessionLoading}
              error={error}
              responseSignals={{
                searchUsed: safeConversation.searchUsed,
                fallback: safeConversation.fallback,
                flow: safeConversation.flow,
              }}
              actionLock={
                effectiveActionLock
                  ? {
                      message: effectiveActionLock.message,
                      actionTitle: effectiveActionLock.action.title,
                    }
                  : null
              }
              onInputChange={setInput}
              onSend={handleSend}
            />
          </div>

          <div className="min-h-[280px] lg:col-span-3 lg:min-h-0">
            <InsightsPanel
              state={safeConversation.state}
              emotionalProfile={emotionalProfile}
              insight={safeConversation.insight}
              action={safeConversation.action}
              responseSignals={{
                searchUsed: safeConversation.searchUsed,
                fallback: safeConversation.fallback,
                flow: safeConversation.flow,
              }}
              actionLock={
                effectiveActionLock
                  ? {
                      message: effectiveActionLock.message,
                      actionTitle: effectiveActionLock.action.title,
                    }
                  : null
              }
              alerts={safeConversation.alerts}
              goal={activeGoal}
              goalLoading={goalLoading}
              onToggleAction={handleToggleAction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
