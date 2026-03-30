import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_96%,white_4%),var(--background))] p-4">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-border/80 bg-card/95 p-8 text-center shadow-sm">
          <div className="mb-4 text-6xl">🗺️</div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
          <p className="mb-4 text-muted-foreground">
          Esta página no existe. Pero el resto del sitio sí.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
