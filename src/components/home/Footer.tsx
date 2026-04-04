"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-background/50 backdrop-blur-sm py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group transition-opacity hover:opacity-80">
              <div className="text-2xl">🔥</div>
              <span className="font-black text-foreground tracking-tight">Luciérnaga</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mentoría con IA para personas que quieren transformar su vida con acción real, no promesas vacías.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Heart className="w-3 h-3 text-cyan-500" />
              Hecho con propósito en Latinoamérica
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Producto</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/unirse" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Unirse al reto
                </Link>
              </li>
              <li>
                <Link href="/reto" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  El reto 30 días
                </Link>
              </li>
              <li>
                <Link href="/app" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Acceder
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Información</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Términos de servicio
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Luciérnaga AI. Todos los derechos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Luciérnaga AI no sustituye terapia ni intervención psicológica profesional.
          </p>
        </div>
      </div>
    </footer>
  );
}
