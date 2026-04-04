"use client";

import Link from "next/link";
import { Brain, Zap, Target, TrendingUp, Heart, Lock } from "lucide-react";

const benefits = [
  {
    icon: Brain,
    title: "Mayor claridad mental",
    description:
      "Entiende qué te frena. Identifica patrones que no veías. Toma decisiones desde la honestidad.",
    highlight: "Menos confusión. Más dirección.",
  },
  {
    icon: Zap,
    title: "Energía renovada",
    description:
      "Cuando empiezas a actuar, la energía vuelve. Pequeñas acciones generan grandes cambios.",
    highlight: "De la parálisis a la acción.",
  },
  {
    icon: Target,
    title: "Hábitos que funcionan",
    description:
      "Olvida dietas extremas y regímenes imposibles. Pequeños cambios consistentes que se quedan.",
    highlight: "Transformación duradera.",
  },
  {
    icon: Heart,
    title: "Mejor relación contigo",
    description:
      "Dejas de luchar contra ti mismo. Empiezas a acompañarte. La autocompasión es el cambio real.",
    highlight: "Paz interna genuina.",
  },
  {
    icon: TrendingUp,
    title: "Crecimiento visible",
    description:
      "Semana tras semana ves tu progreso. Datos reales de tu transformación. Evidencia de cambio.",
    highlight: "Resultados que puedes medir.",
  },
  {
    icon: Lock,
    title: "Sin presión. Sin juicio.",
    description: "Nadie te juzga. Tu privacidad está garantizada. Solo tú y tu transformación.",
    highlight: "Espacio seguro para cambiar.",
  },
];

export default function BenefitsSection() {
  return (
    <section id="benefits" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Lo que ganas
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No son promesas vacías. Son cambios reales que experimentan quienes se comprometen.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="group relative p-8 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/70 transition-all duration-300 hover:border-emotion-clarity/50 hover:shadow-lg"
              >
                {/* Icon background */}
                <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-emotion-clarity/10 group-hover:bg-emotion-clarity/20 transition-colors" />

                {/* Icon */}
                <div className="relative w-12 h-12 rounded-lg bg-emotion-clarity/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-emotion-clarity" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {benefit.description}
                </p>
                <p className="text-sm font-semibold text-emotion-clarity">{benefit.highlight}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="mt-20 p-8 md:p-12 rounded-3xl border border-border/50 bg-gradient-to-r from-emotion-clarity/5 via-emotion-doubt/5 to-emotion-blocked/5 text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">¿Listo para transformar?</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Tienes 18 a 35 años. Sabes que algo tiene que cambiar. Estás en el lugar correcto.
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-emotion-clarity to-emotion-doubt text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Comienza tu transformación
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
