import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-white to-neutral-100 flex flex-col items-center justify-center px-6">

      {/* LOGO / HEADER */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Luciernaga AI
        </h1>
        <p className="text-neutral-500 mt-2">
          Deja de darle vueltas. Empieza a actuar.
        </p>
      </div>

      {/* HERO */}
      <div className="max-w-xl text-center mb-10">
        <h2 className="text-3xl font-semibold mb-4">
          ¿Qué estás evitando ahora mismo?
        </h2>
        <p className="text-neutral-600">
          Luciernaga te ayuda a convertir eso en un siguiente paso claro.
        </p>
      </div>

      {/* CTA */}
      <div className="flex gap-4">
        <Link
          href="/explore"
          className="px-6 py-3 rounded-full bg-black text-white text-sm hover:opacity-90 transition"
        >
          Empieza ahora
        </Link>

        <Link
          href="/landing"
          className="px-6 py-3 rounded-full border text-sm hover:bg-neutral-100 transition"
        >
          Ver más
        </Link>
      </div>

      {/* FOOTER SIMPLE */}
      <div className="mt-16 text-xs text-neutral-400 text-center max-w-md">
        Luciernaga AI no sustituye terapia ni intervención psicológica profesional.
      </div>

    </main>
  );
}
