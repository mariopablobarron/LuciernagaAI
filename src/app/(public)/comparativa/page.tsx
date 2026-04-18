import Link from "next/link";
import {
  ArrowRight,
  Check,
  X as XIcon,
  HelpCircle,
  Scale,
  Shield,
  Stethoscope,
} from "lucide-react";

// ─── JSON-LD schemas ────────────────────────────────────────────────────────
// ItemList schema lists the alternatives compared; FAQPage covers the common
// questions the comparison raises. Both help AI engines cite this page for
// queries like "Tres Mil Millones de Latidos vs ChatGPT" or "alternativas a terapia online".

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Tres Mil Millones de Latidos vs ChatGPT, terapia y apps de bienestar",
  description:
    "Comparativa objetiva entre Tres Mil Millones de Latidos, ChatGPT, terapia tradicional y apps de meditación.",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Tres Mil Millones de Latidos (Tres Mil Millones de Latidos)",
      url: "https://tresmilmillonesdelatidos.es",
    },
    { "@type": "ListItem", position: 2, name: "ChatGPT / Claude / Gemini" },
    { "@type": "ListItem", position: 3, name: "Terapia tradicional" },
    { "@type": "ListItem", position: 4, name: "Apps de meditación (Calm, Headspace)" },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Es Tres Mil Millones de Latidos un sustituto de la terapia psicológica?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Tres Mil Millones de Latidos no diagnostica, no prescribe, y no sustituye a un terapeuta profesional. Es un acompañamiento entre sesiones o un primer punto de contacto para personas que aún no acceden a terapia. Tiene una psicóloga responsable del criterio clínico que supervisa detección de riesgo e intervenciones.",
      },
    },
    {
      "@type": "Question",
      name: "¿Por qué no usar simplemente ChatGPT o Claude?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ChatGPT y Claude son asistentes genéricos. Tres Mil Millones de Latidos aplica un marco pedagógico específico (interpelar antes que instruir, preguntas antes que respuestas), detecta lenguaje de riesgo y deriva a recursos clínicos, recuerda tu estado emocional entre sesiones, propone acciones concretas acotadas en tiempo, y está supervisado por una profesional de la psicología. ChatGPT responde a cualquier cosa sin contexto; Tres Mil Millones de Latidos acompaña un proceso.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuándo conviene una app de meditación como Calm o Headspace en lugar de Tres Mil Millones de Latidos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Si lo que buscas es relajación guiada, higiene del sueño o mindfulness sin un proceso personalizado, una app de meditación es más directa. Tres Mil Millones de Latidos es conversacional y se centra en bloqueos, decisiones y transiciones vitales — no reemplaza ejercicios de respiración o sesiones de meditación guiada. Pueden complementarse.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuándo ir a terapia en lugar de usar Tres Mil Millones de Latidos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Siempre que haya diagnóstico clínico previo, ideación suicida persistente, trastornos alimenticios graves, dependencias severas, psicosis, o sospecha de trauma complejo. Tres Mil Millones de Latidos puede acompañar entre sesiones, pero no sustituye el tratamiento profesional 1:1. Si no tienes terapeuta y crees que lo necesitas, Tres Mil Millones de Latidos te lo sugerirá explícitamente.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué pasa con mi privacidad? ¿Quién puede leer mis conversaciones?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Las conversaciones se procesan por IA externa (Anthropic Claude vía OpenRouter) bajo acuerdo de privacidad. En el servidor de Tres Mil Millones de Latidos, el rol clinical puede acceder a conversaciones de usuarios con riskLevel alto o crisis activa como parte del protocolo de supervisión clínica. Tus datos están cifrados en tránsito (TLS) y puedes pedir borrado completo en cualquier momento (GDPR).",
      },
    },
  ],
};

type Row = {
  criterio: string;
  producto: { label: string; tone: "good" | "warn" | "bad" | "neutral" };
  chatgpt: { label: string; tone: "good" | "warn" | "bad" | "neutral" };
  terapia: { label: string; tone: "good" | "warn" | "bad" | "neutral" };
  meditacion: { label: string; tone: "good" | "warn" | "bad" | "neutral" };
};

const COMPARISON: Row[] = [
  {
    criterio: "Propósito principal",
    producto: { label: "Acompañar bloqueos, decisiones y acción", tone: "neutral" },
    chatgpt: { label: "Asistente conversacional genérico", tone: "neutral" },
    terapia: { label: "Tratamiento clínico 1:1", tone: "neutral" },
    meditacion: { label: "Relajación, sueño, mindfulness", tone: "neutral" },
  },
  {
    criterio: "Marco pedagógico propio",
    producto: { label: "Sí — interpela, no instruye", tone: "good" },
    chatgpt: { label: "No — responde lo que se le pida", tone: "bad" },
    terapia: { label: "Según el terapeuta", tone: "warn" },
    meditacion: { label: "Ejercicios, no diálogo", tone: "neutral" },
  },
  {
    criterio: "Detección automática de crisis",
    producto: { label: "Sí — lenguaje de riesgo → recursos clínicos", tone: "good" },
    chatgpt: { label: "Parcial, no estructurada", tone: "warn" },
    terapia: { label: "Solo en la sesión", tone: "warn" },
    meditacion: { label: "No", tone: "bad" },
  },
  {
    criterio: "Supervisión clínica humana",
    producto: { label: "Sí — psicóloga responsable del sistema", tone: "good" },
    chatgpt: { label: "No", tone: "bad" },
    terapia: { label: "Sí — es humana directamente", tone: "good" },
    meditacion: { label: "No", tone: "bad" },
  },
  {
    criterio: "Contexto persistente entre sesiones",
    producto: { label: "Sí — estado emocional + objetivos + historial", tone: "good" },
    chatgpt: { label: "Parcial (depende del plan)", tone: "warn" },
    terapia: { label: "Sí — notas clínicas del terapeuta", tone: "good" },
    meditacion: { label: "No", tone: "bad" },
  },
  {
    criterio: "Acciones concretas y medibles",
    producto: { label: "Sí — microacciones de 10-15 min, objetivos, seguimiento", tone: "good" },
    chatgpt: { label: "Si se lo pides", tone: "warn" },
    terapia: { label: "Si el terapeuta las asigna", tone: "warn" },
    meditacion: { label: "No aplica", tone: "neutral" },
  },
  {
    criterio: "Comunidad entre pares",
    producto: { label: "Sí — círculos de 5-8 personas + sesiones sincrónicas semanales", tone: "good" },
    chatgpt: { label: "No", tone: "bad" },
    terapia: { label: "Opcional — terapia grupal", tone: "warn" },
    meditacion: { label: "Foros ligeros en algunas apps", tone: "warn" },
  },
  {
    criterio: "Disponibilidad",
    producto: { label: "24/7 — web y Telegram", tone: "good" },
    chatgpt: { label: "24/7", tone: "good" },
    terapia: { label: "Solo en citas", tone: "warn" },
    meditacion: { label: "24/7", tone: "good" },
  },
  {
    criterio: "Privacidad y borrado GDPR",
    producto: { label: "Sí — hard delete, cifrado en tránsito, política clara", tone: "good" },
    chatgpt: { label: "Política OpenAI/Anthropic estándar", tone: "warn" },
    terapia: { label: "Secreto profesional", tone: "good" },
    meditacion: { label: "Variable por proveedor", tone: "warn" },
  },
  {
    criterio: "Precio mensual referencia",
    producto: { label: "0€ Free · 9€ Pro", tone: "good" },
    chatgpt: { label: "0-20€ (ChatGPT Plus)", tone: "good" },
    terapia: { label: "40-80€ por sesión", tone: "bad" },
    meditacion: { label: "10-15€/mes", tone: "warn" },
  },
  {
    criterio: "¿Sustituye a un terapeuta profesional?",
    producto: { label: "NO — lo dice explícitamente", tone: "neutral" },
    chatgpt: { label: "No se pronuncia", tone: "warn" },
    terapia: { label: "Es terapia", tone: "good" },
    meditacion: { label: "NO", tone: "neutral" },
  },
];

function Cell({ data }: { data: Row["producto"] }) {
  const icon =
    data.tone === "good" ? (
      <Check className="inline w-3.5 h-3.5 text-emerald-400 mr-1" />
    ) : data.tone === "bad" ? (
      <XIcon className="inline w-3.5 h-3.5 text-red-400 mr-1" />
    ) : data.tone === "warn" ? (
      <HelpCircle className="inline w-3.5 h-3.5 text-amber-400 mr-1" />
    ) : null;
  return (
    <td className="px-3 py-2 align-top text-xs text-zinc-300 leading-relaxed">
      {icon}
      {data.label}
    </td>
  );
}

export default function ComparativaPage() {
  const lastUpdated = "Abril 2026";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="min-h-screen bg-zinc-950 text-white">
        {/* Hero */}
        <section className="relative py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
              Comparativa
            </p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-white">
              Tres Mil Millones de Latidos vs ChatGPT, terapia y apps de bienestar
            </h1>
            <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              Si estás decidiendo qué herramienta usar para ordenar lo que te pasa,
              esto compara honestamente qué hace cada una y cuándo conviene elegir cuál.
              Sin exagerar lo nuestro. Sin ocultar lo que no hacemos.
            </p>
            <p className="text-xs text-zinc-600">
              Última actualización: <time dateTime="2026-04-15">{lastUpdated}</time> ·
              Revisado por el equipo clínico de Tres Mil Millones de Latidos.
            </p>
          </div>
        </section>

        {/* Tabla comparativa */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <Scale className="w-4 h-4 text-violet-300" />
              <h2 className="text-sm font-semibold text-white">
                Comparativa punto a punto
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-3 font-semibold">Criterio</th>
                    <th className="px-3 py-3 font-semibold text-violet-300">Tres Mil Millones de Latidos</th>
                    <th className="px-3 py-3 font-semibold">ChatGPT / Claude</th>
                    <th className="px-3 py-3 font-semibold">Terapia tradicional</th>
                    <th className="px-3 py-3 font-semibold">Apps meditación</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr
                      key={row.criterio}
                      className="border-b border-zinc-900 align-top"
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 text-xs font-semibold text-white align-top whitespace-nowrap"
                      >
                        {row.criterio}
                      </th>
                      <Cell data={row.producto} />
                      <Cell data={row.chatgpt} />
                      <Cell data={row.terapia} />
                      <Cell data={row.meditacion} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Secciones respondiendo preguntas concretas — formato que los LLM citan */}
        <section className="max-w-3xl mx-auto px-4 pb-16 space-y-12">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-400" />
              ¿Cuándo elegir Tres Mil Millones de Latidos y cuándo elegir terapia?
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              <strong className="text-white">Elige terapia profesional</strong> si tienes
              diagnóstico clínico previo, ideación suicida persistente, trastornos alimenticios
              graves, dependencias sin tratamiento, sospecha de psicosis o trauma complejo. En
              esos casos la plataforma no es suficiente y te lo diremos explícitamente desde el chat.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              <strong className="text-white">Elige Tres Mil Millones de Latidos</strong> si estás en bloqueos,
              dudas, transiciones vitales, procrastinación o necesitas un espacio estructurado
              para ordenar pensamiento y pasar a acción. También si ya tienes terapeuta y
              necesitas acompañamiento <em>entre sesiones</em>.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              <strong className="text-white">Usa ambos</strong> cuando tu terapeuta lo vea
              útil: muchos profesionales trabajan con nosotros como complemento estructurado
              entre sus consultas. Ver{" "}
              <Link
                href="/para-profesionales"
                className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
              >
                /para-profesionales
              </Link>
              .
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-400" />
              ¿Por qué no simplemente usar ChatGPT o Claude?
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Porque <strong className="text-white">ChatGPT y Claude son asistentes
              genéricos</strong>, no mentores. Responden lo que les pidas: si les pides
              motivación barata, te la dan; si les pides consejo clínico, también (y ahí hay
              un riesgo real). Tres Mil Millones de Latidos tiene un marco pedagógico hardcoded: prohibido dar
              imperativos huecos como "tú puedes" o "sigue así", obligatorio terminar en
              pregunta, y cuando detecta lenguaje de autolesión o ideación suicida,
              <strong className="text-white"> deja de conversar como coach</strong> y deriva
              a recursos de emergencia + alerta al equipo clínico.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Además, Tres Mil Millones de Latidos recuerda tu estado emocional entre sesiones, tus objetivos
              activos y las acciones que completaste o postergaste. ChatGPT, por defecto,
              empieza de cero cada conversación.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">
              ¿Qué aporta Tres Mil Millones de Latidos que no aportan Calm, Headspace u otras apps de meditación?
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Calm y Headspace son excelentes para <strong className="text-white">relajación
              guiada, higiene del sueño y práctica de mindfulness</strong>. Son ejercicios
              pre-grabados que tú ejecutas. No hay conversación, no hay seguimiento de tu
              contexto, no hay acción fuera del momento de la meditación.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Tres Mil Millones de Latidos hace lo contrario: <strong className="text-white">conversación
              estructurada + acciones concretas fuera de la app</strong>. El foco no es
              bajar el estrés del momento, es avanzar en lo que tienes parado. No son
              excluyentes: puedes usar Calm para dormir mejor y Tres Mil Millones de Latidos para decidir si
              dejas tu trabajo. Son herramientas distintas.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">
              Privacidad y supervisión clínica — lo que debes saber
            </h2>
            <ul className="space-y-2 text-sm text-zinc-400 leading-relaxed">
              <li>
                <strong className="text-white">Tus conversaciones</strong> se procesan por
                IA externa (Anthropic Claude) bajo acuerdo de privacidad con el proveedor.
              </li>
              <li>
                <strong className="text-white">El rol clínico</strong> del equipo puede
                acceder al historial de usuarios con riesgo elevado (protocolo supervisado
                por la psicóloga responsable). Esto se documenta en el consentimiento al
                registrarte.
              </li>
              <li>
                <strong className="text-white">Datos en tránsito cifrados</strong> (TLS).
                No hay cifrado adicional a nivel de columna en la base de datos —
                recomendamos no compartir información que no compartirías con un
                proveedor de software estándar.
              </li>
              <li>
                <strong className="text-white">Borrado completo GDPR</strong> (hard delete)
                disponible en cualquier momento desde los ajustes de cuenta.
              </li>
            </ul>
          </div>
        </section>

        {/* CTA final */}
        <section className="max-w-3xl mx-auto px-4 pb-20 text-center space-y-5">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            ¿Quieres ver cómo funciona antes de decidir?
          </h2>
          <p className="text-sm text-zinc-400">
            Lee el método antes de registrarte. Sin dar email.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/como-funciona"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-500/40 text-violet-200 hover:bg-violet-500/10 transition-colors"
            >
              Leer el método <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all"
            >
              Probar gratis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
