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

export default function ChatModal({ node, emotionalState, onClose, onComplete }: ChatModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isVisible] = useState(true);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Colores para el modal - minimalista premium
  const emotionBg: Record<EmotionalStateType, string> = {
    blocked: "from-gray-800/95 to-gray-900/95",
    anxious: "from-orange-800/95 to-amber-900/95",
    doubt: "from-cyan-800/95 to-cyan-900/95",
    clarity: "from-cyan-800/95 to-teal-900/95",
  };

  const emotionAccent: Record<EmotionalStateType, string> = {
    blocked: "text-gray-100",
    anxious: "text-orange-50",
    doubt: "text-purple-50",
    clarity: "text-cyan-50",
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
          className={`rounded-3xl border border-white/10 bg-gradient-to-br ${emotionBg[emotionalState]} p-8 shadow-2xl backdrop-blur`}
        >
          {/* Header con icono y título */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-5xl drop-shadow-lg">{node.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-black text-lg leading-tight ${emotionAccent[emotionalState]}`}>
                  {node.title}
                </h3>
                <p className="text-sm text-white/50 mt-2 font-medium">{node.description}</p>
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
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Prompt dinamático */}
              <div
                className={`text-sm font-medium ${emotionAccent[emotionalState]} bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10`}
              >
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
                placeholder="Sin filtro. Sin juicio."
                rows={5}
                disabled={isSubmitting}
                className="min-h-32 resize-none bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-white/30 rounded-xl font-medium"
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
              <p className="text-sm text-white/70">Tu respuesta ha sido guardada. Continuemos.</p>
              <div className="h-1 w-12 mx-auto rounded-full bg-gradient-to-r from-emotion-clarity to-emotion-doubt opacity-60" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
