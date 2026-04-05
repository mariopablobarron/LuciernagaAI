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
              <div className="text-2xl">💓</div>
              <span className="font-black text-foreground tracking-tight">Luciérnaga</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cada latido es una elección. Luciérnaga existe para que los tuyos tengan dirección real.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Heart className="w-3 h-3 text-cyan-500" />
              Hecho con el corazón en Latinoamérica
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Producto</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/precios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Precios
                </Link>
              </li>
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

        {/* Admin links — only visible to those who know */}
        <div className="border-t border-border/10 pt-6 mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-3">
            Acceso interno
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {[
              { href: "/admin", label: "Dashboard" },
              { href: "/admin/users", label: "Usuarios" },
              { href: "/admin-clinical", label: "Panel clínico" },
              { href: "/admin/crisis", label: "Crisis" },
              { href: "/admin/analytics", label: "Analytics" },
              { href: "/admin/audit", label: "Auditoría" },
              { href: "/admin/llm-usage", label: "LLM Usage" },
              { href: "/admin/settings", label: "Configuración" },
              { href: "/admin/login", label: "Login admin" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}{" "}
            <a
              href="https://tresmilmillonesdelatidos.es"
              className="hover:text-foreground transition-colors"
            >
              tresmilmillonesdelatidos.es
            </a>{" "}
            — Todos los derechos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            No sustituye terapia ni intervención psicológica profesional.
          </p>
        </div>
      </div>
    </footer>
  );
}
