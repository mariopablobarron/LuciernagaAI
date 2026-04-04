import Link from "next/link";
import { getBuilderContent } from "@/lib/builder";
import BuilderContent from "@/components/BuilderContent";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const isBuilderPreview = "builder.preview" in sp;
  const content = await getBuilderContent("page", "/");

  if (content || isBuilderPreview) {
    return <BuilderContent model="page" content={content} />;
  }

  return (
    <main className="bg-zinc-950 text-white min-h-screen antialiased">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 py-28 text-center overflow-hidden">

        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Badge */}
        <div className="relative mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs text-zinc-400 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Mentoría conversacional con IA
          <span className="text-indigo-400">✦</span>
        </div>

        {/* Title */}
        <h1 className="relative max-w-3xl text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl leading-[1.08]">
          Deja de darle{" "}
          <span className="bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            vueltas.
          </span>
          <br />
          Empieza a actuar.
        </h1>

        {/* Subtitle */}
        <p className="relative mt-6 max-w-lg text-base text-zinc-400 sm:text-lg leading-relaxed">
          Luciernaga AI convierte tu bloqueo en claridad y tu claridad en
          acción concreta.
        </p>

        {/* CTA buttons */}
        <div className="relative mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg transition hover:bg-zinc-100 active:scale-[0.98]"
          >
            Empieza ahora
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/landing"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-sm font-medium text-zinc-300 backdrop-blur-sm transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-white active:scale-[0.98]"
          >
            Ver cómo funciona
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="relative mt-12 max-w-xs text-xs text-zinc-600">
          Luciernaga AI no sustituye terapia ni intervención psicológica
          profesional.
        </p>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────────── */}
      <section className="border-y border-zinc-800 bg-zinc-900/40 py-8 px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 sm:flex-row">
          {/* Avatar stack */}
          <div className="flex -space-x-2">
            {["bg-indigo-600", "bg-purple-600", "bg-sky-600", "bg-emerald-600", "bg-rose-600"].map(
              (color, i) => (
                <div
                  key={i}
                  className={`h-8 w-8 rounded-full border-2 border-zinc-900 ${color} flex items-center justify-center text-[10px] font-bold text-white`}
                >
                  {["V", "M", "P", "A", "L"][i]}
                </div>
              ),
            )}
          </div>

          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-white">
              Más de 200 personas
            </span>{" "}
            ya han dado su primer paso
          </p>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">

          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-indigo-400">
            Cómo funciona
          </p>
          <h2 className="mb-14 text-center text-3xl font-bold text-white sm:text-4xl">
            Diseñado para sacarte del bucle
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: "○",
                title: "Sin juicios",
                desc: "Solo preguntas que te hacen avanzar. Sin consejos no pedidos, sin evaluaciones.",
              },
              {
                icon: "◈",
                title: "Estado real",
                desc: "Detecta si estás bloqueado, ansioso o con claridad y adapta la conversación.",
              },
              {
                icon: "◆",
                title: "Acción concreta",
                desc: "Cada conversación termina con un siguiente paso real que puedes ejecutar hoy.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                <div className="mb-4 text-2xl text-indigo-400 transition group-hover:text-indigo-300">
                  {icon}
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-28">
        {/* Background gradient */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(79,70,229,0.14) 0%, rgba(124,58,237,0.08) 40%, transparent 70%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-transparent to-zinc-950/80" />

        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            ¿Listo para tu primer paso?
          </h2>
          <p className="mb-10 text-zinc-400">
            Empieza en menos de 60 segundos. Sin registro obligatorio.
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            Abrir Luciernaga AI
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

    </main>
  );
}
