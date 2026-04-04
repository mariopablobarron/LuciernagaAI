"use client";

import Link from "next/link";
import { CheckCircle, MessageCircle, TrendingUp, Zap } from "lucide-react";

const steps = [
  {
    icon: MessageCircle,
    title: "Conversa con honestidad",
    description:
      "Sin filtros. Sin juicio. Cuéntale a Luciernaga qué te pasa, qué evitas, qué te frena.",
    color: "emotion-blocked",
  },
  {
    icon: Zap,
    title: "Obtén claridad",
    description: "Identifica patrones, emociones y lo que realmente importa. Entiende el por qué.",
    color: "emotion-doubt",
  },
  {
    icon: CheckCircle,
    title: "Toma acción pequeña",
    description: "No cambios masivos. Acciones de menos de 5 minutos que generan momentum real.",
    color: "emotion-clarity",
  },
  {
    icon: TrendingUp,
    title: "Observa tu transformación",
    description: "Semana tras semana, ves cómo cambias. Tus hábitos, tu claridad, tu capacidad.",
    color: "emotion-clarity",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how"
      className="py-20 md:py-32 bg-gradient-to-b from-background via-muted/5 to-background"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Cómo funciona
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cuatro pasos simples que generan transformación real. Sin complejidad. Sin
            distracciones.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-2xl border border-border/50 bg-card/30 hover:bg-card/60 transition-all duration-300 hover:border-border/80"
              >
                {/* Step number */}
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-gradient-to-br from-emotion-clarity to-emotion-doubt flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform">
                  {index + 1}
                </div>

                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-lg bg-${step.color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon className={`w-6 h-6 text-${step.color}`} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

                {/* Arrow indicator */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 text-2xl text-border/50">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-6">
            ¿Listo para cambiar? Empieza en menos de un minuto.
          </p>
          <Link
            href="/unirse"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-emotion-clarity to-emotion-doubt text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Comenzar ahora
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
