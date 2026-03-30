"use client";

import { KeyboardEvent, useEffect, useRef } from "react";
import Message from "@/components/Message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ONBOARDING_EXAMPLE_PROMPTS, ONBOARDING_STARTER_QUESTION } from "@/lib/onboarding";
import { PRODUCT_DISCLAIMERS } from "@/lib/legal";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  variant?: "action_required" | "crisis";
  meta?: {
    searchUsed?: boolean;
    fallback?: boolean;
  };
};

type ChatFlow = {
  currentIntent: string;
  currentStep: number;
  activeFlow: string | null;
  instruction: string | null;
};

type ActionLock = {
  message: string;
  actionTitle: string;
};

type ChatProps = {
  title: string;
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  streamingMessageId?: string | null;
  error: string | null;
  actionLock?: ActionLock | null;
  responseSignals?: {
    searchUsed: boolean;
    fallback: boolean;
    flow: ChatFlow | null;
  };
  onInputChange: (value: string) => void;
  onSend: (overrideText?: string) => Promise<void> | void;
  onUseStarterExample?: (value: string) => void;
};

export default function Chat({
  title,
  messages,
  input,
  loading,
  streamingMessageId,
  error,
  actionLock,
  responseSignals,
  onInputChange,
  onSend,
  onUseStarterExample,
}: ChatProps) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length === 0 && !loading) {
      textareaRef.current?.focus();
    }
  }, [loading, messages.length]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSend();
    }
  };

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border-border/80 bg-card/95 shadow-sm">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Conversación guiada
            </p>
            <CardTitle className="mt-1 text-base">{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Asistente emocional + foco en acción
            </p>
          </div>
        </div>
        {responseSignals?.searchUsed || responseSignals?.fallback || responseSignals?.flow ? (
          <div className="flex flex-wrap items-center gap-2">
            {responseSignals.searchUsed ? (
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Internet usado
              </Badge>
            ) : null}
            {responseSignals.fallback ? (
              <Badge variant="warning" className="rounded-full px-3 py-1">
                Fallback activo
              </Badge>
            ) : null}
            {responseSignals.flow?.activeFlow ? (
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Flujo {responseSignals.flow.activeFlow} · paso {responseSignals.flow.currentStep}
              </Badge>
            ) : null}
          </div>
        ) : null}
        {responseSignals?.flow?.instruction ? (
          <p className="text-sm text-muted-foreground">{responseSignals.flow.instruction}</p>
        ) : null}
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full px-5 py-5">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <Message role="assistant" content={ONBOARDING_STARTER_QUESTION} />
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5">
                  <p className="text-sm font-semibold text-foreground">
                    Empieza por una fricción real, no por una versión perfecta de tu problema
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Si no sabes cómo arrancar, usa un ejemplo y lo convertimos en foco y primera
                    acción.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ONBOARDING_EXAMPLE_PROMPTS.map((prompt) => (
                      <Button
                        key={prompt.label}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                        onClick={() => onUseStarterExample?.(prompt.value)}
                      >
                        {prompt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <Message
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  isError={message.isError}
                  streaming={message.id === streamingMessageId}
                  variant={message.variant}
                  meta={message.meta}
                />
              ))
            )}

            {loading ? <Message role="assistant" content="Pensando..." /> : null}

            <div ref={endRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex-col items-stretch border-t border-border/70 p-4">
        {error ? (
          <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mb-3 rounded-2xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <p>{PRODUCT_DISCLAIMERS[0]}</p>
          <p className="mt-1">
            {PRODUCT_DISCLAIMERS[1]} Consulta{" "}
            <a href="/api/legal" className="font-semibold text-foreground underline">
              /api/legal
            </a>
            .
          </p>
        </div>

        {actionLock ? (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              Responsabilidad activa
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-950 dark:text-amber-100">
              {actionLock.actionTitle}
            </p>
            <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">{actionLock.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void onSend("Ya lo hice")}
              >
                Ya lo hice
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void onSend("Lo hago luego")}
              >
                Lo hago luego
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void onSend("No lo voy a hacer")}
              >
                No lo voy a hacer
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={
              actionLock
                ? "Responde sobre la acción pendiente o usa los accesos rápidos."
                : "Describe qué estás evitando o qué te cuesta arrancar..."
            }
            disabled={loading}
            className="min-h-21 resize-none bg-background"
          />
          <Button
            type="button"
            onClick={() => void onSend()}
            disabled={loading || !input.trim()}
            className="self-end"
          >
            {actionLock ? "Responder" : "Enviar"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
