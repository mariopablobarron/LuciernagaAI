"use client";

import { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

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
  title?: string;
  messages?: ChatMessage[];
  input?: string;
  setInput?: (value: string) => void;
  onInputChange?: (value: string) => void;
  loading?: boolean;
  streamingMessageId?: string | null;
  error: string | null;
  actionLock?: ActionLock | null;
  responseSignals?: {
    searchUsed: boolean;
    fallback: boolean;
    flow: ChatFlow | null;
  };
  onSend: (overrideText?: string) => Promise<void> | void;
  onUseStarterExample?: (value: string) => void;
};

export default function Chat({
  messages = [],
  input = "",
  setInput,
  onInputChange,
  loading = false,
  onSend,
}: ChatProps) {
  const handleInputChange = (value: string) => {
    if (setInput) {
      setInput(value);
      return;
    }

    onInputChange?.(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSend();
    }
  };

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border-border/80 bg-card/95 shadow-sm">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.map((message, index) => (
            <div key={message.id || index} className="text-sm text-foreground">
              {message.content}
            </div>
          ))}
          {loading ? <div className="text-sm text-muted-foreground">Pensando...</div> : null}
        </div>
      </ScrollArea>

      <div className="border-t border-border/70 p-4">
        <Textarea
          value={input}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe lo que te pasa..."
          disabled={loading}
          rows={2}
          className="min-h-21 resize-none bg-background"
        />
        <Button
          className="mt-2 w-full"
          onClick={() => void onSend()}
          disabled={loading || !input.trim()}
        >
          Enviar
        </Button>
      </div>
    </Card>
  );
}
