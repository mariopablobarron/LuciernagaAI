"use client";

import { Star } from "lucide-react";

const testimonials = [
  {
    name: "María, 24 años",
    role: "Estudiante",
    content:
      "Pensé que necesitaba un cambio masivo. Luciérnaga me mostró que pequeñas acciones diarias son lo que funciona. En 3 semanas cambié mi hábito de sueño.",
    avatar: "👩",
  },
  {
    name: "Carlos, 28 años",
    role: "Emprendedor",
    content:
      "Tenía 10 hábitos que quería cambiar. Me sentía paralizado. Luciérnaga me hizo enfocarse en uno. Ahora tengo 4 hábitos nuevos sin sentir presión.",
    avatar: "👨",
  },
  {
    name: "Sofía, 22 años",
    role: "Profesional",
    content:
      "Lo que más me gusta es que no hay presión. Si fallo un día, no es castigo. Es aprendizaje. Eso cambió completamente cómo me relaciono con mis objetivos.",
    avatar: "👩‍💼",
  },
  {
    name: "Juan, 31 años",
    role: "Diseñador",
    content:
      "He probado apps, libros, coaches. Nada funcionaba. Luciérnaga es diferente porque realmente te conoce. Los insights que me da son precisos.",
    avatar: "🧑‍🎨",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 md:py-32 bg-linear-to-b from-background via-muted/5 to-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Latidos que ya cambiaron de ritmo
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Jóvenes de 18 a 35 años que dejaron de dejar pasar los latidos.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/70 transition-all duration-300 hover:border-emotion-clarity/50"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-emotion-clarity text-emotion-clarity" />
                ))}
              </div>

              {/* Content */}
              <p className="text-sm text-foreground mb-6 leading-relaxed">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="text-2xl">{testimonial.avatar}</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 text-center p-8 rounded-3xl border border-border/50 bg-card/30">
          <div>
            <div className="text-3xl md:text-4xl font-bold text-emotion-clarity mb-2">+200</div>
            <p className="text-sm text-muted-foreground">Latiendo diferente</p>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-emotion-clarity mb-2">92%</div>
            <p className="text-sm text-muted-foreground">Completaron su primer latido de cambio</p>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-emotion-clarity mb-2">4.8/5</div>
            <p className="text-sm text-muted-foreground">Rating promedio</p>
          </div>
        </div>
      </div>
    </section>
  );
}
