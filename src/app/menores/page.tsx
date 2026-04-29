import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Estamos esperándote — Tres Mil Millones de Latidos",
  description:
    "Esta plataforma necesita que tengas al menos 14 años. Mientras tanto te dejamos recursos pensados para ti.",
  robots: { index: false, follow: false },
};

export default function MenoresPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full">
        <h1
          className="text-4xl md:text-5xl font-semibold text-white mb-6 leading-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Estamos esperándote.
        </h1>

        <div className="space-y-4 text-zinc-300 text-base md:text-lg leading-relaxed">
          <p>
            Esta plataforma está pensada para personas a partir de 14 años.
            No es porque no nos importes — es porque para acompañarte como
            mereces necesitamos que un adulto de confianza esté cerca.
          </p>
          <p>
            Si lo que sientes ahora pesa, hay personas escuchando.
            Llamar es gratis y confidencial.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6">
          <p className="text-sm font-semibold text-violet-200 mb-2">
            Fundación ANAR — Ayuda a niños y adolescentes
          </p>
          <a
            href="tel:900202010"
            className="text-3xl md:text-4xl font-bold text-white tracking-wide"
          >
            900 20 20 10
          </a>
          <p className="text-xs text-violet-300/80 mt-2">
            24 horas, gratis y confidencial. Atienden personas formadas que
            van a escucharte sin juzgar.
          </p>
          <a
            href="https://www.anar.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-300 underline mt-3 inline-block"
          >
            anar.org →
          </a>
        </div>

        <div className="mt-6 text-xs text-zinc-500 leading-relaxed">
          <p>
            Si hay riesgo inmediato para tu vida o la de alguien cerca, llama
            al 112.
          </p>
          <p className="mt-2">
            Cuando cumplas 14 años, vuelve y hablamos.
          </p>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-xs text-zinc-500 underline hover:text-zinc-300"
          >
            ← Volver a la portada
          </Link>
        </div>
      </div>
    </main>
  );
}
