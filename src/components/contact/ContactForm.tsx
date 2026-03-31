"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

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
    } catch (error) {
      console.error("Error sending message:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-md border-border/80 bg-card/95 p-8 shadow-lg backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-foreground">
              Nombre
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo"
              disabled={isSubmitting}
              className="bg-background"
              required
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={isSubmitting}
              className="bg-background"
              required
            />
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <label htmlFor="message" className="block text-sm font-medium text-foreground">
              Mensaje
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Cuéntanos qué tienes en mente..."
              disabled={isSubmitting}
              rows={5}
              className="min-h-32 resize-none bg-background"
              required
            />
          </div>

          {/* Status Messages */}
          {submitStatus === "success" && (
            <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
              ¡Mensaje enviado! Nos pondremos en contacto pronto.
            </div>
          )}

          {submitStatus === "error" && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
              Por favor, completa todos los campos correctamente.
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim() || !email.trim() || !message.trim()}
            className="w-full"
          >
            {isSubmitting ? "Enviando..." : "Enviar mensaje"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Responderemos en las próximas 24 horas.
          </p>
        </form>
      </Card>
    </div>
  );
}
