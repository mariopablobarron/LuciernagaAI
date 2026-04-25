export const ONBOARDING_HEADLINE = "Convierte claridad en acción";

export const ONBOARDING_SUBTITLE =
  "Empieza por lo que llevas tiempo evitando y Tres Mil Millones de Latidos lo convierte en una primera acción concreta.";

export const ONBOARDING_STARTER_QUESTION = "¿Qué llevas semanas evitando hacer?";

// Quick-picks mostrados en el empty state del chat. Son prompts EXPLORATORIOS:
// clicarlos NO debe crear compromisos persistentes (acciones/goals) hasta que
// el usuario confirme explícitamente en turnos posteriores.
export const CHAT_STARTER_PICKS = [
  "Estoy bloqueado y no sé cómo empezar",
  "Tengo demasiadas cosas y no sé por dónde ir",
  "Necesito tomar una decisión importante",
  "Quiero salir de un patrón que se repite",
];

export function isChatStarterPick(message: string): boolean {
  const normalized = message.trim().toLowerCase().replace(/[.!?…]+$/g, "");
  return CHAT_STARTER_PICKS.some(
    (starter) => starter.toLowerCase() === normalized,
  );
}

// Pool de frases interpelativas. Todas en primera persona del usuario, confesionales,
// sin saludos ni preguntas "menú". El chat NO precarga ninguna en el input — se muestran
// como sugerencias clicables para que el usuario mantenga agencia.
export const ONBOARDING_EXAMPLE_PROMPTS = [
  {
    label: "Enviar ese mensaje",
    value: "Llevo semanas evitando enviar un mensaje importante.",
  },
  {
    label: "Nombrar lo que pesa",
    value: "Me pesa algo que ni siquiera sé cómo nombrar.",
  },
  {
    label: "Decisión que pospongo",
    value: "Hay una decisión que llevo días posponiendo.",
  },
  {
    label: "Patrón que se repite",
    value: "Hoy he hecho otra vez eso que sé que no me conviene.",
  },
  {
    label: "Conversación pendiente",
    value: "Hay una conversación que llevo semanas evitando.",
  },
  {
    label: "Decir en voz alta",
    value: "Llevo tiempo pensando algo que no me atrevo a decir en voz alta.",
  },
  {
    label: "Fallar a alguien",
    value: "Hoy he vuelto a fallar a alguien. O a mí.",
  },
  {
    label: "Fuera de sitio",
    value: "Llevo una semana sintiendo que no estoy donde debería estar.",
  },
];

export const DEFAULT_ONBOARDING_EXAMPLE = ONBOARDING_EXAMPLE_PROMPTS[0].value;

// Modos de acompañamiento. El usuario elige cómo quiere que el mentor le trate.
// El `instruction` se inyecta en el mensaje enviado al backend para modular el tono.
export type MentorMode = {
  id: string;
  icon: string;
  label: string;
  description: string;
  instruction: string;
};

// icon es el nombre de un componente Lucide; el render lo resuelve a JSX.
// Usamos un set lineal monocromo coherente con el resto de la UI en lugar
// de emojis sueltos que se ven incoherentes entre plataformas.
export const MENTOR_MODES: MentorMode[] = [
  {
    id: "concretar",
    icon: "Target",
    label: "Aterriza algo concreto",
    description: "Tengo una idea vaga y quiero salir con 1-3 pasos reales.",
    instruction:
      "El usuario quiere salir con 1-3 pasos concretos. Cada respuesta debe acercarle a acción clara, no divagar.",
  },
  {
    id: "espejo",
    icon: "Eye",
    label: "Devuélveme el reflejo",
    description: "No quiero consejos. Quiero ver lo que digo desde fuera.",
    instruction:
      "El usuario NO quiere consejos. Devuélvele sus propias palabras, patrones y contradicciones. No sugieras soluciones hasta que él las nombre.",
  },
  {
    id: "confrontar",
    icon: "Zap",
    label: "Confróntame",
    description: "No me dores la píldora. Dime lo que no quiero oír.",
    instruction:
      "El usuario autoriza confrontación directa. Nombra lo que evita, lo que justifica, lo que no quiere ver. Respetuoso pero sin suavizar.",
  },
  {
    id: "decidir",
    icon: "GitBranch",
    label: "Ayúdame a decidir",
    description: "Quiero cerrar el chat con una decisión, no con más opciones.",
    instruction:
      "El usuario quiere llegar a UNA decisión. Estructura el diálogo hacia un cierre con compromiso explícito. No multipliques opciones.",
  },
  {
    id: "patron",
    icon: "Repeat",
    label: "Sácame del patrón",
    description: "Llevo repitiendo lo mismo y quiero entender por qué.",
    instruction:
      "El usuario quiere identificar un patrón recurrente. Busca raíz, creencia o ganancia oculta. No propongas soluciones antes de nombrar el patrón con precisión.",
  },
  {
    id: "escuchar",
    icon: "Ear",
    label: "Solo escúchame",
    description: "No quiero ir a ninguna parte. Solo necesito soltar.",
    instruction:
      "El usuario quiere ser escuchado. No propongas nada. Valida, refleja, acompaña. No empujes hacia acción a menos que él lo pida.",
  },
];

export function getMentorMode(id: string | null | undefined): MentorMode | null {
  if (!id) return null;
  return MENTOR_MODES.find((m) => m.id === id) ?? null;
}
