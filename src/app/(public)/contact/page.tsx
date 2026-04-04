import ContactForm from "@/components/contact/ContactForm";
import { TYPOGRAPHY, GRADIENTS, LAYOUTS } from "@/styles/design-system";

export default function ContactPage() {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENTS.background} py-16 md:py-20 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-2xl space-y-8`}>
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className={`${TYPOGRAPHY.h1} bg-gradient-to-r ${GRADIENTS.primary} bg-clip-text text-transparent`}>
            Contáctanos
          </h1>
          <p className={`${TYPOGRAPHY.body} text-cyan-300/80`}>
            Responderemos en menos de 48 horas.
          </p>
        </div>

        {/* Contact Form */}
        <ContactForm />
      </div>
    </div>
  );
}
