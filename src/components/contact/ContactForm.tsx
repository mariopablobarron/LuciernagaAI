"use client";

import { useState } from "react";
import { COMPONENTS, TYPOGRAPHY } from "@/styles/design-system";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !email.trim() || !message.trim()}
            className={`${COMPONENTS.buttonPrimary} w-full py-2`}
          >
            {isSubmitting ? "Enviando..." : "Enviar mensaje"}
          </button>

          <p className="text-xs text-zinc-500 text-center">
            Responderemos en las próximas 24 horas.
          </p>
        </form>
      </div>
    </div>
  );
}
