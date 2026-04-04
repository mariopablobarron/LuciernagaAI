"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type ActionNode = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: "blocked" | "anxious" | "doubt" | "clarity";
  completed: boolean;
};

type ActionModalProps = {
  action: ActionNode;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (content: string) => void;
};

export default function ActionModal({
  action,
  isOpen,
  onClose,
  onComplete,
}: ActionModalProps) {
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setInput(""), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    setIsSubmitting(true);
    onComplete(input.trim());
  };

  const getColorVar = (color: string) => {
    const colorMap: Record<string, string> = {
      blocked: "--emotion-blocked",
      anxious: "--emotion-anxious",
      doubt: "--emotion-doubt",
      clarity: "--emotion-clarity",
    };
    return colorMap[color] || colorMap.doubt;
  };

  const borderColor = `color-mix(in oklch, var(${getColorVar(action.color)}) 30%, transparent)`;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 space-y-5 animate-in fade-in zoom-in duration-300"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-modal-title"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="text-3xl">{action.icon}</div>
              <div>
                <h2 id="action-modal-title" className="text-xl font-semibold text-foreground">
                  {action.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {action.description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Motivational text */}
          <div
            className="p-4 rounded-xl border-2 text-sm"
            style={{ borderColor }}
          >
            <p className="text-foreground font-medium">
              {getMotivationalText(action.id)}
            </p>
          </div>

          {/* Input area */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Tu respuesta
            </label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={getPlaceholder(action.id)}
              className="min-h-28 resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Sé específico. No hay respuestas correctas, solo las tuyas.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm font-medium"
            >
              {isSubmitting ? "Guardando..." : "Completar"}
            </button>
          </div>

          {/* Completion hint */}
          <div className="text-center text-xs text-muted-foreground">
            Esta acción quedará registrada en tu historial.
          </div>
        </div>
      </div>
    </>
  );
}

function getMotivationalText(actionId: string): string {
  const textMap: Record<string, string> = {
    "action-1":
      "Lo no dicho es lo que pesa. Nombra eso que guardas y comienza a liberarte.",
    "action-2":
      "No termina con este momento. ¿Cuál es tu siguiente movimiento?",
    "action-3":
      "Cada pendiente te consume energía. Ciérralo y libera ese espacio.",
    "action-4":
      "Tu cabeza necesita orden. Aquí puedes dejarla clara.",
  };
  return (
    textMap[actionId] ||
    "Sé honesto contigo. Esta es tu conversación más importante."
  );
}

function getPlaceholder(actionId: string): string {
  const placeholderMap: Record<string, string> = {
    "action-1":
      "Lo que no he dicho es... porque siento que...",
    "action-2":
      "Cuando termine esto, voy a... porque...",
    "action-3":
      "La tarea pendiente que más pesa es... y necesito cerrarla porque...",
    "action-4":
      "Lo que anda desordenado en mi cabeza es... y afecta...",
  };
  return (
    placeholderMap[actionId] || "Escribe aquí tu respuesta honesta..."
  );
}
