"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TestimonialsSection from "@/components/home/TestimonialsSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* HERO */}
      <section className="relative min-h-[calc(100vh-80px)] grid md:grid-cols-2 gap-12 items-center px-4 py-24 max-w-6xl mx-auto">
        {/* Left */}
        <div className="space-y-8 order-2 md:order-1">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              ⚡ Transformación Real
            </p>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Cambia tu vida{" "}
              <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                un hábito a la vez
              </span>
            </h1>
          </div>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-lg">
            Un equipo de psicologos, mentores y coaches que usa inteligencia artificial para acompanarte a pasar de la paralisis a la accion. La IA es la herramienta — el seguimiento es humano.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-violet-500 to-fuchsia-500 text-white font-semibold rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/25"
            >
              Crear cuenta gratis <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/unirse"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-zinc-700 text-white font-semibold rounded-xl hover:bg-zinc-900/50 hover:border-zinc-600 transition-colors"
            >
              Probar sin cuenta
            </Link>
          </div>
        </div>

        {/* Right: Chat mock */}
        <div className="hidden md:block order-1 md:order-2">
          <div className="card-surface p-6 space-y-4 max-h-96 overflow-hidden relative">
            <div className="absolute inset-0 -z-10 bg-linear-to-br from-violet-500/15 via-transparent to-fuchsia-500/15 blur-2xl" />
            <div className="space-y-3">
              {[
                { role: "user", text: "Estoy bloqueado con mi proyecto" },
                { role: "ai", text: "¿Qué es lo más pequeño que podrías hacer en 10 minutos?" },
                { role: "user", text: "Abrir el archivo y escribir un párrafo" },
                { role: "ai", text: "Eso es. Hazlo ahora. Luego volveremos." },
              ].map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-xl text-sm ${
                      msg.role === "user"
                        ? "bg-violet-500/20 border border-violet-500/30 text-white"
                        : "bg-zinc-800/50 border border-zinc-700 text-zinc-300"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="py-20 px-4 bg-zinc-900/30 border-y border-zinc-800"
      >
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold text-violet-400 uppercase tracking-wider">
              Cómo funciona
            </p>
            <h2 className="text-4xl md:text-5xl font-bold">Tu transformación en 3 pasos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "1",
                title: "Describes cómo te sientes",
                desc: "Elige tu estado emocional actual. No hay respuesta correcta.",
              },
              {
                num: "2",
                title: "La IA detecta tu patrón",
                desc: "Bloqueado / Ansioso / Dudoso / Claro — adaptamos la conversación.",
              },
              {
                num: "3",
                title: "Recibes un próximo paso",
                desc: "Específico, accionable, que puedes hacer hoy en 10 minutos.",
              },
            ].map((step) => (
              <div key={step.num} className="card-surface p-8 text-center space-y-4">
                <div className="text-5xl font-bold bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS + STATS */}
      <TestimonialsSection />

      {/* PRICING */}
      <section className="py-20 px-4 bg-zinc-900/30 border-y border-zinc-800">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold text-violet-400 uppercase tracking-wider">Planes</p>
            <h2 className="text-4xl font-bold">Elige tu camino</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Gratuito",
                description: "Perfecto para empezar",
                price: "Gratis",
                features: ["Chat ilimitado", "Detección de estado", "Primer reto gratis", "Acceso exploración"],
                cta: "Crear cuenta gratis",
                href: "/signup",
                featured: false,
              },
              {
                title: "Impulso",
                description: "Programa intensivo 21 días",
                price: "Próximamente",
                features: [
                  "Todo lo del plan Gratuito",
                  "Programa Impulso 21 días",
                  "Check-ins diarios",
                  "Retos personalizados",
                  "Mensajes futuros",
                  "Soporte prioritario",
                ],
                cta: "Unirse a lista de espera",
                href: "#",
                featured: true,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-xl border p-8 space-y-6 ${
                  plan.featured
                    ? "ring-1 ring-violet-500/60 bg-violet-500/5 border-violet-500/30"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <div>
                  <h3 className="text-2xl font-bold">{plan.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{plan.description}</p>
                </div>
                <p className="text-3xl font-bold">{plan.price}</p>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="text-violet-400 font-bold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-center transition-all block text-sm ${
                    plan.featured
                      ? "bg-linear-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400"
                      : "border border-zinc-700 text-white hover:bg-zinc-900 hover:border-zinc-600"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative min-h-96 flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 blur-3xl" />
        </div>
        <div className="max-w-3xl text-center space-y-6">
          <h2 className="text-5xl md:text-6xl font-bold">¿Listo para tu primer paso?</h2>
          <p className="text-lg text-zinc-400">
            Crea tu cuenta en menos de 60 segundos. Gratis.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-linear-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:from-violet-400 hover:to-fuchsia-400 transition-all hover:shadow-lg hover:shadow-fuchsia-500/40"
          >
            Crear cuenta gratis <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-zinc-600 pt-4">
            Tres Mil Millones de Latidos no sustituye terapia ni intervención psicológica profesional.
          </p>
        </div>
      </section>

    </div>
  );
}
