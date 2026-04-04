"use client";

import Link from "next/link";
import { ArrowRight, MessageSquareDashed, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_ONBOARDING_EXAMPLE,
  ONBOARDING_EXAMPLE_PROMPTS,
  ONBOARDING_HEADLINE,
  ONBOARDING_SUBTITLE,
} from "@/lib/onboarding";

type HomeHeroProps = {
  onUseChat: () => void;
  onUseExample: (value: string) => void;
  onStartOnboarding?: () => void | Promise<void>;
  consentChecked?: boolean;
  consentRequired?: boolean;
  consentSaving?: boolean;
  consentError?: string | null;
  onConsentChange?: (checked: boolean) => void;
};

export default function HomeHero({
  onUseChat,
  onUseExample,
  onStartOnboarding,
  consentChecked = false,
  consentRequired = false,
  consentSaving = false,
  consentError = null,
  onConsentChange,
}: HomeHeroProps) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card/92 shadow-sm">
      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <Sparkles className="mr-1 size-3.5" />
                Onboarding guiado
              </Badge>
              <Badge variant="success" className="rounded-full px-3 py-1">
                Time to value &lt; 60s
              </Badge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {ONBOARDING_HEADLINE}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {ONBOARDING_SUBTITLE}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {onStartOnboarding ? (
              <Button
                type="button"
                onClick={() => void onStartOnboarding()}
                disabled={consentRequired ? !consentChecked || consentSaving : consentSaving}
              >
                Empezar guiado
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="button" onClick={onUseChat}>
                Usa el chat
                <ArrowRight className="size-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onUseExample(DEFAULT_ONBOARDING_EXAMPLE)}
            >
              <MessageSquareDashed className="size-4" />
              Probar con un ejemplo
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ONBOARDING_EXAMPLE_PROMPTS.map((prompt) => (
            <Button
              key={prompt.label}
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={() => onUseExample(prompt.value)}
            >
              {prompt.label}
            </Button>
          ))}
        </div>

        {onStartOnboarding && consentRequired ? (
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <label className="flex items-start gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(event) => onConsentChange?.(event.target.checked)}
                className="mt-0.5 size-4 rounded border-border text-foreground"
              />
              <span className="leading-6">
                He leído y acepto el tratamiento confidencial de mis datos para recibir
                acompañamiento personalizado. Entiendo que no sustituye ayuda profesional y que
                puedo dejar de usarlo cuando quiera. Consulta la política en{" "}
                <Link
                  href="/api/legal"
                  className="underline underline-offset-4 hover:text-foreground/80"
                >
                  información legal y privacidad
                </Link>
                .
              </span>
            </label>
            {consentError ? <p className="mt-2 text-sm text-destructive">{consentError}</p> : null}
          </div>
        ) : null}

        <Link
          href="/impulso"
          className="group flex items-center justify-between rounded-2xl border border-signal-warning/30 bg-signal-warning/10 px-5 py-4 transition hover:border-signal-warning/50 hover:bg-signal-warning/14"
        >
          <div className="flex items-start gap-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-signal-warning/18 text-foreground">
              <Zap className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">⚡ Modo Impulso</p>
                <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                  Nuevo
                </Badge>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Diagnóstico psicológico-operativo · Retos de 3 a 7 días · Racha diaria · Insights de
                comportamiento. Para cuando el chat no es suficiente y necesitas estructura real.
              </p>
            </div>
          </div>
          <ArrowRight className="ml-4 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
