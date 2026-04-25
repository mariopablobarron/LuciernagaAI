"use client";

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  BookOpen,
  Check,
  Copy,
  Ear,
  Eye,
  GitBranch,
  Heart,
  ImagePlus,
  type LucideIcon,
  Mic,
  Phone,
  Repeat,
  Send,
  Shield,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  X,
  Zap,
} from "lucide-react";

// Mapa de iconos para los modos de acompañamiento (definidos en lib/onboarding.ts).
// Centralizar aquí evita que la capa lib dependa de lucide-react.
const MENTOR_MODE_ICONS: Record<string, LucideIcon> = {
  Target,
  Eye,
  Zap,
  GitBranch,
  Repeat,
  Ear,
};
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "@/components/ui/voice-recorder";
import { AudioRecorder } from "@/components/ui/audio-recorder";
import { CHAT_STARTER_PICKS, MENTOR_MODES, getMentorMode } from "@/lib/onboarding";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isError?: boolean;
  variant?: "action_required" | "crisis" | "signup_prompt";
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
  /** Conversation ID — used for rating. */
  conversationId?: string;
  /** Called when user rates the session. */
  onRateSession?: (rating: 1 | -1) => void;
  /** Journaling mode: AI doesn't respond, messages stored as notes. */
  journalMode?: boolean;
  onToggleJournal?: () => void;
  /** Proactive context-aware question shown when chat is empty. */
  proactivePrompt?: string | null;
  /** Called when user submits email from the inline signup prompt. */
  onCaptureEmail?: (email: string) => Promise<void> | void;
  /** Called when user dismisses the inline signup prompt. */
  onDismissSignupPrompt?: (messageId: string) => void;
  /** Inline Community CTA triggered by the mentor pipeline. */
  communityCta?:
    | {
        kind: "recurrent_blocker";
        state: string;
        spaceSlug: string;
        href: string;
        label: string;
        reason: string;
      }
    | {
        kind: "ask_community";
        href: string;
        label: string;
        reason: string;
        suggestedQuestion: string;
      }
    | null;
  /** Called when the user dismisses the inline Community CTA. */
  onDismissCommunityCta?: () => void;
  /** Id of the currently active mentor mode, or null if none. */
  mentorModeId?: string | null;
  /** Called when the user selects a mentor mode. Pass null to clear. */
  onSelectMentorMode?: (id: string | null) => void;
};

// ─── Starter prompts ──────────────────────────────────────────────────────────

const STARTERS = CHAT_STARTER_PICKS;

// ─── Simple markdown renderer ─────────────────────────────────────────────────
// Handles: **bold**, `inline code`, line breaks, and - bullet lists.
// No external dependencies.

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function renderMarkdown(text: string): React.ReactNode[] {
  // Strip raw audio/image base64 tags — render as clean player/image
  let cleaned = text.replace(
    /\[audio:(\d+)s:(data:audio\/[^;]+;base64,[^\]]+)\]/g,
    (_match, dur, dataUri) => `[__AUDIO_PLAYER__:${dur}:${dataUri}]`,
  );
  cleaned = cleaned.replace(
    /\[image:(data:image\/[^;]+;base64,[^\]]+)\]/g,
    (_match, dataUri) => `[__IMAGE_EMBED__:${dataUri}]`,
  );

  const lines = cleaned.split("\n");
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Audio player placeholder
    const audioMatch = /\[__AUDIO_PLAYER__:(\d+):(data:audio\/[^:]+;base64,[^\]]+)\]/.exec(line);
    if (audioMatch) {
      const dur = parseInt(audioMatch[1], 10);
      const src = audioMatch[2];
      nodes.push(
        <div key={`audio-${i}`} className="flex items-center gap-2 rounded-lg bg-zinc-800/60 px-3 py-2 my-1">
          <audio controls preload="metadata" className="h-8 max-w-full" src={src} />
          <span className="text-xs text-zinc-500">{dur > 0 ? `${dur}s` : "Nota de voz"}</span>
        </div>
      );
      continue;
    }

    // Image embed placeholder
    const imageMatch = /\[__IMAGE_EMBED__:(data:image\/[^:]+;base64,[^\]]+)\]/.exec(line);
    if (imageMatch) {
      nodes.push(
        <div key={`img-${i}`} className="my-2">
          <img
            src={imageMatch[1]}
            alt="Imagen adjunta"
            className="max-w-xs max-h-64 rounded-xl border border-zinc-700 object-contain"
          />
        </div>
      );
      continue;
    }

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
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-xs text-cyan-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// ─── Inline signup prompt ─────────────────────────────────────────────────────

function SignupPromptBubble({
  message,
  onSubmit,
  onDismiss,
}: {
  message: ChatMessage;
  onSubmit?: (email: string) => Promise<void> | void;
  onDismiss?: (messageId: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Revisa el formato del email.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit?.(trimmed);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar. Prueba otra vez.");
    } finally {
      setSubmitting(false);
    }
  }, [email, onSubmit]);

  if (done) {
    return (
      <div className="flex items-start gap-2.5 px-1">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
          <p className="text-sm leading-relaxed text-emerald-100">
            Listo. Tu progreso queda guardado. Podrás volver desde cualquier dispositivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 px-1">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30">
        <Heart className="h-3.5 w-3.5 text-cyan-400" />
      </div>
      <div className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-950/15 p-3.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
          ¿Guardamos este avance?
        </p>
        <p className="mb-3 text-sm leading-relaxed text-zinc-200">
          Has empezado algo importante. Si quieres conservar esta conversación, tu diario y
          tus próximos pasos, deja tu email. Podrás volver desde cualquier dispositivo.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            disabled={submitting}
            autoComplete="email"
            required
          />
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
          >
            {submitting ? "Guardando..." : "Guardar mi cuenta"}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
        <button
          type="button"
          onClick={() => onDismiss?.(message.id)}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          No, ahora no
        </button>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
  onQuickReply,
}: {
  message: ChatMessage;
  isStreaming: boolean;
  onQuickReply?: (text: string) => void;
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
      <div className="flex items-start gap-2 px-1" role="alert">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20">
          <Shield className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
        </div>
        <div className="flex-1 rounded-xl border border-red-500/30 bg-red-950/30 p-3.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-red-400">
            Alerta de seguridad
          </p>
          <div className="text-sm leading-relaxed text-red-100">
            {renderMarkdown(message.content)}
          </div>
          {/* Emergency call button */}
          <a
            href="tel:024"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 active:scale-[0.98]"
          >
            <Phone className="h-4 w-4" />
            Llamar al 024
          </a>
          <div className="mt-2 flex gap-2">
            <a
              href="tel:8002900024"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-950/50 px-2 py-1.5 text-[11px] font-semibold text-red-200 transition hover:bg-red-900/40"
            >
              <Phone className="h-3 w-3" />
              MX: 800 290 0024
            </a>
            <a
              href="tel:01152751135"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-950/50 px-2 py-1.5 text-[11px] font-semibold text-red-200 transition hover:bg-red-900/40"
            >
              <Phone className="h-3 w-3" />
              AR: 011 5275-1135
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              void fetch("/api/user/crisis-exit", { method: "POST", credentials: "include" })
                .then(() => { window.location.reload(); });
            }}
            className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          >
            Ya me siento mejor — salir del modo crisis
          </button>
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
          {onQuickReply ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onQuickReply("Ahora no, lo retomo más tarde.")}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-100 transition hover:bg-amber-500/20"
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={() => onQuickReply("Ya no aplica, lo cierro.")}
                className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-[11px] text-zinc-300 transition hover:bg-zinc-800"
              >
                Ya no aplica
              </button>
              <button
                type="button"
                onClick={() => onQuickReply("Sí, lo voy a hacer hoy.")}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100 transition hover:bg-cyan-500/20"
              >
                Sí, lo voy a hacer
              </button>
            </div>
          ) : null}
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
                : "bg-cyan-600 text-white"
            }`}
          >
            <div className="text-sm leading-relaxed">{renderMarkdown(message.content)}</div>
          </div>
          {message.createdAt && (
            <p className="mt-0.5 text-right text-[10px] text-zinc-600">{formatMsgTime(message.createdAt)}</p>
          )}
          <button
            onClick={() => void handleCopy()}
            aria-label={copied ? "Copiado" : "Copiar mensaje"}
            className="absolute -left-10 top-0 p-2 opacity-0 transition-opacity group-hover:opacity-100"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // Assistant message — left-aligned
  return (
    <div className="flex items-start gap-2.5 px-1">
      {/* AI avatar */}
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30">
        <Sparkles className="h-3 w-3 text-cyan-400" />
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
          <>
            {message.createdAt && (
              <p className="mt-0.5 text-[10px] text-zinc-600">{formatMsgTime(message.createdAt)}</p>
            )}
            <button
              onClick={() => void handleCopy()}
              aria-label={copied ? "Copiado" : "Copiar respuesta"}
              className="absolute -right-10 top-0 p-2 opacity-0 transition-opacity group-hover:opacity-100"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Urgent / crisis panel ────────────────────────────────────────────────────

function UrgentPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="shrink-0 border-b border-red-500/30 bg-red-950/30 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-red-400" />
          <span className="text-sm font-semibold text-red-300">Modo crisis activado</span>
        </div>
        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Emergency call buttons ──────────────────────────────────── */}
      <div className="mb-3 space-y-2">
        <a
          href="tel:024"
          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 active:scale-[0.98]"
        >
          <Phone className="h-5 w-5" />
          Llamar al 024
        </a>
        <div className="grid grid-cols-2 gap-2">
          <a
            href="tel:8002900024"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/50 px-3 py-2.5 text-xs font-semibold text-red-200 transition hover:bg-red-900/40 active:scale-[0.98]"
          >
            <Phone className="h-3.5 w-3.5" />
            Mexico: 800 290 0024
          </a>
          <a
            href="tel:01152751135"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/50 px-3 py-2.5 text-xs font-semibold text-red-200 transition hover:bg-red-900/40 active:scale-[0.98]"
          >
            <Phone className="h-3.5 w-3.5" />
            Argentina: 011 5275-1135
          </a>
        </div>
      </div>

      <div className="space-y-3 text-xs text-zinc-300">
        <div className="rounded-xl border border-red-500/20 bg-red-900/20 px-3 py-2.5">
          <p className="mb-1 font-semibold text-red-300">Respiracion 4-7-8</p>
          <p>Inhala 4 seg · reten 7 seg · exhala 8 seg. Repite 3 veces.</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
          <p className="mb-1 font-semibold text-zinc-200">Tecnica 5-4-3-2-1</p>
          <p>5 cosas que ves · 4 que tocas · 3 que oyes · 2 que hueles · 1 que saboreas.</p>
        </div>
        <p className="text-zinc-500">Cuentame lo que esta pasando. Estoy aqui contigo.</p>
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
  error,
  actionLock,
  responseSignals,
  onSend,
  onUseStarterExample,
  draftKey,
  conversationId,
  onRateSession,
  journalMode = false,
  onToggleJournal,
  proactivePrompt,
  onCaptureEmail,
  onDismissSignupPrompt,
  communityCta,
  onDismissCommunityCta,
  mentorModeId,
  onSelectMentorMode,
}: ChatProps) {
  const activeMentorMode = getMentorMode(mentorModeId ?? null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [urgentMode, setUrgentMode] = useState(false);
  const [sessionRating, setSessionRating] = useState<1 | -1 | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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
    if (setInput) {
      setInput(value);
      return;
    }
    onInputChange?.(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!loading && (input.trim() || attachedImage || attachedAudio)) void handleSendWithAttachments();
    }
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    // Compress if > 500KB — resize to max 1200px
    if (file.size > 500 * 1024) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.8);
        setAttachedImage(compressed);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } else {
      const reader = new FileReader();
      reader.onload = () => setAttachedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSendWithAttachments = () => {
    const parts: string[] = [];
    const userText = input.trim();

    if (attachedAudio) {
      // Skip empty/broken audio (0s duration or tiny base64)
      if (audioDuration < 1 || attachedAudio.length < 1000) {
        setAttachedAudio(null);
        setAudioDuration(0);
        return;
      }
      parts.push(userText || "Nota de voz");
      parts.push(`\n\n[audio:${audioDuration}s:${attachedAudio}]`);
      setAttachedAudio(null);
      setAudioDuration(0);
    } else if (attachedImage) {
      parts.push(userText || "Mira esta imagen");
      parts.push(`\n\n[image:${attachedImage}]`);
      setAttachedImage(null);
    } else if (userText) {
      void onSend();
      return;
    } else {
      return;
    }

    void onSend(parts.join(""));
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
    <div className="flex flex-1 min-h-0 flex-col bg-zinc-950" role="region" aria-label="Chat de mentoría">
      {/* ── Flow indicator ──────────────────────────────────────────────── */}
      {flowActive && (
        <div className="shrink-0 border-b border-zinc-800/60 bg-cyan-950/30 px-4 py-2">
          <p className="text-xs text-cyan-400">
            Flujo activo: <span className="font-semibold">{flowActive}</span>
            {responseSignals?.flow?.instruction && (
              <span className="ml-2 text-zinc-500">— {responseSignals.flow.instruction}</span>
            )}
          </p>
        </div>
      )}

      {/* ── Crisis panel ─────────────────────────────────────────────────── */}
      {urgentMode && <UrgentPanel onClose={() => setUrgentMode(false)} />}

      {/* ── Journal mode banner ──────────────────────────────────────────── */}
      {journalMode && (
        <div className="shrink-0 border-b border-indigo-500/20 bg-indigo-950/20 px-4 py-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
            <p className="text-xs text-indigo-300">
              <span className="font-semibold">Modo diario activo.</span> La IA no responderá.
              Escribe libremente.
            </p>
          </div>
        </div>
      )}

      {/* ── Action lock banner ───────────────────────────────────────────── */}
      {actionLock && (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-950/20 px-4 py-2.5">
          <p className="text-xs text-amber-300">
            <span className="font-semibold">Hilo abierto:</span>{" "}
            <span className="italic">{actionLock.actionTitle}</span>
          </p>
          <p className="mt-0.5 text-xs text-amber-500/80">{actionLock.message}</p>
          <p className="mt-1 text-[10px] text-amber-600/60">
            Puedes retomarlo, aparcarlo para luego o cerrarlo. Tú decides.
          </p>
        </div>
      )}

      {/* ── Session / API error banner ──────────────────────────────────── */}
      {error && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-950/30 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      )}

      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto" role="log" aria-label="Mensajes del chat" aria-live="polite">
        {isEmpty ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20">
              <Sparkles className="h-5 w-5 text-cyan-400" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-white">
              ¿En qué te puedo ayudar hoy?
            </h3>
            <p className="mb-3 max-w-sm text-xs text-zinc-600 leading-relaxed">
              Te hago las preguntas que no te estás haciendo, para que veas lo que todavía no estás viendo.
            </p>
            {proactivePrompt ? (
              <button
                onClick={() => handleStarterClick(proactivePrompt)}
                className="mb-5 max-w-xs rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200 transition hover:bg-indigo-500/20 active:scale-[0.98]"
              >
                <span className="mr-1 text-indigo-400">✦</span>
                {proactivePrompt}
              </button>
            ) : (
              <p className="mb-6 text-sm text-zinc-500">
                Escribe lo que te pasa o elige un punto de partida.
              </p>
            )}
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
            {onSelectMentorMode ? (
              <div className="mt-6 flex w-full max-w-md flex-col items-center">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  ¿Cómo quieres que te acompañe?
                </p>
                <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                  {MENTOR_MODES.map((mode) => {
                    const isActive = mentorModeId === mode.id;
                    const Icon = MENTOR_MODE_ICONS[mode.icon] ?? Sparkles;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => onSelectMentorMode(isActive ? null : mode.id)}
                        className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${
                          isActive
                            ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-100"
                            : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? "text-cyan-400" : "text-zinc-400"}`} aria-hidden />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold">{mode.label}</span>
                          <span className="text-[11px] leading-snug text-zinc-500">
                            {mode.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] text-zinc-600">
                  Puedes cambiar el modo en cualquier momento.
                </p>
              </div>
            ) : null}
            <div className="mt-5 flex flex-col items-center gap-2 max-w-sm mx-auto">
              <a
                href="https://t.me/TRESMILMILLONESDELATIDOSBOT"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-2.5 text-xs font-medium text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                💬 Llevame en Telegram — mismo mentor, desde el movil
              </a>
              <p className="text-[10px] text-zinc-600">
                Puedes escribir o usar el microfono 🎙️
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 px-3 py-4">
            {messages.map((message) => (
              message.variant === "signup_prompt" ? (
                <SignupPromptBubble
                  key={message.id}
                  message={message}
                  onSubmit={onCaptureEmail}
                  onDismiss={onDismissSignupPrompt}
                />
              ) : (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={streamingMessageId === message.id}
                  onQuickReply={handleStarterClick}
                />
              )
            ))}

            {/* Typing / loading indicator (before assistant responds) */}
            {loading && !streamingMessageId && (
              <div className="flex items-start gap-2.5 px-1 animate-in fade-in duration-300" role="status" aria-label="El mentor esta pensando">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30">
                  <Sparkles className="h-3 w-3 text-cyan-400 animate-pulse" aria-hidden="true" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900 px-3.5 py-2.5">
                  <div className="flex items-center gap-2" aria-hidden="true">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:300ms]" />
                    </div>
                    <span className="text-xs text-zinc-600 animate-pulse">Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Community CTA — shown when mentor detects a recurrent pattern
                 or a question the community could help with. */}
            {!loading && communityCta && (
              <div className="mx-1 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <p className="text-xs text-violet-300 font-semibold uppercase tracking-wide">
                  {communityCta.kind === "ask_community"
                    ? "¿Y si lo consultas con quienes ya han pasado por ahí?"
                    : "Sugerencia del mentor"}
                </p>
                <p className="text-sm text-zinc-200">{communityCta.reason}</p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={communityCta.href}
                    className="rounded-xl bg-violet-500 hover:bg-violet-400 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    {communityCta.label}
                  </a>
                  {onDismissCommunityCta && (
                    <button
                      type="button"
                      onClick={onDismissCommunityCta}
                      className="rounded-xl px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Ahora no
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Rating row — shown after last AI message finishes */}
            {!loading && conversationId && messages.some((m) => m.role === "assistant") && (
              <div className="flex items-center gap-2 px-1 pb-1">
                <Heart className="h-3 w-3 text-zinc-600" />
                <span className="text-xs text-zinc-600">¿Fue útil?</span>
                <button
                  type="button"
                  onClick={() => {
                    setSessionRating(1);
                    onRateSession?.(1);
                  }}
                  className={`rounded-lg p-2.5 min-h-11 min-w-11 flex items-center justify-center transition ${
                    sessionRating === 1
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-zinc-600 hover:bg-zinc-800 hover:text-emerald-400"
                  }`}
                  title="Útil"
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSessionRating(-1);
                    onRateSession?.(-1);
                  }}
                  className={`rounded-lg p-2.5 min-h-11 min-w-11 flex items-center justify-center transition ${
                    sessionRating === -1
                      ? "bg-red-500/20 text-red-400"
                      : "text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
                  }`}
                  title="No fue útil"
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
                {sessionRating !== null && (
                  <span className="text-xs text-zinc-500">Gracias por tu feedback.</span>
                )}
              </div>
            )}

            <div ref={bottomRef} className="h-1" />
          </div>
        )}

        {/* Scroll to bottom FAB */}
        {!atBottom && (
          <button
            onClick={() => {
              const el = scrollRef.current;
              if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
              setAtBottom(true);
            }}
            aria-label="Ir al ultimo mensaje"
            className="absolute bottom-4 right-4 flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 shadow-lg transition hover:bg-zinc-800 hover:text-white"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 shrink-0 border-t border-zinc-800/60 bg-zinc-950 px-3 py-3" data-tour="chat-input" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        {/* Active mentor mode pill */}
        {activeMentorMode && onSelectMentorMode ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5">
            <span className="flex items-center gap-2 text-xs text-cyan-100">
              <span>{activeMentorMode.icon}</span>
              <span className="font-medium">Modo: {activeMentorMode.label}</span>
            </span>
            <button
              type="button"
              onClick={() => onSelectMentorMode(null)}
              aria-label="Quitar modo"
              className="text-cyan-300/70 transition hover:text-cyan-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
        {/* Image preview */}
        {attachedImage && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
            <img src={attachedImage} alt="Adjunto" className="h-16 w-16 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-400">Imagen adjunta</p>
              <p className="text-[10px] text-zinc-600">Describe lo que muestra — el mentor no puede ver imagenes, pero puede ayudarte con lo que le cuentes</p>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="shrink-0 p-1 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {/* Audio preview */}
        {attachedAudio && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-fuchsia-500/15 flex items-center justify-center shrink-0">
                <Mic className="h-4 w-4 text-fuchsia-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Nota de voz</p>
                <p className="text-xs text-zinc-600">{audioDuration}s grabados</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setAttachedAudio(null); setAudioDuration(0); }}
              className="shrink-0 p-1 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="relative flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribe lo que te pasa… (Enter para enviar)"
            disabled={loading}
            rows={1}
            aria-label="Escribe tu mensaje"
            className="min-h-11 max-h-24 sm:max-h-36 flex-1 resize-none overflow-hidden rounded-xl border-zinc-800 bg-zinc-900 text-base sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-indigo-500/50"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <VoiceRecorder
            onTranscript={(text) => handleInputChange(input ? `${input} ${text}` : text)}
            disabled={loading}
          />
          {/* AudioRecorder y adjuntar imagen ocultos en mobile: liberan ~88px
              de ancho para que el textarea no quede minusculo en iPhone. */}
          <div className="hidden sm:contents">
            <AudioRecorder
              onAudioReady={(base64, dur) => { setAttachedAudio(base64); setAudioDuration(dur); }}
              disabled={loading}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageAttach}
            />
            <Button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={loading}
              size="icon"
              variant="ghost"
              aria-label="Adjuntar imagen"
              className="h-11 w-11 shrink-0 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleSendWithAttachments}
            disabled={loading || (!input.trim() && !attachedImage && !attachedAudio)}
            size="icon"
            aria-label="Enviar mensaje"
            style={{ backgroundColor: "var(--accent-emotion)" }}
            className="h-11 w-11 shrink-0 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <p className="hidden sm:block text-[10px] text-zinc-700">Shift + Enter para nueva línea</p>
            <button
              type="button"
              onClick={() => setUrgentMode((v) => !v)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition ${
                urgentMode ? "bg-red-500/20 text-red-400" : "text-zinc-600 hover:text-red-400"
              }`}
              title="Modo crisis"
            >
              <Zap className="h-3.5 w-3.5" />
              Crisis
            </button>
            {onToggleJournal && (
              <button
                type="button"
                onClick={onToggleJournal}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition ${
                  journalMode
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-zinc-600 hover:text-indigo-400"
                }`}
                title="Modo diario"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Diario
              </button>
            )}
          </div>
          {input.length > 0 && (
            <p className={`text-xs ${input.length > 900 ? "text-amber-500" : "text-zinc-700"}`}>
              {input.length}/1000
            </p>
          )}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-zinc-700">
          IA supervisada por psicologos, mentores y coaches · No sustituye atencion clinica ·{" "}
          <a
            href="tel:024"
            aria-label="Llamar al 024, linea de crisis"
            className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 underline decoration-red-400/40 hover:decoration-red-300 underline-offset-2 font-medium"
          >
            🚨 Crisis: llamar al 024
          </a>
        </p>
      </div>
    </div>
  );
}
