"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { COMPONENTS, TYPOGRAPHY } from "@/styles/design-system";
import PrivacyCheckbox from "@/components/PrivacyCheckbox";

const MOTIVO_STARTERS: Record<string, { label: string; message: string }> = {
  profesional: {
    label: "Psicóloga, coach o profesional del bienestar",
    message:
      "Hola, soy [profesión + colegiación si aplica] y me gustaría explorar cómo Tres Mil Millones de Latidos podría encajar con mi consulta. Me interesa especialmente:\n\n- ",
  },
  etica: {
    label: "Reportar un fallo ético",
    message:
      "Hola, he detectado algo en la plataforma que creo que va en contra de lo que prometéis en /etica. Contexto:\n\n- Qué pasó:\n- Dónde (URL o sección):\n- Cuándo:\n",
  },
  sugerencia: {
    label: "Sugerencia o feedback de producto",
    message: "Hola, echo en falta / me gustaría que…\n\n",
  },
};

export default function ContactForm() {
  const searchParams = useSearchParams();
  const motivo = searchParams.get("motivo");
  const starter = motivo && MOTIVO_STARTERS[motivo] ? MOTIVO_STARTERS[motivo] : null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(starter?.message ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !message.trim()) {
      setSubmitStatus("error");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      if (response.ok) {
        setName("");
        setEmail("");
        setMessage("");
        setSubmitStatus("success");
        setTimeout(() => setSubmitStatus("idle"), 5000);
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center">
      <div className={`w-full max-w-md ${COMPONENTS.card}`}>
        {starter && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Motivo
            </p>
            <p className="mt-1 text-sm text-zinc-200">{starter.label}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Hemos preparado un mensaje de partida abajo. Edítalo antes de enviar.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className={`block ${TYPOGRAPHY.label}`}>
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo"
              disabled={isSubmitting}
              className={COMPONENTS.inputField}
              required
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className={`block ${TYPOGRAPHY.label}`}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={isSubmitting}
              className={COMPONENTS.inputField}
              required
            />
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <label htmlFor="message" className={`block ${TYPOGRAPHY.label}`}>
              Mensaje
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Cuéntanos qué tienes en mente..."
              disabled={isSubmitting}
              rows={5}
              className={`${COMPONENTS.inputField} resize-none`}
              required
            />
          </div>

          {/* Status Messages */}
          {submitStatus === "success" && (
            <div className={COMPONENTS.badgeSuccess}>
              ¡Mensaje enviado! Nos pondremos en contacto pronto.
            </div>
          )}

          {submitStatus === "error" && (
            <div className={COMPONENTS.badgeError}>
              Por favor, completa todos los campos correctamente.
            </div>
          )}

          {/* Privacy consent */}
          <PrivacyCheckbox
            checked={privacyAccepted}
            onChange={setPrivacyAccepted}
            context="Tus datos se usaran solo para responder tu mensaje."
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !privacyAccepted || !name.trim() || !email.trim() || !message.trim()}
            className={`${COMPONENTS.buttonPrimary} w-full py-2`}
          >
            {isSubmitting ? "Enviando..." : "Enviar mensaje"}
          </button>
        </form>
      </div>
    </div>
  );
}
