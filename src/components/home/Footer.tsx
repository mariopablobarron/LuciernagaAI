"use client";

import Link from "next/link";
import { Heart, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="text-xl font-bold">🔥</div>
              <span className="font-bold text-foreground">Luciernaga</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Transformación de hábitos real para jóvenes que quieren cambiar su vida.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Heart className="w-3 h-3 text-emotion-blocked" />
              Hecho con propósito
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Producto</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/explore" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Empezar
                </Link>
              </li>
              <li>
                <Link href="/impulso" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Tu progreso
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Información</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/api/legal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contacto
                </a>
              </li>
              <li>
                <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Preguntas
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Mantente cerca</h4>
            <p className="text-sm text-muted-foreground">
              Tips de transformación directamente en tu inbox.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="tu@email.com"
                className="flex-1 px-3 py-2 text-sm rounded-l-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button className="px-3 py-2 bg-emotion-clarity text-white rounded-r-lg hover:opacity-90 transition-opacity">
                <Mail className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2024 Luciernaga AI. Transformando vidas jóvenes. Hecho con ❤️ en Latinoamérica.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Twitter
            </a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Instagram
            </a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
