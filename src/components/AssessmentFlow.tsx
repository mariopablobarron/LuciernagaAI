"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Question = { id: string; text: string; scale: number };
type PendingAssessment = { id: string; type: string; title: string; questions: Question[] };

const SCORE_LABELS = ["Nunca", "Varios días", "Más de la mitad", "Casi todos los días"];

const SEVERITY_COLORS: Record<string, string> = {
  minimal: "text-emerald-400",
  mild: "text-yellow-400",
  moderate: "text-orange-400",
  moderately_severe: "text-orange-500",
  severe: "text-red-500",
};

type Props = { userId?: string };

export default function AssessmentFlow({ userId }: Props) {
  const [assessment, setAssessment] = useState<PendingAssessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    totalScore: number;
    severity: string;
    severityLabel: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!userId || dismissed) return;
    void fetch(`/api/user/assessments/pending`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { assessment: PendingAssessment } | null) => {
        if (d?.assessment) setAssessment(d.assessment);
      });
  }, [userId, dismissed]);

  if (!assessment || dismissed) return null;
  if (submitted && result) {
    return (
      <Card className="border-cyan-500/30 bg-cyan-950/20 mb-4">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold text-white">Evaluación completada ✓</p>
          <p className="text-sm text-zinc-300">
            Puntuación: <strong>{result.totalScore}</strong> —{" "}
            <span className={SEVERITY_COLORS[result.severity] ?? "text-zinc-300"}>
              {result.severityLabel}
            </span>
          </p>
          <p className="text-xs text-zinc-500">
            Tu psicólogo puede ver estos resultados en su panel.
          </p>
        </CardContent>
      </Card>
    );
  }

  const questions = assessment.questions;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  async function handleSubmit() {
    if (!allAnswered || !assessment) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/assessment/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          assessmentId: assessment.id,
          answers: Object.entries(answers).map(([questionId, score]) => ({ questionId, score })),
        }),
      });
      const data = (await res.json()) as typeof result;
      setResult(data);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-cyan-500/30 bg-cyan-950/20 mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-1">
              Tu psicólogo te ha enviado una evaluación
            </p>
            <CardTitle className="text-base text-white">{assessment.title}</CardTitle>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-zinc-600 hover:text-zinc-400 text-sm"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Responde con qué frecuencia te ha ocurrido en las últimas 2 semanas.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm text-zinc-300">
              <span className="text-zinc-600 mr-1">{i + 1}.</span> {q.text}
            </p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {SCORE_LABELS.map((label, score) => (
                <button
                  key={score}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: score }))}
                  className={`py-1.5 px-2 rounded-lg border text-xs transition ${
                    answers[q.id] === score
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600"
                  }`}
                >
                  {score} — {label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button
          onClick={() => void handleSubmit()}
          disabled={!allAnswered || loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {loading ? "Enviando..." : "Enviar evaluación"}
        </Button>
      </CardContent>
    </Card>
  );
}
