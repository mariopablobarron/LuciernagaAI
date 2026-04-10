import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guia de usuario — Tres Mil Millones de Latidos",
  description:
    "Guia completa de Tres Mil Millones de Latidos: chat con mentor IA, check-ins diarios, diario emocional, metas, respiracion, comunidad, Modo Impulso 21 dias y Telegram. Paso a paso.",
  alternates: {
    canonical: "https://tresmilmillonesdelatidos.es/guia",
  },
  openGraph: {
    title: "Guia de usuario — Tres Mil Millones de Latidos",
    description:
      "Todo lo que necesitas para usar Tres Mil Millones de Latidos: chat, check-ins, diario, metas, respiracion, comunidad y Modo Impulso.",
    type: "article",
    locale: "es_ES",
    siteName: "Tres Mil Millones de Latidos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Guia — Tres Mil Millones de Latidos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guia de usuario — Tres Mil Millones de Latidos",
    description: "Guia paso a paso del mentor con IA: chat, check-ins, diario, metas y Modo Impulso.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Qué es Tres Mil Millones de Latidos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Es una plataforma de mentoría conversacional con inteligencia artificial que te ayuda a pasar del bloqueo a la acción. Detecta tu estado emocional y te guía con objetivos, acciones concretas, check-ins diarios y retos de transformación de 21 días.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuánto cuesta Tres Mil Millones de Latidos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tiene un plan Free (0 €) con 10 conversaciones al mes y un plan Pro (9 €/mes o 79 €/año) con conversaciones ilimitadas, Modo Impulso de 21 días y journeys completos.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo usar Tres Mil Millones de Latidos en Telegram?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Busca el bot en Telegram, envía /start, acepta los términos y empieza a conversar. Puedes vincular tu cuenta web con /vincular para sincronizar tu historial.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué es el Modo Impulso?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Es un programa intensivo de transformación personal de 21 días disponible en el plan Pro. Incluye un diagnóstico inicial, retos personalizados, check-ins diarios y mensajes motivacionales adaptados a tu perfil.",
      },
    },
    {
      "@type": "Question",
      name: "¿Sustituye a un psicólogo o terapeuta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Tres Mil Millones de Latidos es una herramienta de apoyo y mentoría, no un sustituto de atención médica o psicológica profesional. Si hay riesgo inmediato, llama al 024.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cómo protege mis datos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tus conversaciones son privadas y no se comparten con terceros para fines publicitarios. Puedes exportar o eliminar tus datos en cualquier momento desde Ajustes.",
      },
    },
  ],
};

export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
