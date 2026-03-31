"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Cómo funciona", href: "#how" },
    { label: "Beneficios", href: "#benefits" },
    { label: "Transformación", href: "#transformation" },
    { label: "Contacto", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - más minimalista */}
          <Link href="/" className="flex items-center gap-2.5 group transition-opacity hover:opacity-80">
            <div className="text-2xl">🔥</div>
            <span className="text-lg font-black tracking-tight text-foreground">
              Luciernaga
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hidden sm:inline-flex"
            >
              <Link href="/app">Acceder</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-gradient-to-r from-emotion-clarity to-emotion-doubt hover:opacity-90"
            >
              <Link href="/explore">Empezar ahora</Link>
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border/40">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/app">Acceder</Link>
              </Button>
              <Button asChild size="sm" className="w-full">
                <Link href="/explore">Empezar ahora</Link>
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
