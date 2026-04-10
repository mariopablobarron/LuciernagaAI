"use client";

import { useState } from "react";
import { Send, RotateCcw } from "lucide-react";

interface MirrorRevealProps {
  prompt?: string;
  onSubmit: (text: string) => Promise<string>;
  className?: string;
}

function GlassesSVG({ className }: { className?: string }) {
  return (
    <svg width="80" height="36" viewBox="0 0 80 36" className={className}>
      <defs>
        <linearGradient id="lens-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect x="2" y="8" width="30" height="22" rx="8" fill="none" stroke="url(#lens-grad)" strokeWidth="2.5" />
      <rect x="48" y="8" width="30" height="22" rx="8" fill="none" stroke="url(#lens-grad)" strokeWidth="2.5" />
      <path d="M32 19 Q40 12 48 19" fill="none" stroke="url(#lens-grad)" strokeWidth="2.5" />
      <line x1="2" y1="18" x2="0" y2="14" stroke="url(#lens-grad)" strokeWidth="2" strokeLinecap="round" />
      <line x1="78" y1="18" x2="80" y2="14" stroke="url(#lens-grad)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function MirrorReveal({
  prompt = "¿Qué te frena ahora mismo?",
  onSubmit,
  className,
}: MirrorRevealProps) {
  const [step, setStep] = useState<"input" | "animating" | "revealed">("input");
  const [userText, setUserText] = useState("");
  const [reframed, setReframed] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!userText.trim() || loading) return;
    setLoading(true);
    setStep("animating");

    try {
      const result = await onSubmit(userText.trim());
      setReframed(result);
      // Wait for animation to settle
      setTimeout(() => setStep("revealed"), 1400);
    } catch {
      setReframed("No pude ver más allá esta vez. Inténtalo de nuevo.");
      setTimeout(() => setStep("revealed"), 1400);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("input");
    setUserText("");
    setReframed("");
  }

  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 ${className ?? ""}`}>
      {/* Step 1: Input */}
      {step === "input" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <GlassesSVG className="shrink-0 opacity-60" />
            <div>
              <h3 className="text-base font-semibold text-white">El espejo que no miente</h3>
              <p className="text-xs text-zinc-500">Escribe y descubre lo que no estás viendo</p>
            </div>
          </div>

          <p className="text-sm font-medium text-zinc-300">{prompt}</p>

          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            rows={3}
            maxLength={500}
            placeholder="Escribe lo que sientes..."
            className="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          />

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-600">{userText.length}/500 · Cmd+Enter para enviar</p>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!userText.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              Mirar
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Animating */}
      {step === "animating" && (
        <div className="relative flex flex-col items-center justify-center py-8 space-y-6">
          {/* Lens flare glow */}
          <div className="animate-lens-flare absolute inset-0 rounded-2xl bg-[radial-gradient(circle,rgba(139,92,246,0.2)_0%,rgba(6,182,234,0.05)_50%,transparent_80%)]" />

          {/* Glasses dropping */}
          <div className="animate-glasses-drop">
            <GlassesSVG />
          </div>

          {/* User text morphing out */}
          <div className="animate-text-morph-out max-w-sm text-center">
            <p className="text-sm text-zinc-400 italic">&ldquo;{userText}&rdquo;</p>
          </div>

          {loading && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:300ms]" />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Revealed */}
      {step === "revealed" && (
        <div className="space-y-5">
          {/* Original text (small, faded) */}
          <div className="text-center">
            <p className="text-xs text-zinc-600">Tú dijiste:</p>
            <p className="text-sm text-zinc-500 italic">&ldquo;{userText}&rdquo;</p>
          </div>

          {/* Glasses icon */}
          <div className="flex justify-center">
            <GlassesSVG className="opacity-80" />
          </div>

          {/* Reframed text */}
          <div className="animate-text-morph-in border-l-2 border-violet-500 pl-4" aria-live="polite">
            <p className="text-sm font-medium leading-relaxed text-cyan-300">{reframed}</p>
          </div>

          {/* The question */}
          <p
            className="text-center text-sm italic text-zinc-400"
            style={{ animation: "text-morph-in 600ms ease-out 500ms both" }}
          >
            ¿Lo ves ahora?
          </p>

          {/* Reset */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:text-zinc-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Volver a mirar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
