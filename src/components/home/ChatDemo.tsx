"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import Reveal from "@/components/effects/Reveal";

/**
 * Vista previa estática del chat — NO interactiva.
 *
 * Decisión 2026-06-19: el demo anterior tenía input libre + chips con
 * respuestas hardcoded en español. Auditoría externa (estudiante alemán)
 * reveló que muchos usuarios creían estar chateando con el producto cuando
 * en realidad recibían respuestas scripted, lo que generaba feedback
 * negativo injusto ("chat malo / respuestas cortas / no entiende alemán").
 *
 * Ahora: muestra UN intercambio real de ejemplo (no editable) traducido al
 * locale activo + UN CTA grande para abrir el chat REAL en /app. Cero
 * ambigüedad: queda claro que es una muestra, no el producto.
 */

type Locale = "es" | "en" | "pt" | "fr" | "de";

const STRINGS: Record<Locale, {
  badge: string;
  userMsg: string;
  mentorMsg: string;
  cta: string;
  ctaSubtitle: string;
}> = {
  es: {
    badge: "ejemplo de una conversación real",
    userMsg: "He empezado mil cosas y no termino ninguna",
    mentorMsg:
      "Entonces el problema no es energía. Es que algo te suelta el foco antes del cierre. ¿Qué hay en común entre las que dejaste a medias?",
    cta: "Empezar a chatear",
    ctaSubtitle: "Sin email. Sin tarjeta. Escribes y respondo.",
  },
  en: {
    badge: "example of a real conversation",
    userMsg: "I've started a thousand things and finished none",
    mentorMsg:
      "Then the problem isn't energy. It's that something pulls your focus before you close. What do the ones you left half-done have in common?",
    cta: "Start chatting",
    ctaSubtitle: "No email. No card. You write, I reply.",
  },
  pt: {
    badge: "exemplo de uma conversa real",
    userMsg: "Comecei mil coisas e não acabo nenhuma",
    mentorMsg:
      "Então o problema não é energia. É que alguma coisa te tira o foco antes do fim. O que têm em comum aquelas que deixaste a meio?",
    cta: "Começar a falar",
    ctaSubtitle: "Sem email. Sem cartão. Escreves e eu respondo.",
  },
  fr: {
    badge: "exemple d'une vraie conversation",
    userMsg: "J'ai commencé mille choses et je n'en finis aucune",
    mentorMsg:
      "Alors le problème n'est pas l'énergie. C'est que quelque chose te lâche le focus avant la fin. Qu'ont en commun celles que tu as laissées à moitié ?",
    cta: "Commencer à parler",
    ctaSubtitle: "Sans email. Sans carte. Tu écris, je réponds.",
  },
  de: {
    badge: "Beispiel eines echten Gesprächs",
    userMsg: "Ich habe tausend Sachen angefangen und keine zu Ende gebracht",
    mentorMsg:
      "Dann ist es kein Energieproblem. Da gibt es etwas, das dir den Fokus nimmt, bevor du fertig wirst. Was haben die Sachen gemeinsam, die du halb liegen gelassen hast?",
    cta: "Jetzt schreiben",
    ctaSubtitle: "Keine E-Mail. Keine Karte. Du schreibst, ich antworte.",
  },
};

function pickLocale(input: string): Locale {
  return (["es", "en", "pt", "fr", "de"].includes(input) ? input : "es") as Locale;
}

export default function ChatDemo() {
  const localeRaw = useLocale();
  const s = STRINGS[pickLocale(localeRaw)];

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

        {/* Static preview — solo 2 bubbles */}
        <div className="p-4 sm:p-5 space-y-3">
          <Reveal y={10} blur={3} duration={500}>
            <div className="flex justify-end">
              <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed whitespace-pre-wrap bg-violet-600/80 text-white">
                {s.userMsg}
              </div>
            </div>
          </Reveal>
          <Reveal y={10} blur={3} duration={500} delay={250}>
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                <Sparkles className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap bg-zinc-800 text-zinc-100 border border-zinc-700/50">
                {s.mentorMsg}
              </div>
            </div>
          </Reveal>
        </div>

        {/* CTA prominente — siempre visible */}
        <Reveal y={6} blur={2} duration={500} delay={550}>
          <div className="mx-4 sm:mx-5 mb-4 mt-2">
            <Link
              href="/app"
              className="group flex items-center justify-between gap-3 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 px-5 py-4 shadow-lg shadow-fuchsia-500/30 transition-all"
            >
              <div className="flex flex-col text-left">
                <span className="text-base font-bold text-white leading-tight">
                  {s.cta}
                </span>
                <span className="text-xs text-white/80 leading-tight mt-0.5">
                  {s.ctaSubtitle}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
