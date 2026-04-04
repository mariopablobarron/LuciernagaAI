export default function LandingTestimonials() {
  const testimonials = [
    {
      quote: "Llevar meses evitando un email importante. Luciernaga me ayudó a nombrarlo, entender por qué lo evitaba, y escribirlo. En una conversación.",
      author: "Valentina, 28",
      role: "Diseñadora",
      impact: "Rompió el bloqueo en 15 min",
    },
    {
      quote: "La ansiedad de decisión me paraliza. Con Luciernaga dejo de pensar en el plan perfecto y simplemente actúo. Es liberador.",
      author: "Marco, 31",
      role: "Ingeniero",
      impact: "Pasó de análisis paralizante a acción",
    },
    {
      quote: "No es un motivador falso. Entiende tu contexto real, tus emociones, y te propone pasos concretos. Continúa donde terminaste.",
      author: "Paula, 26",
      role: "Product Manager",
      impact: "Ahora tiene continuidad emocional",
    },
  ];

  return (
    <section className="landing-testimonials py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Section header */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Lo que dicen los que ya lo usan
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Historias reales de personas que pasaron de bloqueadas a activas.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="testimonial-card p-6 rounded-xl border border-border bg-card space-y-4"
            >
              {/* Quote */}
              <blockquote className="space-y-3">
                <p className="text-muted-foreground italic leading-relaxed">
                  "{testimonial.quote}"
                </p>
              </blockquote>

              {/* Author */}
              <div className="pt-4 border-t border-border space-y-2">
                <div>
                  <p className="font-semibold text-foreground">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
                <p className="text-xs font-medium text-muted-foreground bg-muted/50 inline-block px-3 py-1 rounded-full">
                  {testimonial.impact}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
