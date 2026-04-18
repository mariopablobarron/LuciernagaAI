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

// HowTo JSON-LD — AI engines (Google AI Overviews, Perplexity) cite
// step-by-step content with HowTo schema in answers to "¿Cómo uso X?"
// queries. Each step has a name + description AI can extract directly.
const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Cómo empezar en Tres Mil Millones de Latidos",
  description:
    "Pasos para empezar a usar Tres Mil Millones de Latidos: del registro a tu primera acción concreta del día.",
  totalTime: "PT10M",
  inLanguage: "es",
  image: "https://tresmilmillonesdelatidos.es/opengraph-image",
  step: [
    {
      "@type": "HowToStep",
      name: "Crear cuenta",
      text: "Regístrate con email o Google. Aceptas el consentimiento informado, que explica que la plataforma no sustituye a un terapeuta y que el equipo clínico puede revisar tu información en casos de riesgo.",
      url: "https://tresmilmillonesdelatidos.es/signup",
    },
    {
      "@type": "HowToStep",
      name: "Hacer tu primer check-in",
      text: "Respondes qué sientes (bloqueo, ansiedad, duda, claridad, neutral), tu nivel de energía y una nota breve. El sistema calcula un estado emocional que calibra las respuestas del mentor a partir de ahí.",
    },
    {
      "@type": "HowToStep",
      name: "Crear tu primer objetivo",
      text: "Declaras lo que te tiene parado en una frase. El sistema lo convierte en un objetivo con 3-5 acciones concretas acotadas en tiempo. El mentor te acompañará hasta completarlo.",
    },
    {
      "@type": "HowToStep",
      name: "Conversar con el mentor",
      text: "Escribe en el chat como hablarías con alguien que te conoce. El mentor interpela, no instruye — hace preguntas que te obligan a ver lo que no estás viendo. Nunca da motivación hueca.",
    },
    {
      "@type": "HowToStep",
      name: "Ejecutar una microacción",
      text: "El mentor cierra cada conversación con una acción de 10-15 minutos. La haces hoy, la marcas como completada o postpuesta, y mañana se ajusta en función de lo que hiciste.",
    },
    {
      "@type": "HowToStep",
      name: "Vincular Telegram (opcional)",
      text: "Desde ajustes, vinculas Telegram con /vincular. Recibes check-ins diarios por la mañana y por la noche, y puedes conversar con el mentor sin abrir la web.",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      {children}
    </>
  );
}
