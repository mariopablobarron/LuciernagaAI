"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { COMPONENTS, TYPOGRAPHY } from "@/styles/design-system";
import PrivacyCheckbox from "@/components/PrivacyCheckbox";

// Tipos de motivo soportados como query string ?motivo=<id>.
// El copy del starter (label + plantilla del mensaje) está en messages.contact.starter.<id>.
const MOTIVO_IDS = ["profesional", "etica", "sugerencia"] as const;
type MotivoId = (typeof MOTIVO_IDS)[number];

export default function ContactForm() {
  const t = useTranslations("contact");
  const searchParams = useSearchParams();
  const motivoParam = searchParams.get("motivo");
  const motivo: MotivoId | null =
    motivoParam && (MOTIVO_IDS as readonly string[]).includes(motivoParam)
      ? (motivoParam as MotivoId)
      : null;

  const initialMessage = motivo ? t(`starter.${motivo}.message`) : "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessage);
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
        {motivo && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {t("starter.header")}
            </p>
            <p className="mt-1 text-sm text-zinc-200">{t(`starter.${motivo}.label`)}</p>
            <p className="mt-1 text-xs text-zinc-500">{t("starter.note")}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className={`block ${TYPOGRAPHY.label}`}>
              {t("nameLabel")}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={isSubmitting}
              className={COMPONENTS.inputField}
              required
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className={`block ${TYPOGRAPHY.label}`}>
              {t("emailLabel")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              disabled={isSubmitting}
              className={COMPONENTS.inputField}
              required
            />
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <label htmlFor="message" className={`block ${TYPOGRAPHY.label}`}>
              {t("messageLabel")}
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              disabled={isSubmitting}
              rows={5}
              className={`${COMPONENTS.inputField} resize-none`}
              required
            />
          </div>

          {/* Status Messages */}
          {submitStatus === "success" && (
            <div className={COMPONENTS.badgeSuccess}>{t("statusSuccess")}</div>
          )}

          {submitStatus === "error" && (
            <div className={COMPONENTS.badgeError}>{t("statusError")}</div>
          )}

          {/* Privacy consent */}
          <PrivacyCheckbox
            checked={privacyAccepted}
            onChange={setPrivacyAccepted}
            context={t("privacyContext")}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !privacyAccepted || !name.trim() || !email.trim() || !message.trim()}
            className={`${COMPONENTS.buttonPrimary} w-full py-2`}
          >
            {isSubmitting ? t("submitSending") : t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
