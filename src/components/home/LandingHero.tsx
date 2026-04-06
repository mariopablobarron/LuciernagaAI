"use client";

import Link from "next/link";
import { ArrowRight, Zap, Target, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32 lg:py-40">
      {/* Animated background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-linear-to-br from-emotion-clarity/20 to-transparent rounded-full blur-3xl opacity-30 animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-linear-to-br from-emotion-doubt/20 to-transparent rounded-full blur-3xl opacity-30 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emotion-clarity/20 border border-emotion-clarity/40 text-xs font-semibold text-emotion-clarity">
                  <Zap className="w-3 h-3" />
                  Tres mil millones de latidos
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                <span className="block">Haz que cuenten</span>
                <span className="bg-linear-to-r from-emotion-clarity via-emotion-doubt to-emotion-blocked bg-clip-text text-transparent">
                  tus próximos latidos
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                El corazón humano late tres mil millones de veces en una vida.
                Tres Mil Millones de Latidos existe para que los que te quedan tengan dirección real.
                No teoría. No perfección. Acción concreta, latido a latido.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="space-y-3">
              {[
                { icon: Brain, text: "Entiende qué te frena" },
                { icon: Target, text: "Acciona sobre lo real" },
                { icon: Zap, text: "Vive latidos que importan" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-emotion-clarity/20 text-emotion-clarity">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                size="lg"
                asChild
                className="bg-linear-to-r from-emotion-clarity to-emotion-doubt hover:opacity-90 text-white font-semibold group"
              >
                <Link href="/unirse">
                  Empieza a latir diferente
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/app">Ya tengo cuenta</Link>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="pt-8 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-3">
                Personas haciendo contar sus latidos
              </p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-linear-to-br from-emotion-clarity to-emotion-doubt border-2 border-background flex items-center justify-center text-xs font-bold text-white"
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  +200 latiendo diferente
                </span>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative h-96 md:h-full min-h-96 hidden lg:block">
            {/* Animated circles representing transformation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-80 h-80">
                {/* Outer rotating circle */}
                <div
                  className="absolute inset-0 rounded-full border-2 border-emotion-clarity/30 animate-spin"
                  style={{ animationDuration: "20s" }}
                />

                {/* Middle circle */}
                <div
                  className="absolute inset-8 rounded-full border-2 border-emotion-doubt/30 animate-spin"
                  style={{ animationDuration: "30s", animationDirection: "reverse" }}
                />

                {/* Inner gradient circle */}
                <div className="absolute inset-16 rounded-full bg-linear-to-br from-emotion-clarity/20 via-emotion-doubt/20 to-emotion-blocked/20 backdrop-blur-sm border border-border/50 shadow-2xl flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="text-5xl">💓</div>
                    <p className="text-sm font-semibold text-foreground">Cada latido</p>
                    <p className="text-xs text-muted-foreground">es una elección</p>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 text-2xl animate-bounce">💫</div>
                <div
                  className="absolute -bottom-4 -left-4 text-2xl animate-bounce"
                  style={{ animationDelay: "0.5s" }}
                >
                  🌱
                </div>
                <div className="absolute top-1/2 -right-12 text-2xl animate-pulse">✨</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
