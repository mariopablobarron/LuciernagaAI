"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import {
  ENNEAGRAM_TYPE_DESCRIPTIONS,
  ENNEAGRAM_TYPE_NAMES,
  getOrderedItems,
  type EnneagramType,
  type LikertAnswer,
} from "@/data/enneagram-oeps";

const STORAGE_KEY = "enneagram:draft:v1";
const PAGE_SIZE = 10;

const LIKERT_LABELS: Record<LikertAnswer, string> = {
  1: "Nada de acuerdo",
  2: "Un poco",
  3: "Regular",
  4: "Bastante",
  5: "Totalmente",
};

type ResultPayload = {
  assessmentId: string;
  dominantType: EnneagramType;
  wing: EnneagramType | null;
  scoresByType: Record<`type${EnneagramType}`, number>;
  ranking: Array<{ type: EnneagramType; score: number }>;
};

type ExistingAssessment = {
  id: string;
  dominantType: number;
  wing: number | null;
  scoresByType: Record<`type${EnneagramType}`, number>;
  completedAt: string;
};

export default function EnneagramPage() {
  const router = useRouter();
  const items = useMemo(() => getOrderedItems(), []);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);

  const [phase, setPhase] = useState<"loading" | "intro" | "running" | "submitting" | "result">(
    "loading"
  );
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LikertAnswer>>({});
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [existing, setExisting] = useState<ExistingAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial: ¿tiene resultado previo? + draft local.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/enneagram/me", { credentials: "include" });
        if (res.status === 401) {
          router.replace("/app/inicio?next=/profile/eneagrama");
          return;
        }
        const data = (await res.json()) as { assessment: ExistingAssessment | null };
        if (!cancelled && data.assessment) {
          setExisting(data.assessment);
        }
      } catch {
        // ignore — el test funciona sin backend hasta el submit.
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { answers?: Record<string, LikertAnswer>; page?: number };
          if (parsed.answers && typeof parsed.answers === "object") {
            setAnswers(parsed.answers);
          }
          if (typeof parsed.page === "number") {
            setPage(Math.max(0, Math.min(totalPages - 1, parsed.page)));
          }
        }
      } catch {
        // ignore
      }

      if (!cancelled) setPhase("intro");
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, totalPages]);

  // Autosave por respuesta.
  useEffect(() => {
    if (phase !== "running") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, page }));
    } catch {
      // ignore — quota / privacidad estricta.
    }
  }, [answers, page, phase]);

  const answeredCount = Object.keys(answers).length;
  const totalCount = items.length;
  const progress = Math.round((answeredCount / totalCount) * 100);

  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allCurrentAnswered = pageItems.every((it) => answers[it.id] !== undefined);

  const handleAnswer = useCallback((id: string, value: LikertAnswer) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch("/api/enneagram/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json()) as Partial<ResultPayload> & { success?: boolean; error?: string };
      if (!res.ok || !data.success || !data.dominantType) {
        setError("No pudimos guardar el resultado. Prueba de nuevo en un rato.");
        setPhase("running");
        return;
      }
      setResult({
        assessmentId: data.assessmentId!,
        dominantType: data.dominantType,
        wing: data.wing ?? null,
        scoresByType: data.scoresByType!,
        ranking: data.ranking!,
      });
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setPhase("result");
    } catch {
      setError("Sin conexión. Tus respuestas siguen guardadas localmente.");
      setPhase("running");
    }
  }, [answers]);

  const handleReset = useCallback(() => {
    setAnswers({});
    setPage(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setPhase("running");
  }, []);

  if (phase === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center text-zinc-400">
        Cargando…
      </main>
    );
  }

  if (phase === "result" && result) {
    return <ResultView result={result} onReset={handleReset} />;
  }

  if (phase === "intro") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12 space-y-6">
        <div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a mi perfil
          </Link>
        </div>
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300">
            Test del Eneagrama
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            ¿Cómo te entiende mejor el mentor?
          </h1>
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
            90 frases. Marcas en cuánto te identificas. Al final tendrás tu tipo dominante y, lo
            más importante, el mentor adaptará su tono y sus preguntas a cómo funcionas tú.
          </p>
        </header>

        <ul className="space-y-2 text-sm text-zinc-400">
          <li>• Tarda unos 10-12 minutos.</li>
          <li>• Puedes pausar y volver: tus respuestas quedan guardadas en este navegador.</li>
          <li>• Solo guardamos el resultado final (tipo + scores), no las respuestas individuales.</li>
        </ul>

        {existing ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
            <p className="text-sm text-emerald-200 font-semibold">
              Ya hiciste el test antes
            </p>
            <p className="text-sm text-zinc-300">
              Tipo dominante: <span className="font-bold text-white">
                {ENNEAGRAM_TYPE_NAMES[existing.dominantType as EnneagramType]} (tipo {existing.dominantType})
              </span>
              {existing.wing ? <> · ala {existing.wing}</> : null}
            </p>
            <p className="text-xs text-zinc-500">
              Hecho el {new Date(existing.completedAt).toLocaleDateString("es-ES", { dateStyle: "long" })}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPhase("running")}
            className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 px-5 py-3 text-base font-bold text-white transition-colors"
          >
            {answeredCount > 0 ? `Continuar (${answeredCount}/${totalCount})` : "Empezar el test"}
          </button>
          {answeredCount > 0 ? (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-zinc-700 hover:bg-zinc-800 px-4 py-3 text-sm text-zinc-300 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" /> Empezar de cero
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>Bloque {page + 1} de {totalPages}</span>
          <span>{answeredCount}/{totalCount} respondidas</span>
        </div>
        <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-fuchsia-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ol className="space-y-5">
        {pageItems.map((item, idx) => (
          <li key={item.id} className="space-y-3">
            <p className="text-base sm:text-lg text-zinc-100 leading-relaxed">
              <span className="text-zinc-500 mr-2">{page * PAGE_SIZE + idx + 1}.</span>
              {item.text}
            </p>
            <div
              role="radiogroup"
              aria-label={item.text}
              className="flex flex-wrap gap-2"
            >
              {([1, 2, 3, 4, 5] as LikertAnswer[]).map((v) => {
                const selected = answers[item.id] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleAnswer(item.id, v)}
                    className={`rounded-lg px-3 py-2 text-sm border transition-colors min-w-11 ${
                      selected
                        ? "bg-fuchsia-600 border-fuchsia-500 text-white font-bold"
                        : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span className="block text-base font-bold">{v}</span>
                    <span className="block text-[10px] opacity-80">{LIKERT_LABELS[v]}</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 px-3 py-2 text-sm text-zinc-300 disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" /> Anterior
        </button>

        {page < totalPages - 1 ? (
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={!allCurrentAnswered}
            className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Siguiente <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!allCurrentAnswered || phase === "submitting"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {phase === "submitting" ? "Calculando…" : "Ver mi resultado"}
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </main>
  );
}

function ResultView({ result, onReset }: { result: ResultPayload; onReset: () => void }) {
  const dominantName = ENNEAGRAM_TYPE_NAMES[result.dominantType];
  const dominantDesc = ENNEAGRAM_TYPE_DESCRIPTIONS[result.dominantType];
  const top3 = result.ranking.slice(0, 3);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12 space-y-6">
      <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 to-violet-500/5 p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300 inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Tu tipo dominante
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          {dominantName} <span className="text-fuchsia-300">— tipo {result.dominantType}</span>
          {result.wing ? <span className="text-zinc-400 text-2xl"> con ala {result.wing}</span> : null}
        </h1>
        <p className="text-base text-zinc-200 leading-relaxed">{dominantDesc}</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
        <p className="text-sm font-semibold text-zinc-300">Cómo lo va a usar el mentor</p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          A partir de ahora ajustará el tono y el tipo de preguntas a cómo funcionas tú.
          Si en algún momento no te encaja, puedes repetir el test cuando quieras.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
        <p className="text-sm font-semibold text-zinc-300">Top 3 — los 3 con más score</p>
        <ul className="space-y-2">
          {top3.map((r) => {
            const max = top3[0].score;
            const pct = max > 0 ? Math.round((r.score / max) * 100) : 0;
            return (
              <li key={r.type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-200">
                    Tipo {r.type} — {ENNEAGRAM_TYPE_NAMES[r.type]}
                  </span>
                  <span className="text-zinc-500 font-mono">{r.score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-fuchsia-500/70" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/app"
          className="rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 px-5 py-3 text-base font-bold text-white transition-colors"
        >
          Volver al chat
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-zinc-700 hover:bg-zinc-800 px-4 py-3 text-sm text-zinc-300 inline-flex items-center gap-1.5"
        >
          <RotateCcw className="h-4 w-4" /> Repetir el test
        </button>
      </div>
    </main>
  );
}
