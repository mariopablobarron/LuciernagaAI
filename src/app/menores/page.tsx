import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("minors");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default function MenoresPage() {
  const t = useTranslations("minors");
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full">
        <h1
          className="text-4xl md:text-5xl font-semibold text-white mb-6 leading-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {t("heading")}
        </h1>

        <div className="space-y-4 text-zinc-300 text-base md:text-lg leading-relaxed">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6">
          <p className="text-sm font-semibold text-violet-200 mb-2">{t("resourceTitle")}</p>
          <a
            href="tel:900202010"
            className="text-3xl md:text-4xl font-bold text-white tracking-wide"
          >
            {t("resourcePhone")}
          </a>
          <p className="text-xs text-violet-300/80 mt-2">{t("resourceHint")}</p>
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
          <p>{t("emergency")}</p>
          <p className="mt-2">{t("comeBack")}</p>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-xs text-zinc-500 underline hover:text-zinc-300"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
