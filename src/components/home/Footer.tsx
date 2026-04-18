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
              <span className="font-black text-foreground tracking-tight">Tres Mil Millones de Latidos</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cada latido es una elección. Tres Mil Millones de Latidos existe para que los tuyos tengan dirección real.
            </p>
            <a href="https://startidea.es" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground font-medium hover:text-cyan-400 transition-colors">
              <Heart className="w-3 h-3 text-cyan-500" />
              Comprometidos con el bienestar emocional a través de la tecnología
            </a>

            {/* Social */}
            <div className="flex items-center gap-3 pt-1">
              {[
                {
                  href: "#",
                  label: "Instagram",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                      <rect x="2" y="2" width="20" height="20" rx="5" />
                      <circle cx="12" cy="12" r="5" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  ),
                },
                {
                  href: "#",
                  label: "LinkedIn",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  ),
                },
                {
                  href: "#",
                  label: "YouTube",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  ),
                },
                {
                  href: "#",
                  label: "Spotify",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  ),
                },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-white hover:border-violet-500/40 hover:bg-violet-500/10 transition-all"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Producto</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
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
                <Link href="/test" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Test gratuito
                </Link>
              </li>
              <li>
                <Link href="/calculadora-latidos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Calculadora de latidos
                </Link>
              </li>
              <li>
                <Link href="/guia" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Guía de uso
                </Link>
              </li>
              <li>
                <Link href="/como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  El método
                </Link>
              </li>
              <li>
                <Link href="/comparativa" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Comparativa
                </Link>
              </li>
              <li>
                <Link href="/casos-de-uso" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Casos de uso
                </Link>
              </li>
              <li>
                <Link href="/recursos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Recursos
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Preguntas frecuentes
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
                <Link href="/sobre-nosotros" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link href="/para-profesionales" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Para profesionales
                </Link>
              </li>
              <li>
                <Link href="/etica" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Ética y límites
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Novedades
                </Link>
              </li>
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
