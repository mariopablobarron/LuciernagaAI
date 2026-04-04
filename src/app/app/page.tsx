"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Chat, { type ChatMessage } from "@/components/Chat";
import AssessmentFlow from "@/components/AssessmentFlow";
import QuickCheckin from "@/components/QuickCheckin";
import HomeHero from "@/components/home/HomeHero";
import HomeOnboarding from "@/components/home/HomeOnboarding";
import HomeWorkspace, { type WorkspaceTab } from "@/components/home/HomeWorkspace";
import InsightsPanel from "@/components/InsightsPanel";
import Sidebar, { type SidebarConversation } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PRODUCT_DISCLAIMERS } from "@/lib/legal";
import {
  bootstrapBrowserSession,
  captureBrowserEmail,
  fetchBrowserSession,
  type BrowserSessionUser,
} from "@/lib/session-client";
import { DEFAULT_ONBOARDING_EXAMPLE } from "@/lib/onboarding";
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
  conversionTrigger: boolean;
  conversionType: "progress" | null;
  journalMode: boolean;
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
  conversionTrigger?: boolean;
  conversionType?: "progress";
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
    conversionTrigger: false,
    conversionType: null,
    journalMode: false,
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
    conversionTrigger: existing?.conversionTrigger ?? false,
    conversionType: existing?.conversionType ?? null,
    journalMode: existing?.journalMode ?? false,
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
  const starterPrefilledConversationsRef = useRef<Set<string>>(new Set());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
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
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [proactivePrompt, setProactivePrompt] = useState<string | null>(null);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("chat");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2 | 3>(0);
  const [onboardingSituation, setOnboardingSituation] = useState("");
  const [onboardingTime, setOnboardingTime] = useState("");
  const [onboardingConsentChecked, setOnboardingConsentChecked] = useState(false);
  const [onboardingConsentGiven, setOnboardingConsentGiven] = useState(false);
  const [onboardingConsentSaving, setOnboardingConsentSaving] = useState(false);
  const [onboardingConsentError, setOnboardingConsentError] = useState<string | null>(null);

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
      setCaptureDialogOpen(false);
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

    // Fetch context-aware proactive prompt in background
    fetch("/api/user/proactive-prompt", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { prompt?: string }) => {
        if (data.prompt) setProactivePrompt(data.prompt);
      })
      .catch(() => {});
  };

  const ensureOnboardingConsent = async (): Promise<boolean> => {
    if (onboardingConsentGiven) {
      return true;
    }

    if (!onboardingConsentChecked) {
      setOnboardingConsentError("Necesitamos tu consentimiento para iniciar el onboarding guiado.");
      return false;
    }

    try {
      setOnboardingConsentSaving(true);
      setOnboardingConsentError(null);

      const response = await fetch("/api/user/consent", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        consentGiven?: boolean;
      };

      if (!response.ok || !data.success || !data.consentGiven) {
        throw new Error(data.error || "No se pudo guardar el consentimiento.");
      }

      setOnboardingConsentGiven(true);
      return true;
    } catch (consentError: unknown) {
      setOnboardingConsentError(
        consentError instanceof Error
          ? consentError.message
          : "No se pudo registrar el consentimiento. Intenta de nuevo."
      );
      return false;
    } finally {
      setOnboardingConsentSaving(false);
    }
  };

  const handleStartOnboarding = async (): Promise<void> => {
    const canContinue = await ensureOnboardingConsent();
    if (canContinue) {
      setOnboardingStep(1);
    }
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
      emotionalState: emotionalProfile.primaryEmotion,
      progressTrend: emotionalProfile.progressTrend,
      streakDays,
    };
  }, [activeGoal, conversations, emotionalProfile, streakDays]);

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
      plan: sessionProfile?.planLabel ? `Plan ${sessionProfile.planLabel}` : "Plan Free",
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

  const nearPlanLimit = useMemo(() => {
    if (!sessionProfile || sessionProfile.hasPlan || sessionProfile.messageLimitPerDay == null) {
      return false;
    }

    return (sessionProfile.messagesRemainingToday ?? 0) <= 2;
  }, [sessionProfile]);

  const limitReached = useMemo(() => {
    if (!sessionProfile || sessionProfile.hasPlan || sessionProfile.messageLimitPerDay == null) {
      return false;
    }

    return (sessionProfile.messagesRemainingToday ?? 0) <= 0;
  }, [sessionProfile]);

  const showUpgradeCta = useMemo(() => {
    if (!sessionProfile || sessionProfile.hasPlan) {
      return false;
    }

    return safeConversation.conversionTrigger || nearPlanLimit || limitReached;
  }, [limitReached, nearPlanLimit, safeConversation.conversionTrigger, sessionProfile]);

  const upgradeCopy = useMemo(() => {
    if (!showUpgradeCta) {
      return null;
    }

    if (limitReached) {
      return "Has tocado el límite del plan Free. Pro mantiene el hilo, evita cortes y te acompaña sin límite diario.";
    }

    if (safeConversation.conversionTrigger) {
      return "Aquí ya hubo valor real: claridad, objetivo o una acción concreta. Pro sirve para sostener ese avance y no perderlo entre sesiones.";
    }

    if (nearPlanLimit) {
      return "Estás cerca del límite diario. Si quieres continuidad sin perder ritmo, Pro es el paso natural.";
    }

    return null;
  }, [limitReached, nearPlanLimit, safeConversation.conversionTrigger, showUpgradeCta]);

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
        if (!cancelled) {
          fetch("/api/user/state")
            .then((r) => r.json())
            .then((data: { streakDays?: number; consentGiven?: boolean }) => {
              if (!cancelled && typeof data.streakDays === "number") {
                setStreakDays(data.streakDays);
              }
              if (!cancelled && data.consentGiven === true) {
                setOnboardingConsentGiven(true);
                setOnboardingConsentChecked(true);
                setOnboardingConsentError(null);
              }
            })
            .catch(() => undefined);
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

    async function consumeTelegramLink(): Promise<void> {
      if (typeof window === "undefined") {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const telegramLinkToken = params.get("telegram_link")?.trim();
      if (!telegramLinkToken) {
        return;
      }

      try {
        const response = await fetch("/api/auth/link-telegram", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: telegramLinkToken }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
        };

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "No se pudo vincular Telegram.");
        }

        if (!cancelled) {
          await refreshSessionProfile().catch(() => null);
          setSaveProgressStatus("Telegram vinculado correctamente a esta cuenta.");
        }
      } catch (linkError: unknown) {
        if (!cancelled) {
          const message =
            linkError instanceof Error ? linkError.message : "No se pudo vincular Telegram.";
          setSaveProgressStatus(`Vinculación Telegram: ${message}`);
        }
      } finally {
        if (!cancelled) {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.delete("telegram_link");
          window.history.replaceState({}, "", nextUrl.pathname + nextUrl.search);
        }
      }
    }

    void consumeTelegramLink();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (safeConversation.messages.length > 0) {
      return;
    }

    if (starterPrefilledConversationsRef.current.has(safeConversation.id)) {
      return;
    }

    if (input.trim()) {
      return;
    }

    starterPrefilledConversationsRef.current.add(safeConversation.id);
    setInput(DEFAULT_ONBOARDING_EXAMPLE);
  }, [input, safeConversation.id, safeConversation.messages.length]);

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
    setWorkspaceTab("chat");
    setInput("");
    setError(null);
  };

  const handleUseStarterExample = (value: string) => {
    setWorkspaceTab("chat");
    setInput(value);
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

  const handleRenameConversation = async (id: string, title: string) => {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
  };

  const handleDeleteConversation = async (id: string) => {
    await fetch(`/api/conversations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else {
        const next = createDraftConversation(0);
        setConversations([next]);
        setActiveConversationId(next.id);
      }
    }
  };

  const handleRateSession = (rating: 1 | -1) => {
    const id = activeConversationId;
    if (!id) return;
    void fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
  };

  const handleToggleJournal = () => {
    const id = activeConversationId;
    if (!id) return;
    const current = safeConversation.journalMode;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, journalMode: !current } : c)),
    );
    void fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journalMode: !current }),
    });
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
      setCaptureDialogOpen(false);
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

    // Journal mode: skip AI, just record the message locally
    if (resolvedConversation.journalMode) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-response-mode": "json",
        },
        body: JSON.stringify({
          message: trimmed,
          conversationId: resolvedConversation.isDraft ? undefined : currentConversationId,
        }),
      });

      // Handle 401 without consuming body
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
        await refreshSessionProfile().catch(() => null);
        return;
      }

      // --- SSE streaming path ---
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream") && response.body) {
        if (!response.ok) {
          const errMsg = `Error ${response.status}`;
          setError(errMsg);
          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.id === currentConversationId
                ? {
                    ...conversation,
                    updatedAt: new Date().toISOString(),
                    messageCount: conversation.messageCount + 1,
                    messages: [
                      ...conversation.messages,
                      {
                        id: `assistant_error_${Date.now()}`,
                        role: "assistant" as const,
                        content: errMsg,
                        isError: true,
                      },
                    ],
                  }
                : conversation
            )
          );
          return;
        }

        const streamMsgId = `assistant_${Date.now()}`;
        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === currentConversationId
              ? {
                  ...conversation,
                  updatedAt: new Date().toISOString(),
                  messageCount: conversation.messageCount + 1,
                  messages: [
                    ...conversation.messages,
                    { id: streamMsgId, role: "assistant" as const, content: "" },
                  ],
                }
              : conversation
          )
        );
        setStreamingMessageId(streamMsgId);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let sseMeta: Partial<ChatApiResponse> | null = null;
        let sseStreamDone = false;

        while (!sseStreamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(trimmedLine.slice(6)) as {
                type: string;
                delta?: string;
                content?: string;
                [key: string]: unknown;
              };
              if (event.type === "delta" && event.delta) {
                setConversations((previous) =>
                  previous.map((conversation) =>
                    conversation.id === currentConversationId
                      ? {
                          ...conversation,
                          messages: conversation.messages.map((msg) =>
                            msg.id === streamMsgId
                              ? { ...msg, content: msg.content + (event.delta as string) }
                              : msg
                          ),
                        }
                      : conversation
                  )
                );
              } else if (event.type === "replace" && typeof event.content === "string") {
                setConversations((previous) =>
                  previous.map((conversation) =>
                    conversation.id === currentConversationId
                      ? {
                          ...conversation,
                          messages: conversation.messages.map((msg) =>
                            msg.id === streamMsgId
                              ? { ...msg, content: event.content as string }
                              : msg
                          ),
                        }
                      : conversation
                  )
                );
              } else if (event.type === "meta") {
                sseMeta = event as Partial<ChatApiResponse>;
              } else if (event.type === "done") {
                sseStreamDone = true;
                break;
              }
            } catch {
              // skip malformed SSE event
            }
          }
        }

        setStreamingMessageId(null);

        const ssePayload = sseMeta ?? {};
        const sseNextState = (ssePayload.state as string) || "neutral";
        const ssePersistenceAvailable = ssePayload.persistenceAvailable !== false;
        const sseResolvedConversationId = ssePersistenceAvailable
          ? ssePayload.conversationId || currentConversationId
          : currentConversationId;
        const sseNextGoal = ssePayload.goal ?? null;
        const sseNextEmotionalProfile = ssePayload.emotionalProfile ?? emotionalProfile;
        const sseNextFlow = ssePayload.flow ?? null;
        const sseConversionTrigger = Boolean(ssePayload.conversionTrigger);
        const sseConversionType = ssePayload.conversionType ?? null;
        const sseFallbackInsight = buildStateInsight(sseNextState);
        const sseNextInsight = ssePayload.insight || sseFallbackInsight.insight;
        const sseNextAction =
          typeof ssePayload.action === "string" ? ssePayload.action : sseFallbackInsight.action;
        const sseNextAlerts =
          Array.isArray(ssePayload.alerts) && ssePayload.alerts.length > 0
            ? ssePayload.alerts
            : sseFallbackInsight.alerts;

        if (ssePayload.captureEmail) {
          setCaptureEmailRecommended(true);
          setCaptureEmailPrompt((ssePayload.captureEmailMessage as string) || null);
          if (sessionProfile?.isAnonymous !== false) {
            setCaptureDialogOpen(true);
          }
        } else if (sessionProfile && !sessionProfile.isAnonymous) {
          setCaptureEmailRecommended(false);
          setCaptureEmailPrompt(null);
        }

        setConversations((previous) => {
          const next = previous.map((conversation) =>
            conversation.id === currentConversationId
              ? {
                  ...conversation,
                  id: sseResolvedConversationId,
                  isDraft: ssePersistenceAvailable ? false : conversation.isDraft,
                  hasLoadedMessages: ssePersistenceAvailable
                    ? true
                    : conversation.hasLoadedMessages,
                  updatedAt: new Date().toISOString(),
                  state: sseNextState,
                  insight: sseNextInsight,
                  action: sseNextAction,
                  alerts: sseNextAlerts,
                  searchUsed: Boolean(ssePayload.searchUsed),
                  fallback: Boolean(ssePayload.fallback),
                  flow: sseNextFlow,
                  conversionTrigger: sseConversionTrigger,
                  conversionType: sseConversionType,
                  messages: conversation.messages.map((msg) =>
                    msg.id === streamMsgId
                      ? {
                          ...msg,
                          meta: {
                            searchUsed: Boolean(ssePayload.searchUsed),
                            fallback: Boolean(ssePayload.fallback),
                          },
                        }
                      : msg
                  ),
                }
              : conversation
          );
          const dedupById = new Map<string, Conversation>();
          for (const item of next) {
            if (!dedupById.has(item.id)) dedupById.set(item.id, item);
          }
          return Array.from(dedupById.values());
        });
        setEmotionalProfile(sseNextEmotionalProfile);

        if (sseResolvedConversationId !== currentConversationId) {
          setActiveConversationId(sseResolvedConversationId);
        }
        if (sseNextGoal) {
          setActiveGoal(sseNextGoal);
        } else {
          setActionLock(null);
        }

        try {
          if (ssePersistenceAvailable) {
            await refreshConversations(sseResolvedConversationId);
            await loadMessages(sseResolvedConversationId);
            if (!sseNextGoal) {
              await refreshActiveGoal();
            }
          } else {
            setError(
              "La respuesta llegó, pero no se pudo guardar en base de datos. Revisa los logs del servidor."
            );
          }
          await refreshSessionProfile().catch(() => null);
        } catch {
          console.error("[CHAT_UI] refresh_failed_after_stream", {
            conversationId: sseResolvedConversationId,
          });
        }
        return;
      }

      // --- JSON path ---
      const payload = (await response.json().catch(() => ({}))) as Partial<ChatApiResponse>;

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
      const conversionTrigger = Boolean(payload.conversionTrigger);
      const conversionType = payload.conversionType ?? null;
      if (payload.captureEmail) {
        setCaptureEmailRecommended(true);
        setCaptureEmailPrompt(payload.captureEmailMessage || null);
        if (sessionProfile?.isAnonymous !== false) {
          setCaptureDialogOpen(true);
        }
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
                conversionTrigger,
                conversionType,
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
    <>
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
              Plan:{" "}
              <span className="ml-1 font-semibold">{sessionProfile?.planLabel || "Free"}</span>
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Progreso:{" "}
              <span className="ml-1 font-semibold">
                {progress.completedActions}/{progress.totalActions}
              </span>
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Objetivo:{" "}
              <span className="ml-1 font-semibold">{activeGoal?.title || "Sin objetivo"}</span>
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
            <Badge
              variant={
                safeConversation.state === "claridad"
                  ? "success"
                  : safeConversation.state === "bloqueo" || safeConversation.state === "ansiedad"
                    ? "warning"
                    : "secondary"
              }
              className="rounded-full px-3 py-1"
            >
              Estado:{" "}
              <span className="ml-1 font-semibold capitalize">{safeConversation.state}</span>
            </Badge>
          </>
        }
        prelude={
          <>
            {onboardingStep === 0 ? (
              <HomeHero
                onUseChat={() => setWorkspaceTab("chat")}
                onUseExample={handleUseStarterExample}
                onStartOnboarding={handleStartOnboarding}
                consentChecked={onboardingConsentChecked}
                consentRequired={!onboardingConsentGiven}
                consentSaving={onboardingConsentSaving}
                consentError={onboardingConsentError}
                onConsentChange={(checked) => {
                  setOnboardingConsentChecked(checked);
                  if (checked) {
                    setOnboardingConsentError(null);
                  }
                }}
              />
            ) : (
              <HomeOnboarding
                step={onboardingStep as 1 | 2 | 3}
                situation={onboardingSituation}
                time={onboardingTime}
                onSelectSituation={(value) => {
                  setOnboardingSituation(value);
                  setOnboardingStep(2);
                }}
                onSelectTime={(value) => {
                  setOnboardingTime(value);
                  setOnboardingStep(3);
                }}
                onSubmitGoal={(goal) => {
                  const message =
                    `${onboardingSituation} Tengo ${onboardingTime} ahora. ` +
                    `Lo que quiero resolver: ${goal}`;
                  setOnboardingStep(0);
                  handleUseStarterExample(message);
                }}
                onSkip={() => {
                  setOnboardingStep(0);
                  setWorkspaceTab("chat");
                }}
              />
            )}
            <Card className="border-border/70 bg-card/80 shadow-sm">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Uso responsable
                  </p>
                  <p className="text-sm text-foreground">{PRODUCT_DISCLAIMERS[0]}</p>
                  <p className="text-sm text-muted-foreground">
                    {PRODUCT_DISCLAIMERS[1]} Si hay riesgo alto, prioriza ayuda humana inmediata.
                  </p>
                </div>
                <Link
                  href="/api/legal"
                  className="text-sm font-medium text-foreground underline underline-offset-4"
                >
                  Ver límites del sistema
                </Link>
              </CardContent>
            </Card>
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
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        }
        main={
          <HomeWorkspace
            activeTab={workspaceTab}
            onTabChange={setWorkspaceTab}
            chat={
              <>
                <AssessmentFlow userId={sessionProfile?.id} />
                <div className="shrink-0 px-3 pt-3">
                  <QuickCheckin userId={sessionProfile?.id} />
                </div>
              <Chat
                title={safeConversation.title}
                messages={safeConversation.messages}
                input={input}
                loading={loading || sessionLoading}
                streamingMessageId={streamingMessageId}
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
                onUseStarterExample={handleUseStarterExample}
                draftKey={`chat-draft:${safeConversation.id}`}
                conversationId={safeConversation.isDraft ? undefined : safeConversation.id}
                onRateSession={handleRateSession}
                journalMode={safeConversation.journalMode}
                onToggleJournal={safeConversation.isDraft ? undefined : handleToggleJournal}
                proactivePrompt={safeConversation.messages.length === 0 ? proactivePrompt : null}
              />
              </>
            }
            onNewConversation={handleNewConversation}
            conversationTitle={safeConversation.title}
            conversationState={safeConversation.state}
            flowSummary={
              safeConversation.flow?.activeFlow
                ? `Flujo ${formatFlowLabel(safeConversation.flow.activeFlow)} · paso ${safeConversation.flow.currentStep}`
                : null
            }
            flowInstruction={safeConversation.flow?.instruction ?? null}
            responseSignals={{
              searchUsed: safeConversation.searchUsed,
              fallback: safeConversation.fallback,
            }}
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
            pendingGoalAction={pendingGoalAction}
            goalLoading={goalLoading}
            onToggleAction={handleToggleAction}
            sessionProfile={sessionProfile}
            captureEmailRecommended={captureEmailRecommended}
            captureEmailPrompt={captureEmailPrompt}
            saveProgressEmail={saveProgressEmail}
            onSaveProgressEmailChange={setSaveProgressEmail}
            saveProgressLoading={saveProgressLoading}
            saveProgressStatus={saveProgressStatus}
            onSaveProgress={handleSaveProgress}
            showUpgradeCta={showUpgradeCta}
            upgradeCopy={upgradeCopy}
            onOpenUpgrade={() => setUpgradeDialogOpen(true)}
            checkinInput={checkinInput}
            onCheckinInputChange={setCheckinInput}
            checkinLoading={checkinLoading}
            checkinStatus={checkinStatus}
            onCheckinSubmit={handleCheckinSubmit}
          />
        }
        rightPanel={
          <InsightsPanel
            mode={workspaceTab}
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

      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Continuidad completa, no presión vacía</DialogTitle>
            <DialogDescription>
              {upgradeCopy ||
                "El siguiente salto no es más ruido: es más continuidad, historial y seguimiento real."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-sm font-semibold text-foreground">Free</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>10 mensajes al día</li>
                  <li>Continuidad resumida</li>
                  <li>Buen punto de entrada</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">Pro</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>Sin límite diario</li>
                  <li>Seguimiento completo de objetivos y acciones</li>
                  <li>Más continuidad entre sesiones</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {sessionProfile?.isAnonymous
                ? "Antes de activar un plan, guarda tu progreso con email para no perder continuidad."
                : `Tu progreso ya está vinculado a ${sessionProfile?.email}. Cuando Pro esté listo, este flujo ya estará preparado.`}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Ahora no
            </Button>
            <Button
              onClick={() => {
                setWorkspaceTab("plan");
                setUpgradeDialogOpen(false);
              }}
            >
              Ver continuidad en el plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={captureDialogOpen} onOpenChange={setCaptureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guarda tu progreso antes de perderlo</DialogTitle>
            <DialogDescription>
              {captureEmailPrompt ||
                "Ya apareció claridad real en la conversación. Vincula un email para no perder objetivos, acciones y continuidad."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning" className="rounded-full px-3 py-1">
                Cuenta anónima
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {sessionProfile?.planLabel || "Free"}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Progreso {progress.completedActions}/{progress.totalActions}
              </Badge>
            </div>

            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Email</span>
                <Input
                  type="email"
                  value={saveProgressEmail}
                  onChange={(event) => setSaveProgressEmail(event.target.value)}
                  placeholder="tu@email.com"
                />
              </label>

              {saveProgressStatus ? (
                <div className="rounded-2xl border border-signal-success/30 bg-signal-success/12 px-3 py-3 text-sm text-foreground">
                  {saveProgressStatus}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCaptureDialogOpen(false)}>
              Seguir anónimo
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveProgress()}
              disabled={saveProgressLoading || !saveProgressEmail.trim()}
            >
              {saveProgressLoading ? "Guardando..." : "Guardar progreso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
