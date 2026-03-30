"use client";

import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Chat, { type ChatMessage } from "@/components/Chat";
import InsightsPanel from "@/components/InsightsPanel";
import Sidebar, { type SidebarConversation } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT_DISCLAIMERS } from "@/lib/legal";
import {
  bootstrapBrowserSession,
  captureBrowserEmail,
  fetchBrowserSession,
  type BrowserSessionUser,
} from "@/lib/session-client";
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
  type?: "action_required" | "crisis";
  message?: string;
  success?: boolean;
  response?: string;
  state?: string;
  code?: string;
  mentorMode?: string;
  transformationPhase?: string;
  captureEmail?: boolean;
  captureEmailMessage?: string | null;
  legalFlag?: boolean;
  legalDisclaimer?: string;
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
  continueChat?: boolean;
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
  const [sessionProfile, setSessionProfile] = useState<BrowserSessionUser | null>(null);
  const [saveProgressEmail, setSaveProgressEmail] = useState("");
  const [saveProgressLoading, setSaveProgressLoading] = useState(false);
  const [saveProgressStatus, setSaveProgressStatus] = useState<string | null>(null);
  const [captureEmailRecommended, setCaptureEmailRecommended] = useState(false);
  const [captureEmailPrompt, setCaptureEmailPrompt] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  const handleUnauthorizedSession = () => {
    setSessionReady(false);
    setSessionProfile(null);
    setCaptureEmailRecommended(false);
    setCaptureEmailPrompt(null);
    setError("Sesión inválida o expirada. Recarga la página para continuar.");
  };

  const refreshSessionProfile = async (): Promise<BrowserSessionUser | null> => {
    const session = await fetchBrowserSession();
    const nextProfile = session.user ?? null;

    setSessionProfile(nextProfile);
    if (nextProfile && !nextProfile.isAnonymous) {
      setCaptureEmailRecommended(false);
      setCaptureEmailPrompt(null);
    }
    setSaveProgressEmail((previous) => {
      if (nextProfile && !nextProfile.isAnonymous) {
        return nextProfile.email;
      }

      return previous;
    });

    return nextProfile;
  };

  const bootstrapSession = async (): Promise<void> => {
    await bootstrapBrowserSession();
    await refreshSessionProfile();

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

  const sidebarProfile = useMemo(() => {
    const displayName =
      sessionProfile?.name ||
      (sessionProfile && !sessionProfile.isAnonymous ? sessionProfile.email : "") ||
      "Sesión anónima";

    return {
      name: displayName,
      plan: sessionProfile?.planLabel
        ? `Plan ${sessionProfile.planLabel}`
        : "Plan Free",
    };
  }, [sessionProfile]);

  const effectiveActionLock = useMemo(() => {
    if (actionLock) {
      return actionLock;
    }

    if (!pendingGoalAction || safeConversation.state === "ansiedad") {
      return null;
    }

    return {
      message: "Antes de seguir: ¿ya completaste esta acción? Responde sí o no.",
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

  const handleSaveProgress = async () => {
    const email = saveProgressEmail.trim();
    if (!email || saveProgressLoading) {
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

    setSaveProgressLoading(true);
    setSaveProgressStatus(null);
    setError(null);

    try {
      const session = await captureBrowserEmail({
        email,
        sessionId: sessionProfile?.id,
      });
      const nextProfile = session.user ?? null;

      setSessionProfile(nextProfile);
      if (nextProfile?.email) {
        setSaveProgressEmail(nextProfile.email);
      }

      const nextActiveConversationId = await refreshConversations();
      if (nextActiveConversationId) {
        await loadMessages(nextActiveConversationId);
      }
      await refreshActiveGoal();

      setSaveProgressStatus(
        nextProfile?.isAnonymous
          ? "La sesión sigue anónima. Intenta de nuevo."
          : `Progreso vinculado a ${nextProfile?.email}.`
      );
      setCaptureEmailRecommended(false);
      setCaptureEmailPrompt(null);
    } catch (loginError: unknown) {
      const message =
        loginError instanceof Error ? loginError.message : "No se pudo guardar el progreso.";
      setError(message);
    } finally {
      setSaveProgressLoading(false);
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
      const seededConversation = conversations.length === 0 ? createDraftConversation(1) : null;

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
        await refreshSessionProfile().catch(() => null);
        return;
      }

      const assistantText =
        payload.message?.trim() ||
        payload.response?.trim() ||
        "No pude generar una respuesta en este momento.";
      const nextState = payload.state || "neutral";
      const persistenceAvailable = payload.persistenceAvailable !== false;
      const nextActionLock =
        payload.type === "action_required" && payload.action && typeof payload.action !== "string"
          ? {
              message: assistantText,
              action: payload.action,
            }
          : null;
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: assistantText,
        variant: nextActionLock
          ? "action_required"
          : payload.type === "crisis"
            ? "crisis"
            : undefined,
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
      if (payload.captureEmail) {
        setCaptureEmailRecommended(true);
        setCaptureEmailPrompt(payload.captureEmailMessage || null);
      } else if (sessionProfile && !sessionProfile.isAnonymous) {
        setCaptureEmailRecommended(false);
        setCaptureEmailPrompt(null);
      }

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
        await refreshSessionProfile().catch(() => null);
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
    <AppLayout
      title="Luciernaga AI"
      subtitle="Mentoría conversacional con foco en acción, continuidad emocional y un contexto persistente que acompaña la conversación."
      summary={
        <>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Cuenta:{" "}
            <span className="ml-1 font-semibold">
              {sessionProfile?.isAnonymous
                ? "Anónima"
                : sessionProfile?.email || "Pendiente de vincular"}
            </span>
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Plan: <span className="ml-1 font-semibold">{sessionProfile?.planLabel || "Free"}</span>
          </Badge>
          {sessionProfile?.messageLimitPerDay != null ? (
            <Badge variant="warning" className="rounded-full px-3 py-1">
              Uso hoy:{" "}
              <span className="ml-1 font-semibold">
                {sessionProfile?.messagesUsedToday ?? 0}/{sessionProfile?.messageLimitPerDay ?? 0}
              </span>
            </Badge>
          ) : (
            <Badge variant="success" className="rounded-full px-3 py-1">
              Acceso completo activo
            </Badge>
          )}
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            Objetivo: <span className="ml-1 font-semibold">{activeGoal?.title || "Sin objetivo"}</span>
          </Badge>
          <Badge
            variant={pendingActionsCount > 0 || effectiveActionLock ? "warning" : "success"}
            className="rounded-full px-3 py-1"
          >
            {pendingActionsCount > 0
              ? pendingActionsCount === 1
                ? "1 acción pendiente"
                : `${pendingActionsCount} acciones pendientes`
              : "Sin acciones pendientes"}
          </Badge>
          {safeConversation.searchUsed ? (
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Internet usado
            </Badge>
          ) : null}
          {safeConversation.fallback ? (
            <Badge variant="danger" className="rounded-full px-3 py-1">
              Fallback IA activo
            </Badge>
          ) : null}
          {safeConversation.flow?.activeFlow ? (
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Flujo {formatFlowLabel(safeConversation.flow.activeFlow)} · paso{" "}
              {safeConversation.flow.currentStep}
            </Badge>
          ) : null}
        </>
      }
      prelude={
        <>
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Uso responsable
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-foreground">
                {PRODUCT_DISCLAIMERS[0]}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {PRODUCT_DISCLAIMERS[1]} Si hay riesgo alto, prioriza ayuda humana inmediata.
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_0.95fr]">
            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Continuidad de sesión</CardTitle>
                <CardDescription>
                  Mantén contexto, progreso y seguimiento entre sesiones sin cambiar la lógica actual
                  del producto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Progreso:{" "}
                    <span className="ml-1 font-semibold">
                      {progress.completedActions}/{progress.totalActions}
                    </span>
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Estado dominante:{" "}
                    <span className="ml-1 font-semibold">{progress.dominantState}</span>
                  </Badge>
                  {effectiveActionLock ? (
                    <Badge variant="warning" className="rounded-full px-3 py-1">
                      Modo responsabilidad activo
                    </Badge>
                  ) : null}
                </div>

                {(captureEmailRecommended ||
                  Boolean(sessionProfile && !sessionProfile.isAnonymous)) ? (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Guardar progreso
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {captureEmailPrompt ||
                        "Vincula un email para conservar tus conversaciones y objetivos entre dispositivos."}
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Input
                        type="email"
                        value={saveProgressEmail}
                        onChange={(event) => setSaveProgressEmail(event.target.value)}
                        placeholder="tu@email.com"
                        className="bg-background"
                      />
                      <Button
                        type="button"
                        onClick={() => void handleSaveProgress()}
                        disabled={saveProgressLoading || !saveProgressEmail.trim()}
                      >
                        {saveProgressLoading ? "Guardando..." : "Guardar progreso"}
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {sessionProfile?.isAnonymous ? (
                        <Badge variant="warning" className="rounded-full px-3 py-1">
                          Sesión anónima actual
                        </Badge>
                      ) : sessionProfile?.email ? (
                        <Badge variant="success" className="rounded-full px-3 py-1">
                          Vinculado a {sessionProfile.email}
                        </Badge>
                      ) : null}
                      {sessionProfile?.subscriptionStatus ? (
                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                          Estado: {sessionProfile.subscriptionStatus}
                        </Badge>
                      ) : null}
                    </div>
                    {saveProgressStatus ? (
                      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                        {saveProgressStatus}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {safeConversation.flow?.activeFlow ? (
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                      Coach empujando flujo activo
                    </p>
                    <p className="mt-2 font-semibold">
                      {formatFlowLabel(safeConversation.flow.activeFlow)} · intent{" "}
                      {formatIntentLabel(safeConversation.flow.currentIntent)}
                    </p>
                    {safeConversation.flow.instruction ? (
                      <p className="mt-2 text-violet-900 dark:text-violet-100">
                        {safeConversation.flow.instruction}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {effectiveActionLock ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">
                      Acción pendiente prioritaria
                    </p>
                    <p className="mt-2 font-semibold">{effectiveActionLock.action.title}</p>
                    <p className="mt-1 text-amber-900 dark:text-amber-100">
                      {effectiveActionLock.message}
                    </p>
                  </div>
                ) : pendingGoalAction ? (
                  <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Siguiente acción sugerida
                    </p>
                    <p className="mt-2 font-medium">{pendingGoalAction.description}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/95 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">Check-in diario</CardTitle>
                    <CardDescription className="mt-1">
                      Registra cómo llegas hoy aunque no quieras abrir otra conversación.
                    </CardDescription>
                  </div>
                  {checkinStatus ? (
                    <Badge variant="success" className="rounded-full px-3 py-1">
                      {checkinStatus.checkinsToday} hoy
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={checkinInput}
                  onChange={(event) => setCheckinInput(event.target.value)}
                  rows={4}
                  disabled={checkinLoading}
                  placeholder="Ejemplo: Hoy estoy bloqueado y me cuesta arrancar."
                  className="min-h-[132px] resize-none bg-background"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {checkinStatus ? (
                      <span>
                        Último guardado:{" "}
                        {new Date(checkinStatus.savedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · estado {checkinStatus.state}
                      </span>
                    ) : (
                      <span>Sin check-in registrado en esta sesión.</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleCheckinSubmit()}
                    disabled={checkinLoading || !checkinInput.trim()}
                  >
                    {checkinLoading ? "Guardando..." : "Guardar check-in"}
                  </Button>
                </div>
                {checkinStatus ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                    {checkinStatus.message}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </>
      }
      sidebar={
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
          profile={sidebarProfile}
          adminAuthenticated={adminAuthenticated}
          adminLoading={adminLoading}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onAdminLogout={handleAdminLogout}
        />
      }
      main={
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
      }
      rightPanel={
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
      }
    />
  );
}
