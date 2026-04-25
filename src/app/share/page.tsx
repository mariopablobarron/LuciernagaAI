import type { Metadata } from "next";
import Link from "next/link";

// Página /share — destino canónico cuando un usuario comparte un logro.
//
// Cuando se publica el link en una red social, esa red lee los meta og:*
// que generamos aquí dinámicamente desde los query params, y muestra una
// preview con la imagen de /api/og. La página visible al hacer click es
// minimalista: muestra el logro y un CTA para entrar a la app.

type Kind = "action_completed" | "insight" | "streak" | "default";
function parseKind(raw: string | string[] | undefined): Kind {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "action_completed" || v === "insight" || v === "streak") return v;
  return "default";
}
function getStr(raw: string | string[] | undefined, fallback: string): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return fallback;
  const trimmed = v.trim();
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}…` : trimmed;
}

const KIND_LABEL: Record<Kind, string> = {
  action_completed: "Acción completada",
  insight: "Momento de claridad",
  streak: "Racha activa",
  default: "Tres Mil Millones de Latidos",
};

type SearchParams = { [key: string]: string | string[] | undefined };

function getBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://tresmilmillonesdelatidos.es"
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const title = getStr(params.title, "Hoy he dado un paso real");
  const kind = parseKind(params.kind);
  const subtitle = getStr(
    params.subtitle,
    "Tres Mil Millones de Latidos · mentoría con IA en español",
  );
  const ogUrl = `${getBaseUrl()}/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(subtitle)}&kind=${kind}`;
  return {
    title,
    description: subtitle,
    openGraph: {
      title,
      description: subtitle,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: subtitle,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const title = getStr(params.title, "Hoy he dado un paso real");
  const kind = parseKind(params.kind);
  const label = KIND_LABEL[kind];

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300">
          {label}
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
          {title}
        </h1>
        <p className="text-zinc-400">
          Cada latido es una elección. Tres Mil Millones de Latidos te ayuda a
          ordenar pensamiento y mover a la acción, sin sustituir terapia.
        </p>
        <Link
          href="/app"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all"
        >
          Empezar gratis →
        </Link>
        <p className="text-xs text-zinc-600 pt-4">
          💓{" "}
          <Link href="/" className="hover:text-zinc-400 transition-colors">
            tresmilmillonesdelatidos.es
          </Link>
        </p>
      </div>
    </main>
  );
}
