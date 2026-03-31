"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionNodeType, EmotionalStateType } from "./HomeCanvas";
import { X } from "lucide-react";

interface ChatModalProps {
  nodeId: string;
  node: ActionNodeType;
  emotionalState: EmotionalStateType;
  onClose: () => void;
  onComplete: () => void;
  onStateChange: (state: EmotionalStateType) => void;
}

export default function ChatModal({
  node,
  emotionalState,
  onClose,
  onComplete,
}: ChatModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    textareaRef.current?.focus();
  }, []);

  // Colores para el modal según emoción
  const emotionBg: Record<EmotionalStateType, string> = {
    blocked: "from-slate-800/80 to-slate-900/80",
    anxious: "from-orange-800/80 to-red-900/80",
    doubt: "from-indigo-800/80 to-purple-900/80",
    clarity: "from-emerald-800/80 to-teal-900/80",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    setIsSubmitting(true);

    // Simular delay para envío
    setTimeout(() => {
      setSubmitted(true);
      setIsSubmitting(false);

      // Auto-close después de confirmación
      setTimeout(() => {
        onComplete();
      }, 1500);
    }, 800);
  };

  return (
    <>
      {/* Backdrop con blur */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Modal Card - centrado y flotante */}
      <div
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div
          className={`rounded-3xl border border-white/20 bg-gradient-to-br ${emotionBg[emotionalState]} p-8 shadow-2xl`}
        >
          {/* Header con icono y título */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-4xl">{node.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-lg leading-tight">
                  {node.title}
                </h3>
                <p className="text-sm text-white/60 mt-1">{node.description}</p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat area */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Prompt dinamático */}
              <div className="text-sm text-white/70 bg-white/5 rounded-xl p-3 backdrop-blur-sm">
                {node.id === "avoid"
                  ? "¿Qué específicamente estás evitando?"
                  : node.id === "next"
                    ? "¿Cuál es tu próximo paso?"
                    : node.id === "close"
                      ? "¿Qué necesitas cerrar?"
                      : "¿Qué es lo que se repite?"}
              </div>

              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe sin filtro..."
                rows={4}
                disabled={isSubmitting}
                className="min-h-28 resize-none bg-white/10 border-white/20 text-white placeholder-white/40 focus:border-white/40 rounded-xl"
              />

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="flex-1 bg-white text-slate-900 hover:bg-white/90"
                >
                  {isSubmitting ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </form>
          ) : (
            /* Confirmación */
            <div className="space-y-4 text-center py-6">
              <div className="text-4xl">{node.icon}</div>
              <h4 className="text-lg font-semibold text-white">¡Listo!</h4>
              <p className="text-sm text-white/70">
                Tu respuesta ha sido guardada. Continuemos.
              </p>
              <div className="h-1 w-12 mx-auto rounded-full bg-gradient-to-r from-emotion-clarity to-emotion-doubt opacity-60" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
