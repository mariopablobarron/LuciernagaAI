import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingCTA() {
  return (
    <section className="landing-cta py-20 px-4 bg-black text-white">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Headline */}
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            ¿Sigues esperando el momento perfecto?
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            No existe. Pero tu siguiente paso sí. Y está más claro de lo que crees.
          </p>
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-white text-black hover:bg-white/90 transition-colors font-bold text-lg"
          >
            Empieza ahora
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Secondary text */}
        <p className="text-sm text-white/60">
          5 minutos. Sin compromisos. Tu contexto permanece.
        </p>
      </div>
    </section>
  );
}
