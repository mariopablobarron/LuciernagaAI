"use client";

import { useMemo, useState } from "react";
import Chat, { type ChatMessage } from "@/components/Chat";
import InsightsPanel from "@/components/InsightsPanel";
import Sidebar, { type SidebarConversation } from "@/components/Sidebar";

type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  state: string;
  insight: string;
  action: string;
  alerts: string[];
};

type ChatApiResponse = {
  success?: boolean;
  response?: string;
  state?: string;
  insight?: string;
  action?: string;
  alerts?: string[];
  error?: string;
};

function buildStateInsight(state: string): {
  insight: string;
  action: string;
  alerts: string[];
} {
  if (state === "bloqueado") {
    return {
      insight: "Hay fricción para arrancar. Necesitas reducir el tamaño del siguiente paso.",
      action: "Haz una microacción de 10 minutos ahora mismo.",
      alerts: ["Riesgo de parálisis si no se ejecuta una primera acción hoy."],
    };
  }

  if (state === "ansioso") {
    return {
      insight: "Tu energía está dispersa. El foco debe volver a una sola prioridad.",
      action: "Define una prioridad única y descarta tareas secundarias por hoy.",
      alerts: ["Evita multitarea. Puede aumentar el bloqueo."],
    };
  }

  if (state === "perdido") {
    return {
      insight: "Hay falta de claridad en objetivos o siguiente paso.",
      action: "Escribe un objetivo concreto y un primer paso ejecutable.",
      alerts: ["Sin dirección clara, la ejecución se vuelve inestable."],
    };
  }

  return {
    insight: "Estado estable. Buen momento para mantener ritmo y consistencia.",
    action: "Continúa con una acción concreta y medible.",
    alerts: [],
  };
}

function createConversation(index: number): Conversation {
  const now = new Date().toISOString();
  const baseInsight = buildStateInsight("neutral");
  return {
    id: `conv_${Date.now()}_${index}`,
    title: `Conversación ${index}`,
    updatedAt: now,
    messages: [],
    state: "neutral",
    insight: baseInsight.insight,
    action: baseInsight.action,
    alerts: baseInsight.alerts,
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

function trimTitle(input: string): string {
  const normalized = input.trim();
  if (!normalized) {
    return "Nueva conversación";
  }
  return normalized.length > 34 ? `${normalized.slice(0, 34)}...` : normalized;
}

export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([
    createConversation(1),
  ]);
  const [activeConversationId, setActiveConversationId] = useState(
    () => conversations[0].id
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeConversation = useMemo(() => {
    return (
      conversations.find((conversation) => conversation.id === activeConversationId) ||
      conversations[0]
    );
  }, [activeConversationId, conversations]);

  const sidebarConversations: SidebarConversation[] = useMemo(() => {
    return conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messages.length,
    }));
  }, [conversations]);

  const progress = useMemo(() => {
    const completedActions = conversations.reduce((accumulator, conversation) => {
      const hasAssistantMessage = conversation.messages.some(
        (message) => message.role === "assistant" && !message.isError
      );
      return hasAssistantMessage ? accumulator + 1 : accumulator;
    }, 0);

    return {
      completedActions,
      totalActions: Math.max(conversations.length, 1),
      dominantState: getDominantState(conversations),
    };
  }, [conversations]);

  const updateActiveConversation = (
    updater: (conversation: Conversation) => Conversation
  ) => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === activeConversationId
          ? updater(conversation)
          : conversation
      )
    );
  };

  const handleNewConversation = () => {
    const next = createConversation(conversations.length + 1);
    setConversations((previous) => [next, ...previous]);
    setActiveConversationId(next.id);
    setInput("");
    setError(null);
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setInput("");
    setError(null);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !activeConversation) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setInput("");
    setError(null);
    setLoading(true);

    updateActiveConversation((conversation) => ({
      ...conversation,
      title:
        conversation.messages.length === 0 ? trimTitle(trimmed) : conversation.title,
      updatedAt: new Date().toISOString(),
      messages: [...conversation.messages, userMessage],
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as Partial<ChatApiResponse>;

      if (!response.ok) {
        const message = payload.error || payload.response || `Error ${response.status}`;
        const assistantError: ChatMessage = {
          id: `assistant_error_${Date.now()}`,
          role: "assistant",
          content: message,
          isError: true,
        };
        setError(message);
        updateActiveConversation((conversation) => ({
          ...conversation,
          updatedAt: new Date().toISOString(),
          messages: [...conversation.messages, assistantError],
        }));
        return;
      }

      const assistantText =
        payload.response?.trim() || "No pude generar una respuesta en este momento.";
      const nextState = payload.state || "neutral";
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: assistantText,
      };

      const fallbackInsight = buildStateInsight(nextState);
      const nextInsight = payload.insight || fallbackInsight.insight;
      const nextAction = payload.action || fallbackInsight.action;
      const nextAlerts =
        Array.isArray(payload.alerts) && payload.alerts.length > 0
          ? payload.alerts
          : fallbackInsight.alerts;

      updateActiveConversation((conversation) => ({
        ...conversation,
        updatedAt: new Date().toISOString(),
        state: nextState,
        insight: nextInsight,
        action: nextAction,
        alerts: nextAlerts,
        messages: [...conversation.messages, assistantMessage],
      }));
    } catch (requestError: unknown) {
      const fallbackMessage =
        requestError instanceof Error && requestError.message
          ? requestError.message
          : "No se pudo conectar con el servidor.";
      const assistantError: ChatMessage = {
        id: `assistant_network_${Date.now()}`,
        role: "assistant",
        content: fallbackMessage,
        isError: true,
      };
      setError(fallbackMessage);
      updateActiveConversation((conversation) => ({
        ...conversation,
        updatedAt: new Date().toISOString(),
        messages: [...conversation.messages, assistantError],
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!activeConversation) {
    return null;
  }

  return (
    <div className="h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto h-full max-w-[1700px] p-4 lg:p-6">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="min-h-[280px] lg:col-span-3 lg:min-h-0">
            <Sidebar
              conversations={sidebarConversations}
              activeConversationId={activeConversationId}
              progress={progress}
              profile={{ name: "Startidea", plan: "Plan Pro" }}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
            />
          </div>

          <div className="min-h-[460px] lg:col-span-6 lg:min-h-0">
            <Chat
              title={activeConversation.title}
              messages={activeConversation.messages}
              input={input}
              loading={loading}
              error={error}
              onInputChange={setInput}
              onSend={handleSend}
            />
          </div>

          <div className="min-h-[280px] lg:col-span-3 lg:min-h-0">
            <InsightsPanel
              state={activeConversation.state}
              insight={activeConversation.insight}
              action={activeConversation.action}
              alerts={activeConversation.alerts}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
