import { getPrismaClient } from "@/db/prisma";
import type {
  ChallengeType,
  ImpulseProfileCode,
  ImpulseProfileDefinition,
} from "@/types/impulse";

type ChallengeDefinition = {
  slug: string;
  profileCode: ImpulseProfileCode;
  type: ChallengeType;
  title: string;
  description: string;
  difficulty: number;
  durationDays: number;
  estimatedMinutes: number;
  instructions: string;
  successMetric: string;
};

export const IMPULSE_PROFILE_DEFINITIONS: ImpulseProfileDefinition[] = [
  {
    code: "BLOQUEADO",
    type: "bloqueado",
    title: "Bloqueado",
    description: "Hay intención, pero la fricción interna le gana a la ejecución.",
    operationalFocus: "Reducir fricción, cortar parálisis y volver a movimiento visible.",
  },
  {
    code: "ANSIOSO",
    type: "ansioso",
    title: "Ansioso",
    description: "La cabeza acelera más de lo que el cuerpo puede ejecutar.",
    operationalFocus: "Bajar ruido, acotar foco y convertir tensión en estructura.",
  },
  {
    code: "DESMOTIVADO",
    type: "desmotivado",
    title: "Desmotivado",
    description: "La energía está baja y el sistema necesita reactivar impulso.",
    operationalFocus: "Recuperar tracción con victorias cortas y repetibles.",
  },
  {
    code: "PERDIDO",
    type: "perdido",
    title: "Perdido",
    description: "Falta dirección clara; sobran opciones y falta decisión.",
    operationalFocus: "Reducir ambigüedad y fijar dirección práctica para esta semana.",
  },
  {
    code: "POTENCIAL_ALTO",
    type: "potencial_alto",
    title: "Potencial alto",
    description: "Hay capacidad y energía, pero el sistema debe sostener consistencia.",
    operationalFocus: "Canalizar ambición hacia ejecución enfocada y resultados visibles.",
  },
];

export const IMPULSE_CHALLENGE_DEFINITIONS: ChallengeDefinition[] = [
  {
    slug: "micro-arranque-visible",
    profileCode: "BLOQUEADO",
    type: "ejecucion",
    title: "Micro arranque visible",
    description: "Durante 3 días solo importa arrancar una tarea clave en menos de 10 minutos.",
    difficulty: 1,
    durationDays: 3,
    estimatedMinutes: 10,
    instructions:
      "Elige una tarea que llevas posponiendo. Cada día haz únicamente el primer bloque de 10 minutos y deja evidencia visible.",
    successMetric: "3 bloques de 10 minutos ejecutados con evidencia.",
  },
  {
    slug: "corta-la-friccion",
    profileCode: "BLOQUEADO",
    type: "disciplina",
    title: "Corta la fricción",
    description: "Eliminar tres obstáculos reales que te impiden empezar.",
    difficulty: 1,
    durationDays: 4,
    estimatedMinutes: 15,
    instructions:
      "Cada día identifica un bloqueo concreto y quítalo: cerrar pestañas, preparar materiales, dejar el primer archivo abierto o definir el primer paso.",
    successMetric: "3 fricciones eliminadas y una tarea arrancada.",
  },
  {
    slug: "evidencia-antes-de-opinar",
    profileCode: "BLOQUEADO",
    type: "claridad",
    title: "Evidencia antes de opinar",
    description: "Sustituir el 'no puedo' por una prueba pequeña de avance.",
    difficulty: 2,
    durationDays: 5,
    estimatedMinutes: 20,
    instructions:
      "Durante 5 días, antes de decir que sigues bloqueado, produce una evidencia mínima: una nota, un esquema, un mensaje enviado o una tarea empezada.",
    successMetric: "5 evidencias mínimas registradas.",
  },
  {
    slug: "una-prioridad-unica",
    profileCode: "ANSIOSO",
    type: "claridad",
    title: "Una prioridad única",
    description: "Entrenar el foco diario en una sola prioridad real.",
    difficulty: 1,
    durationDays: 3,
    estimatedMinutes: 12,
    instructions:
      "Cada mañana define una prioridad única. Todo lo demás se considera secundario hasta que avances en esa pieza.",
    successMetric: "3 días con una sola prioridad cumplida o iniciada.",
  },
  {
    slug: "cierre-de-bucles",
    profileCode: "ANSIOSO",
    type: "energia",
    title: "Cierre de bucles",
    description: "Reducir ansiedad cerrando pequeños pendientes abiertos.",
    difficulty: 2,
    durationDays: 5,
    estimatedMinutes: 15,
    instructions:
      "Cada día cierra un pendiente pequeño que siga consumiendo energía mental: responder, agendar, ordenar o decidir.",
    successMetric: "5 bucles cerrados en 5 días.",
  },
  {
    slug: "respira-y-decide",
    profileCode: "ANSIOSO",
    type: "social",
    title: "Respira y decide",
    description: "Practicar decisiones cortas sin pedir aprobación constante.",
    difficulty: 2,
    durationDays: 4,
    estimatedMinutes: 10,
    instructions:
      "Antes de pedir opinión, escribe tu decisión y la razón en dos líneas. Luego ejecuta o comunica esa decisión.",
    successMetric: "4 decisiones propias comunicadas o ejecutadas.",
  },
  {
    slug: "minimo-no-negociable",
    profileCode: "DESMOTIVADO",
    type: "disciplina",
    title: "Mínimo no negociable",
    description: "Recuperar impulso con una acción mínima diaria imposible de justificar.",
    difficulty: 1,
    durationDays: 7,
    estimatedMinutes: 8,
    instructions:
      "Define una acción tan pequeña que no puedas esconderte: abrir documento, caminar 5 minutos, mandar un mensaje, ordenar una tarea. Hazla cada día.",
    successMetric: "7 días seguidos cumpliendo el mínimo.",
  },
  {
    slug: "reactiva-tu-energia",
    profileCode: "DESMOTIVADO",
    type: "energia",
    title: "Reactiva tu energía",
    description: "Subir energía funcional antes de pedirte grandes decisiones.",
    difficulty: 1,
    durationDays: 5,
    estimatedMinutes: 15,
    instructions:
      "Combina una acción física corta con una acción mental ligera: moverte 10 minutos y definir una tarea simple para hoy.",
    successMetric: "5 check-ins con energía reportada al alza.",
  },
  {
    slug: "dos-opciones-maximo",
    profileCode: "PERDIDO",
    type: "claridad",
    title: "Dos opciones máximo",
    description: "Reducir ruido mental quedándote solo con dos direcciones posibles.",
    difficulty: 2,
    durationDays: 4,
    estimatedMinutes: 20,
    instructions:
      "Cada día reduce una decisión importante a dos opciones reales, define pros y contras breves y elige una antes de dormir.",
    successMetric: "4 decisiones cerradas entre solo dos opciones.",
  },
  {
    slug: "direccion-de-7-dias",
    profileCode: "PERDIDO",
    type: "ejecucion",
    title: "Dirección de 7 días",
    description: "Elegir un foco para esta semana y sostenerlo.",
    difficulty: 2,
    durationDays: 7,
    estimatedMinutes: 18,
    instructions:
      "Define un solo frente para los próximos 7 días. Cada check-in debe responder: qué hice hoy para mover esto.",
    successMetric: "7 días con acciones alineadas al mismo foco.",
  },
  {
    slug: "output-diario-visible",
    profileCode: "POTENCIAL_ALTO",
    type: "ejecucion",
    title: "Output diario visible",
    description: "Convertir capacidad en evidencia diaria en vez de intención ambiciosa.",
    difficulty: 3,
    durationDays: 5,
    estimatedMinutes: 30,
    instructions:
      "Cada día entrega una pieza visible: una página, una propuesta, un avance compartido o una tarea terminada.",
    successMetric: "5 outputs visibles en 5 días.",
  },
  {
    slug: "ambicion-con-sistema",
    profileCode: "POTENCIAL_ALTO",
    type: "disciplina",
    title: "Ambición con sistema",
    description: "Bajar dispersión y subir consistencia en personas de alto potencial.",
    difficulty: 3,
    durationDays: 7,
    estimatedMinutes: 25,
    instructions:
      "Elige un objetivo central y bloquea 25 minutos diarios sin multitarea. Solo cuenta si al final dejas una evidencia concreta.",
    successMetric: "7 bloques de foco profundo completados.",
  },
];

export async function ensureImpulseCatalog(): Promise<void> {
  const prisma = getPrismaClient();

  for (const definition of IMPULSE_PROFILE_DEFINITIONS) {
    await prisma.profile.upsert({
      where: { code: definition.code },
      update: {
        type: definition.type,
        title: definition.title,
        description: definition.description,
        operationalFocus: definition.operationalFocus,
      },
      create: {
        code: definition.code,
        type: definition.type,
        title: definition.title,
        description: definition.description,
        operationalFocus: definition.operationalFocus,
      },
    });
  }

  for (const challenge of IMPULSE_CHALLENGE_DEFINITIONS) {
    await prisma.challenge.upsert({
      where: { slug: challenge.slug },
      update: {
        type: challenge.type,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        durationDays: challenge.durationDays,
        estimatedMinutes: challenge.estimatedMinutes,
        instructions: challenge.instructions,
        successMetric: challenge.successMetric,
        profile: {
          connect: {
            code: challenge.profileCode,
          },
        },
      },
      create: {
        slug: challenge.slug,
        type: challenge.type,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        durationDays: challenge.durationDays,
        estimatedMinutes: challenge.estimatedMinutes,
        instructions: challenge.instructions,
        successMetric: challenge.successMetric,
        profile: {
          connect: {
            code: challenge.profileCode,
          },
        },
      },
    });
  }
}
