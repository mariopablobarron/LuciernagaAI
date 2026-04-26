"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import Reveal from "@/components/effects/Reveal";

type Role = "user" | "ai";
type Bubble = { id: string; role: Role; text: string };

// Initial scripted exchange (visible on load) — same intent as the previous
// static mockup, kept brief so the demo's interactivity stays the focus.
const INITIAL: Bubble[] = [
  { id: "i-0", role: "user", text: "He empezado mil cosas y no termino ninguna" },
  {
    id: "i-1",
    role: "ai",
    text:
      "Entonces el problema no es energía. Es que algo te suelta el foco antes del cierre. ¿Qué hay en común entre las que dejaste a medias?",
  },
];

// Three canonical prompts. Tapping a chip plays a pre-canned reply that
// illustrates one piece of the method (interpelation / focus / validation).
type DemoChip = {
  id: string;
  user: string;
  ai: string;
};

const CHIPS: DemoChip[] = [
  {
    id: "patron",
    user: "Llevo semanas dando vueltas a lo mismo",
    ai:
      "Llevas semanas y sigues dando vueltas. Eso no es falta de claridad — es algo que estás eligiendo no mover todavía. La pregunta que importa: ¿qué es lo primero que haces cuando el patrón empieza, ese momento concreto donde podrías cortar y no lo haces? Una frase. Eso es todo lo que necesito para devolverte un primer paso real.",
  },
  {
    id: "niebla",
    user: "No sé por dónde empezar",
    ai:
      "Cuando dices «no sé por dónde empezar», casi siempre es que sabes pero hay cinco cosas peleando por ser la primera. No te estoy pidiendo que lo decidas perfecto. Solo: si mañana solo se mueve una de esas cosas, ¿cuál te quitaría más peso al final del día? No la más urgente. La que más pesa. Esa es la primera.",
  },
  {
    id: "desborde",
    user: "Me siento desbordada y no avanzo",
    ai:
      "Antes de avanzar — desbordada no es lo mismo que perezosa, ni que débil. Es que hay más de lo que entra. Lo primero no es hacer más, es ver qué hay. Dime una cosa que llevas en la cabeza ahora mismo y que no le has dicho a nadie. Una. La más pequeña sirve. Empezamos por ahí.",
  },
];

const FREE_TEXT_REPLY =
  "Lo que estás trayendo necesita más espacio que este demo. El mentor real puede sostenerlo en una conversación de verdad, sin script.";

export default function ChatDemo() {
  const [bubbles, setBubbles] = useState<Bubble[]>(INITIAL);
  const [input, setInput] = useState("");
  const [usedChips, setUsedChips] = useState<Set<string>>(new Set());
  const [interacted, setInteracted] = useState(false);
  const [aiTyping, setAiTyping] = useState(true);

  function pushBubble(b: Bubble) {
    setBubbles((prev) => [...prev, b]);
  }

  function handleChip(chip: DemoChip) {
    if (usedChips.has(chip.id)) return;
    setUsedChips((prev) => new Set(prev).add(chip.id));
    setInteracted(true);
    setAiTyping(true);
    pushBubble({ id: `u-${chip.id}`, role: "user", text: chip.user });
    setTimeout(() => {
      pushBubble({ id: `a-${chip.id}`, role: "ai", text: chip.ai });
      setAiTyping(false);
    }, 900);
  }

  function handleFreeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInteracted(true);
    setAiTyping(true);
    setInput("");
    pushBubble({ id: `u-free-${Date.now()}`, role: "user", text });
    setTimeout(() => {
      pushBubble({ id: `a-free-${Date.now()}`, role: "ai", text: FREE_TEXT_REPLY });
      setAiTyping(false);
    }, 900);
  }

  const remainingChips = CHIPS.filter((c) => !usedChips.has(c.id));

  return (
    <div className="relative isolate">
      <div className="absolute -inset-4 bg-linear-to-br from-violet-500/25 via-fuchsia-500/20 to-cyan-500/15 rounded-3xl blur-2xl pointer-events-none -z-10" />
      <div className="relative rounded-2xl border border-zinc-700/60 bg-zinc-900/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-fuchsia-500/10">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
          </div>
          <span className="ml-auto text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            demo · sin registro
          </span>
        </div>

        {/* Messages */}
        <div className="p-4 sm:p-5 space-y-3 max-h-[480px] overflow-y-auto">
          {bubbles.map((msg, i) => (
            <Reveal key={msg.id} delay={i < INITIAL.length ? i * 180 : 0} y={10} blur={3} duration={500}>
              <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "ai" && (
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-violet-600/80 text-white rounded-tr-sm"
                      : "bg-zinc-800 text-zinc-100 border border-zinc-700/50 rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </Reveal>
          ))}

          {aiTyping && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="flex items-center gap-1 px-3.5 py-2 bg-zinc-800 rounded-2xl rounded-tl-sm border border-zinc-700/50">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>

        {/* Chips: visible until all used */}
        {remainingChips.length > 0 && (
          <div className="px-4 sm:px-5 pb-3 flex flex-wrap gap-2">
            {remainingChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChip(chip)}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/20 hover:border-violet-400 transition-colors"
              >
                {chip.user}
              </button>
            ))}
          </div>
        )}

        {/* CTA banner — visible after first interaction */}
        {interacted && (
          <Reveal y={6} blur={2} duration={400}>
            <div className="mx-4 sm:mx-5 mb-3 rounded-xl border border-fuchsia-500/30 bg-linear-to-r from-violet-600/15 to-fuchsia-600/15 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-200 leading-snug">
                ¿Sigues con el mentor real?{" "}
                <span className="text-zinc-400">Sin email, sin tarjeta.</span>
              </p>
              <Link
                href="/app"
                className="inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/30 transition-all whitespace-nowrap"
              >
                Empezar
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        )}

        {/* Real input */}
        <form onSubmit={handleFreeSubmit} className="px-4 sm:px-5 pb-4">
          <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/40 rounded-xl px-4 py-2.5 focus-within:border-violet-500/50 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="O escribe lo que te trae hoy…"
              maxLength={200}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none italic"
              style={{ fontFamily: "var(--font-serif)" }}
              aria-label="Mensaje de demo"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Enviar"
              className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center disabled:opacity-40 hover:brightness-110 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
