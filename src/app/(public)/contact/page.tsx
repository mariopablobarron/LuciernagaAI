import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import ContactForm from "@/components/contact/ContactForm";
import { TYPOGRAPHY, GRADIENTS, LAYOUTS } from "@/styles/design-system";

// Metadata dinámica por locale (cookie NEXT_LOCALE).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default function ContactPage() {
  const t = useTranslations("contact");
  return (
    <div className={`min-h-screen bg-linear-to-br ${GRADIENTS.background} py-16 md:py-20 px-4`}>
      <div className={`${LAYOUTS.sectionInner} max-w-2xl space-y-8`}>
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className={`${TYPOGRAPHY.h1} bg-linear-to-r ${GRADIENTS.primary} bg-clip-text text-transparent`}>
            {t("title")}
          </h1>
          <p className={`${TYPOGRAPHY.body} text-cyan-300/80`}>{t("subtitle")}</p>
        </div>

        {/* Contact Form */}
        <Suspense fallback={null}>
          <ContactForm />
        </Suspense>
      </div>
    </div>
  );
}
