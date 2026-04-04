"use client";

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowDown, Check, Copy, Send, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  variant?: "action_required" | "crisis";
  meta?: {
    searchUsed?: boolean;
    fallback?: boolean;
  };
};

type ChatFlow = {
  currentIntent: string;
  currentStep: number;
  activeFlow: string | null;
  instruction: string | null;
};

type ActionLock = {
  message: string;
  actionTitle: string;
};

export type ChatProps = {
  title?: string;
  messages?: ChatMessage[];
  input?: string;
  setInput?: (value: string) => void;
  onInputChange?: (value: string) => void;
  loading?: boolean;
  streamingMessageId?: string | null;
  error: string | null;
  actionLock?: ActionLock | null;
  responseSignals?: {
    searchUsed: boolean;
    fallback: boolean;
    flow: ChatFlow | null;
  };
  onSend: (overrideText?: string) => Promise<void> | void;
  onUseStarterExample?: (value: string) => void;
  /** localStorage key for draft persistence. */
  draftKey?: string;
};

// ─── Starter prompts ──────────────────────────────────────────────────────────

const STARTERS = [
  "Estoy bloqueado y no sé cómo empezar",
  "Tengo demasiadas cosas y no sé por dónde ir",
  "Necesito tomar una decisión importante",
  "Quiero salir de un patrón que se repite",
];

// ─── Simple markdown renderer ─────────────────────────────────────────────────
// Handles: **bold**, `inline code`, line breaks, and - bullet lists.
// No external dependencies.

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bullet point
    const bulletMatch = /^[-*•]\s+(.+)/.exec(line);
    if (bulletMatch) {
      nodes.push(
        <li key={i} className="ml-4 list-disc text-sm leading-relaxed">
          {inlineMarkdown(bulletMatch[1])}
        </li>
      );
      continue;
    }

    // Regular line
    if (line.trim() === "") {
      nodes.push(<br key={`br-${i}`} />);
    } else {
      nodes.push(
        <span key={i} className="block text-sm leading-relaxed">
          {inlineMarkdown(line)}
        </span>
      );
    }
  }

  return nodes;
}

function inlineMarkdown(text: string): React.ReactNode[] {
  // Split on **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-xs text-indigo-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [message.content]);

  // Crisis variant — full-width red alert
  if (message.variant === "crisis") {
    return (
      <div className="flex items-start gap-2 px-1">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20">
          <Shield className="h-3.5 w-3.5 text-red-400" />
        </div>
        <div className="flex-1 rounded-xl border border-red-500/30 bg-red-950/30 p-3.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-red-400">
            Alerta de seguridad
          </p>
          <div className="text-sm leading-relaxed text-red-100">
            {renderMarkdown(message.content)}
          </div>
        </div>
      </div>
    );
  }

  // Action required variant — amber
  if (message.variant === "action_required") {
    return (
      <div className="flex items-start gap-2 px-1">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <div className="flex-1 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
            Acción requerida
          </p>
          <div className="text-sm leading-relaxed text-amber-100">
            {renderMarkdown(message.content)}
          </div>
        </div>
      </div>
    );
  }

  // User message — right-aligned
  if (isUser) {
    return (
      <div className="flex justify-end px-1">
        <div className="group relative max-w-[78%]">
          <div
            className={`rounded-2xl rounded-tr-sm px-3.5 py-2.5 ${
              message.isError
                ? "border border-red-500/30 bg-red-950/30 text-red-200"
                : "bg-indigo-600 text-white"
            }`}
          >
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
          <button
            onClick={() => void handleCopy()}
            className="absolute -left-8 top-1 opacity-0 transition-opacity group-hover:opacity-100"
          >
            {copied
              ? <Check className="h-3.5 w-3.5 text-emerald-400" />
              : <Copy className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400" />
            }
          </button>
        </div>
      </div>
    );
  }

  // Assistant message — left-aligned
  return (
    <div className="flex items-start gap-2.5 px-1">
      {/* AI avatar */}
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-indigo-500/30">
        <Sparkles className="h-3 w-3 text-indigo-400" />
      </div>

      <div className="group relative max-w-[82%]">
        <div
          className={`rounded-2xl rounded-tl-sm px-3.5 py-2.5 ${
            message.isError
              ? "border border-red-500/20 bg-red-950/20 text-zinc-400"
              : "border border-zinc-800 bg-zinc-900 text-zinc-100"
          }`}
        >
          {isStreaming ? (
            <div className="flex items-center gap-1 py-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
            </div>
          ) : (
            <div>{renderMarkdown(message.content)}</div>
          )}
          {/* Fallback / search signals */}
          {message.meta?.searchUsed && (
            <p className="mt-1.5 text-[10px] text-zinc-600">· búsqueda usada</p>
          )}
          {message.meta?.fallback && (
            <p className="mt-1.5 text-[10px] text-zinc-600">· respuesta de respaldo</p>
          )}
        </div>

        {!isStreaming && (
          <button
            onClick={() => void handleCopy()}
            className="absolute -right-8 top-1 opacity-0 transition-opacity group-hover:opacity-100"
          >
            {copied
              ? <Check className="h-3.5 w-3.5 text-emerald-400" />
              : <Copy className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400" />
            }
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Chat({
  messages = [],
  input = "",
  setInput,
  onInputChange,
  loading = false,
  streamingMessageId,
  actionLock,
  responseSignals,
  onSend,
  onUseStarterExample,
  draftKey,
}: ChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [atBottom, setAtBottom] = useState(true);

  // ── Draft save / restore ──────────────────────────────────────────────────

  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(draftKey);
    if (saved && !input) {
      if (setInput) setInput(saved);
      else onInputChange?.(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    if (input === "") localStorage.removeItem(draftKey);
  }, [draftKey, input]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────

  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loading, atBottom]);

  // Detect when user scrolls up
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(isNearBottom);
  }, []);

  // ── Input handlers ────────────────────────────────────────────────────────

  const handleInputChange = (value: string) => {
    if (draftKey) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (value) localStorage.setItem(draftKey, value);
        else localStorage.removeItem(draftKey);
      }, 400);
    }
    if (setInput) { setInput(value); return; }
    onInputChange?.(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!loading && input.trim()) void onSend();
    }
  };

  const handleStarterClick = (text: string) => {
    if (onUseStarterExample) {
      onUseStarterExample(text);
    } else {
      handleInputChange(text);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const isEmpty = messages.length === 0 && !loading;
  const flowActive = responseSignals?.flow?.activeFlow;

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950">

      {/* ── Flow indicator ──────────────────────────────────────────────── */}
      {flowActive && (
        <div className="shrink-0 border-b border-zinc-800/60 bg-indigo-950/30 px-4 py-2">
          <p className="text-xs text-indigo-400">
            Flujo activo: <span className="font-semibold">{flowActive}</span>
            {responseSignals?.flow?.instruction && (
              <span className="ml-2 text-zinc-500">— {responseSignals.flow.instruction}</span>
            )}
          </p>
        </div>
      )}

      {/* ── Action lock banner ───────────────────────────────────────────── */}
      {actionLock && (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-950/20 px-4 py-2.5">
          <p className="text-xs text-amber-300">
            <span className="font-semibold">Acción pendiente:</span>{" "}
            <span className="italic">{actionLock.actionTitle}</span>
          </p>
          <p className="mt-0.5 text-xs text-amber-500/80">{actionLock.message}</p>
        </div>
      )}

      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto"
      >
        {isEmpty ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-white">¿En qué te puedo ayudar hoy?</h3>
            <p className="mb-6 text-sm text-zinc-500">
              Escribe lo que te pasa o elige un punto de partida.
            </p>
            <div className="flex w-full max-w-sm flex-col gap-2">
              {STARTERS.map((text) => (
                <button
                  key={text}
                  onClick={() => handleStarterClick(text)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-left text-sm text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200 active:scale-[0.98]"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 px-3 py-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={streamingMessageId === message.id}
              />
            ))}

            {/* Typing / loading indicator (before assistant responds) */}
            {loading && !streamingMessageId && (
              <div className="flex items-start gap-2.5 px-1">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-indigo-500/30">
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900 px-3.5 py-2.5">
                  <div className="flex items-center gap-1 py-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-1" />
          </div>
        )}

        {/* Scroll to bottom FAB */}
        {!atBottom && (
          <button
            onClick={() => {
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
              setAtBottom(true);
            }}
            className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 shadow-lg transition hover:bg-zinc-800 hover:text-white"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-950 px-3 py-3">
        <div className="relative flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribe lo que te pasa… (Enter para enviar)"
            disabled={loading}
            rows={1}
            className="min-h-11 max-h-36 flex-1 resize-none overflow-hidden rounded-xl border-zinc-800 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-indigo-500/50"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Button
            onClick={() => void onSend()}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          <p className="text-[10px] text-zinc-700">
            Shift + Enter para nueva línea
          </p>
          {input.length > 0 && (
            <p className={`text-[10px] ${input.length > 900 ? "text-amber-500" : "text-zinc-700"}`}>
              {input.length}/1000
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
