"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import Reveal from "@/components/effects/Reveal";
import { bootstrapBrowserSession } from "@/lib/session-client";

/**
 * Chat real (no demo) embedido en la home.
 *
 * Decisión 2026-06-19: la versión "demo" anterior usaba respuestas
 * scripted en español, lo que generaba feedback negativo injusto en
 * todos los idiomas. Pasarlo a "preview estático con CTA" tampoco
 * cumplía la promesa anonymous-first: el usuario tenía que hacer click
 * extra antes de poder escribir.
 *
 * Ahora: lo que escribes va directamente al /api/chat real. Bootstrap
 * automático de sesión anónima al primer envío. SSE streaming. Si tras
 * 3+ turnos el usuario quiere historial guardado, link sutil al chat
 * en pantalla completa (/app), pero la conversación SE PUEDE COMPLETAR
 * aquí mismo.
 */

type Role = "user" | "ai";
type Bubble = { id: string; role: Role; text: string };

type Locale = "es" | "en" | "pt" | "fr" | "de";

const STRINGS: Record<Locale, {
  badge: string;
  userMsg: string;
  mentorMsg: string;
  placeholder: string;
  sendAria: string;
  openFull: string;
  errorGeneric: string;
}> = {
  es: {
    badge: "chat real · sin registro",
    userMsg: "He empezado mil cosas y no termino ninguna",
    mentorMsg:
      "Entonces el problema no es energía. Es que algo te suelta el foco antes del cierre. ¿Qué hay en común entre las que dejaste a medias?",
    placeholder: "Escribe lo que te trae hoy…",
    sendAria: "Enviar",
    openFull: "Abrir en pantalla completa →",
    errorGeneric: "Algo no salió bien. Intenta de nuevo.",
  },
  en: {
    badge: "real chat · no signup",
    userMsg: "I've started a thousand things and finished none",
    mentorMsg:
      "Then the problem isn't energy. It's that something pulls your focus before you close. What do the ones you left half-done have in common?",
    placeholder: "Write what brings you here today…",
    sendAria: "Send",
    openFull: "Open in full screen →",
    errorGeneric: "Something went wrong. Try again.",
  },
  pt: {
    badge: "chat real · sem registo",
    userMsg: "Comecei mil coisas e não acabo nenhuma",
    mentorMsg:
      "Então o problema não é energia. É que alguma coisa te tira o foco antes do fim. O que têm em comum aquelas que deixaste a meio?",
    placeholder: "Escreve o que te traz hoje…",
    sendAria: "Enviar",
    openFull: "Abrir em ecrã inteiro →",
    errorGeneric: "Algo correu mal. Tenta de novo.",
  },
  fr: {
    badge: "chat réel · sans inscription",
    userMsg: "J'ai commencé mille choses et je n'en finis aucune",
    mentorMsg:
      "Alors le problème n'est pas l'énergie. C'est que quelque chose te lâche le focus avant la fin. Qu'ont en commun celles que tu as laissées à moitié ?",
    placeholder: "Écris ce qui t'amène aujourd'hui…",
    sendAria: "Envoyer",
    openFull: "Ouvrir en plein écran →",
    errorGeneric: "Quelque chose a mal tourné. Réessaie.",
  },
  de: {
    badge: "echter Chat · ohne Anmeldung",
    userMsg: "Ich habe tausend Sachen angefangen und keine zu Ende gebracht",
    mentorMsg:
      "Dann ist es kein Energieproblem. Da gibt es etwas, das dir den Fokus nimmt, bevor du fertig wirst. Was haben die Sachen gemeinsam, die du halb liegen gelassen hast?",
    placeholder: "Schreib, was dich heute hierherbringt…",
    sendAria: "Senden",
    openFull: "Im Vollbild öffnen →",
    errorGeneric: "Etwas ist schiefgelaufen. Versuche es noch einmal.",
  },
};

function pickLocale(input: string): Locale {
  return (["es", "en", "pt", "fr", "de"].includes(input) ? input : "es") as Locale;
}

export default function ChatDemo() {
  const localeRaw = useLocale();
  const locale = pickLocale(localeRaw);
  const s = STRINGS[locale];

  // Burbujas iniciales (sirven de preview + arrancan la conversación con
  // ejemplo del estilo del mentor). Cuentan como historial — el usuario
  // puede continuar desde aquí.
  const initialBubbles: Bubble[] = [
    { id: "i-0", role: "user", text: s.userMsg },
    { id: "i-1", role: "ai", text: s.mentorMsg },
  ];

  const [bubbles, setBubbles] = useState<Bubble[]>(initialBubbles);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTurns, setUserTurns] = useState(0);
  const bootstrapped = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bubbles, sending]);

  async function ensureSession(): Promise<boolean> {
    if (bootstrapped.current) return true;
    try {
      const result = await bootstrapBrowserSession();
      bootstrapped.current = result.ok === true;
      return bootstrapped.current;
    } catch {
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError(null);
    setBubbles((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setUserTurns((n) => n + 1);
    setSending(true);

    const sessionOk = await ensureSession();
    if (!sessionOk) {
      setError(s.errorGeneric);
      setSending(false);
      return;
    }

    const aiId = `a-${Date.now()}`;
    setBubbles((prev) => [...prev, { id: aiId, role: "ai", text: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          locale,
          // mentorPrefs deliberadamente omitido: home chat es vanilla
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6)) as {
              type?: string;
              delta?: string;
            };
            if (payload.type === "delta" && payload.delta) {
              accumulated += payload.delta;
              setBubbles((prev) =>
                prev.map((b) => (b.id === aiId ? { ...b, text: accumulated } : b)),
              );
            }
          } catch {
            // Ignora líneas que no son JSON (heartbeat, etc.)
          }
        }
      }
    } catch {
      setError(s.errorGeneric);
      setBubbles((prev) => prev.filter((b) => b.id !== aiId));
    } finally {
      setSending(false);
    }
  }

  // Tras 3+ turnos del usuario, sugerir migrar a pantalla completa con
  // historial guardado. NO obligatorio — la conversación sigue funcionando
  // aquí, pero /app tiene goals/actions/circles que no caben en este frame.
  const showFullCTA = userTurns >= 3;

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
            {s.badge}
          </span>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="p-4 sm:p-5 space-y-3 max-h-[480px] overflow-y-auto"
        >
          {bubbles.map((msg, i) => (
            <Reveal
              key={msg.id}
              delay={i < initialBubbles.length ? i * 180 : 0}
              y={10}
              blur={3}
              duration={500}
            >
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
                  {msg.text || (msg.role === "ai" && sending ? "…" : "")}
                </div>
              </div>
            </Reveal>
          ))}

          {sending && bubbles[bubbles.length - 1]?.role === "user" && (
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

        {/* Sugerencia de migrar a pantalla completa — solo si lleva varios turnos */}
        {showFullCTA && (
          <Reveal y={6} blur={2} duration={400}>
            <div className="mx-4 sm:mx-5 mb-3">
              <Link
                href="/app"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 hover:text-violet-200 transition-colors"
              >
                {s.openFull}
              </Link>
            </div>
          </Reveal>
        )}

        {/* Error (silencioso, sin bloquear) */}
        {error && (
          <div className="mx-4 sm:mx-5 mb-2 text-[11px] text-rose-300/80">
            {error}
          </div>
        )}

        {/* Input REAL */}
        <form onSubmit={handleSubmit} className="px-4 sm:px-5 pb-4">
          <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/40 rounded-xl px-4 py-2.5 focus-within:border-violet-500/50 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={s.placeholder}
              maxLength={500}
              disabled={sending}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none italic disabled:opacity-60"
              style={{ fontFamily: "var(--font-serif)" }}
              aria-label={s.placeholder}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label={s.sendAria}
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
