"use client";

import { useState } from "react";
import { ArrowRight, Clock, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/textarea";

const SITUATIONS = [
  { label: "Estoy bloqueado/a", value: "Me siento bloqueado y no sé por dónde empezar." },
  { label: "Tengo ansiedad", value: "Tengo ansiedad y necesito enfocarme en algo concreto." },
  { label: "No sé decidir", value: "Tengo que tomar una decisión y no consigo decidirme." },
  { label: "Quiero un plan", value: "Necesito ordenar mis ideas y tener un plan claro para hoy." },
];

const TIMES = [
  { label: "5 minutos", value: "5 minutos" },
  { label: "15 minutos", value: "15 minutos" },
  { label: "30+ minutos", value: "más de 30 minutos" },
];

type Props = {
  step: 1 | 2 | 3;
  situation: string;
  time: string;
  onSelectSituation: (value: string) => void;
  onSelectTime: (value: string) => void;
  onSubmitGoal: (goal: string) => void;
  onSkip: () => void;
};

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all ${
            i < current
              ? "w-6 bg-foreground"
              : i === current - 1
                ? "w-6 bg-foreground"
                : "w-3 bg-muted-foreground/30"
          }`}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">
        {current} / {total}
      </span>
    </div>
  );
}

export default function HomeOnboarding({
  step,
  situation,
  time,
  onSelectSituation,
  onSelectTime,
  onSubmitGoal,
  onSkip,
}: Props) {
  const [goalText, setGoalText] = useState("");

  if (step === 1) {
    return (
      <Card className="overflow-hidden border-border/80 bg-card/92 shadow-sm">
        <CardContent className="space-y-5 p-5 md:p-6">
          <div className="flex items-center justify-between">
            <StepIndicator current={1} total={3} />
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Saltar
            </button>
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              ¿Qué situación te trae aquí?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Elige la que más se acerca. Puedes ajustarla después.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SITUATIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onSelectSituation(s.value)}
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-foreground/40 hover:bg-muted/50 active:scale-[0.98]"
              >
                {s.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card className="overflow-hidden border-border/80 bg-card/92 shadow-sm">
        <CardContent className="space-y-5 p-5 md:p-6">
          <div className="flex items-center justify-between">
            <StepIndicator current={2} total={3} />
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Saltar
            </button>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              <span className="truncate italic">{situation}</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              ¿Cuánto tiempo tienes ahora?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajustaremos la propuesta a tu disponibilidad real.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => onSelectTime(t.value)}
                className="rounded-xl border border-border/60 bg-background px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground/40 hover:bg-muted/50 active:scale-[0.98]"
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3
  return (
    <Card className="overflow-hidden border-border/80 bg-card/92 shadow-sm">
      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="flex items-center justify-between">
          <StepIndicator current={3} total={3} />
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Saltar
          </button>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="italic">{situation}</span>
            <span>·</span>
            <Clock className="size-3" />
            <span>{time}</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            ¿Qué quieres resolver hoy?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sé específico/a. Cuanto más concreto, mejor la respuesta.
          </p>
        </div>
        <Textarea
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          placeholder="Ej: Llevan semanas sin hablarme en el trabajo y no sé cómo retomar..."
          className="min-h-[88px] resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && goalText.trim()) {
              onSubmitGoal(goalText.trim());
            }
          }}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lightbulb className="size-3.5" />
            <span>Cmd+Enter para enviar</span>
          </div>
          <Button
            type="button"
            disabled={!goalText.trim()}
            onClick={() => onSubmitGoal(goalText.trim())}
          >
            Empezar
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
