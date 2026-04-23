"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  HandHeart,
  HelpCircle,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  ThumbsUp,
  Users,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";

type WindowStats = {
  questions: number;
  questionsAnswered: number;
  answerRate: number;
  answers: number;
  avgAnswersPerQuestion: number;
  crisisQuestions: number;
  hiddenQuestions: number;
  helpfulVotes: number;
  answersWithVotes: number;
  helpfulnessRate: number;
  distinctAnswerers: number;
  distinctAskers: number;
};

type StatsResponse = {
  totals: { questions: number; answers: number };
  last7d: WindowStats;
  last30d: WindowStats;
  histogram30d: Record<string, number>;
  topAnswerers30d: Array<{ userId: string; answers: number }>;
};

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
  accent: "violet" | "cyan" | "emerald" | "amber" | "red";
}) {
  const iconColor: Record<string, string> = {
    violet: "text-violet-400",
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <Icon className={`h-5 w-5 mb-2 ${iconColor[accent]}`} />
      <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function WindowSection({ title, w }: { title: string; w: WindowStats }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={HelpCircle}
          accent="violet"
          label="Preguntas"
          value={w.questions.toLocaleString()}
          sub={`${w.distinctAskers} personas distintas`}
        />
        <Kpi
          icon={MessageCircle}
          accent="cyan"
          label="Respuestas"
          value={w.answers.toLocaleString()}
          sub={`${w.distinctAnswerers} personas ayudando`}
        />
        <Kpi
          icon={HandHeart}
          accent="emerald"
          label="Tasa de respuesta"
          value={pct(w.answerRate)}
          sub={`${w.questionsAnswered}/${w.questions} preguntas con al menos 1 respuesta`}
        />
        <Kpi
          icon={MessageCircle}
          accent="cyan"
          label="Respuestas/pregunta"
          value={w.avgAnswersPerQuestion.toFixed(1)}
          sub="Media en la ventana"
        />
        <Kpi
          icon={ThumbsUp}
          accent="emerald"
          label="Votos útiles"
          value={w.helpfulVotes.toLocaleString()}
          sub={`Sobre ${w.answers} respuestas`}
        />
        <Kpi
          icon={ThumbsUp}
          accent="emerald"
          label="Helpfulness rate"
          value={pct(w.helpfulnessRate)}
          sub="Votos útiles / respuestas"
        />
        <Kpi
          icon={ShieldAlert}
          accent="red"
          label="Crisis detectadas"
          value={w.crisisQuestions.toLocaleString()}
          sub="Señales de ideación"
        />
        <Kpi
          icon={AlertTriangle}
          accent="amber"
          label="Ocultadas (moderación)"
          value={w.hiddenQuestions.toLocaleString()}
          sub="Por guardrails o reportes"
        />
      </div>
    </div>
  );
}

export default function CommunityQuestionsStatsPage() {
  const router = useRouter();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/community/questions-stats", {
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setData(await res.json());
    } catch {
      toast.error("Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { credentials: "include", method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  const histogramTotal = data
    ? Object.values(data.histogram30d).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <AdminShell
      title="Comunidad · Preguntas y ayuda mutua"
      subtitle="Señales para decidir si la cadena de favores funciona. Datos reales, no impresiones."
      onLogout={handleLogout}
      showSectionNav={false}
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <p className="text-xs text-zinc-500">
          Total histórico:{" "}
          <span className="font-bold text-white">
            {data ? data.totals.questions.toLocaleString() : "—"}
          </span>{" "}
          preguntas ·{" "}
          <span className="font-bold text-white">
            {data ? data.totals.answers.toLocaleString() : "—"}
          </span>{" "}
          respuestas.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      {!data ? (
        <div className="py-16 text-center text-sm text-zinc-500">
          {loading ? "Cargando…" : "Sin datos."}
        </div>
      ) : (
        <div className="space-y-8">
          <WindowSection title="Últimos 7 días" w={data.last7d} />
          <WindowSection title="Últimos 30 días" w={data.last30d} />

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Distribución de respuestas por pregunta (30d)
            </h2>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-end gap-3 h-32">
                {["0", "1", "2", "3", "4", "5"].map((bucket) => {
                  const count = data.histogram30d[bucket] ?? 0;
                  const h = histogramTotal === 0 ? 0 : (count / histogramTotal) * 100;
                  const isZero = bucket === "0";
                  return (
                    <div key={bucket} className="flex-1 flex flex-col items-center gap-2">
                      <div className="flex-1 w-full flex items-end">
                        <div
                          className={`w-full rounded-t ${isZero ? "bg-red-500/40" : "bg-violet-500/60"}`}
                          style={{ height: `${Math.max(h, count > 0 ? 4 : 0)}%` }}
                          title={`${count} preguntas`}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-400">
                        {bucket === "5" ? "5+" : bucket} resp
                      </span>
                      <span className="text-[10px] text-zinc-500">{count}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-500 mt-4">
                Si la barra de <span className="text-red-400 font-semibold">0 respuestas</span> es la
                más alta, la cadena no está cerrando. Objetivo: mover masa hacia 2+.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Top personas que más han ayudado (30d)
            </h2>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              {data.topAnswerers30d.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500">
                  Todavía nadie ha respondido en los últimos 30 días.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {data.topAnswerers30d.map((row, i) => (
                    <div key={row.userId} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="font-mono text-xs text-zinc-600 w-6">{i + 1}</span>
                      <a
                        href={`/admin/users/${row.userId}`}
                        className="flex-1 font-mono text-xs text-cyan-400 hover:text-cyan-300 truncate"
                      >
                        {row.userId}
                      </a>
                      <span className="rounded-md bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-xs font-semibold">
                        {row.answers} respuestas
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
