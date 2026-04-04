import type { Metadata } from "next";
import ContactForm from "@/components/contact/ContactForm";
import { TYPOGRAPHY, GRADIENTS, LAYOUTS } from "@/styles/design-system";

export const metadata: Metadata = {
  title: "Contacto — Luciérnaga AI",
  description: "¿Tienes dudas o quieres saber más? Escríbenos y te respondemos en menos de 24 horas.",
  robots: { index: false, follow: false },
};

export default function ContactPage() {
  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} py-16 md:py-20 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-2xl space-y-8`}>
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className={`${TYPOGRAPHY.h1} bg-linear-to-r ${GRADIENTS.primary} bg-clip-text text-transparent`}>
            Contáctanos
          </h1>
          <p className={`${TYPOGRAPHY.body} text-cyan-300/80`}>
            Respondemos en menos de 24 horas.
          </p>
        </div>

        {/* Contact Form */}
        <ContactForm />
      </div>
    </div>
  );
}
