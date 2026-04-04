import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingHero() {
  return (
    <section className="landing-hero relative min-h-screen flex items-center justify-center px-4 py-20 bg-gradient-to-b from-background via-background to-muted/5">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-muted/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-muted/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl text-center space-y-8">
        {/* Tagline */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/50">
          <span className="text-xs font-medium text-foreground">✨ Para los que no saben por dónde empezar</span>
        </div>

        {/* Main headline */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Convierte claridad en acción
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Empieza por lo que llevas tiempo evitando. Luciernaga lo convierte en tu primera acción concreta.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-black text-white hover:bg-black/90 transition-colors font-medium"
          >
            Empieza ahora
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button className="px-8 py-3 rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors font-medium">
            Ver más
          </button>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span>Toma 5 minutos</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <span>100% privado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span>Sin registrarse</span>
          </div>
        </div>
      </div>
    </section>
  );
}
