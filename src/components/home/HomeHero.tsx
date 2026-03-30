"use client";

import { ArrowRight, MessageSquareDashed, Sparkles } from "lucide-react";
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
};

export default function HomeHero({ onUseChat, onUseExample }: HomeHeroProps) {
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
            <Button type="button" onClick={onUseChat}>
              Usa el chat
              <ArrowRight className="size-4" />
            </Button>
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
      </CardContent>
    </Card>
  );
}
