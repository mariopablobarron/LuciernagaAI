import ContactForm from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Ponte en contacto
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            ¿Preguntas, sugerencias o quieres colaborar? Nos encanta escuchar.
          </p>
        </div>

        {/* Contact Form - Floating */}
        <ContactForm />
      </div>
    </div>
  );
}
