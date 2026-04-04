import ContactForm from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 py-16 px-4">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-white">Contáctanos</h1>
          <p className="text-lg text-zinc-400">
            Responderemos en menos de 48 horas.
          </p>
        </div>

        {/* Contact Form */}
        <ContactForm />
      </div>
    </div>
  );
}
