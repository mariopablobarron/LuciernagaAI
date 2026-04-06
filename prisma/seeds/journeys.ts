/**
 * Seed data for the 4 core journeys.
 * Run via: npx dotenv -e .env -- tsx prisma/seeds/journeys.ts
 * Or:      DATABASE_URL=... npx tsx prisma/seeds/journeys.ts
 */

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JOURNEYS = [
  {
    slug: "autoconocimiento",
    title: "Conócete",
    description:
      "Identifica quién eres realmente: tus patrones, emociones, fortalezas y bloqueos. Sin entenderte, cualquier acción es un disparo al aire.",
    phase: "autoconocimiento",
    order: 1,
    iconEmoji: "🔍",
    durationWeeks: 3,
    modules: [
      {
        slug: "patrones-emocionales",
        title: "Tus patrones emocionales",
        description:
          "Aprende a identificar qué sientes, por qué lo sientes y qué haces automáticamente cuando lo sientes.",
        order: 1,
        iconEmoji: "🌊",
        exercises: [
          {
            slug: "mapa-emocional",
            title: "Mapa emocional de tu semana",
            description:
              "Revisa los últimos 7 días e identifica qué emociones dominaron cada momento.",
            type: "reflection",
            order: 1,
            estimatedMinutes: 12,
            instructions: [
              {
                step: 0,
                title: "Recuerda tu semana",
                prompt:
                  "Cierra los ojos 30 segundos. Recorre tu semana mentalmente: lunes a hoy. ¿Qué momentos te vienen primero?",
                inputType: "none",
              },
              {
                step: 1,
                title: "Identifica 3 momentos intensos",
                prompt:
                  "Escribe 3 momentos de esta semana donde sentiste algo con intensidad (positivo o negativo). Describe brevemente qué pasó y qué sentiste.",
                inputType: "text",
              },
              {
                step: 2,
                title: "Busca el patrón",
                prompt:
                  "Mira los 3 momentos. ¿Hay algo en común? ¿Una emoción que se repite? ¿Una situación que te activa siempre?",
                inputType: "text",
              },
              {
                step: 3,
                title: "Tu emoción dominante",
                prompt: "Si tuvieras que elegir UNA emoción que definió tu semana, ¿cuál sería?",
                inputType: "choice",
                options: [
                  "Ansiedad",
                  "Frustración",
                  "Confusión",
                  "Apatía",
                  "Calma",
                  "Ilusión",
                ],
              },
            ],
            debrief:
              "Analiza qué emoción dominante eligió y cómo se conecta con los momentos que describió. Busca el patrón subyacente.",
            tags: ["emociones", "patrones", "autoconocimiento"],
          },
          {
            slug: "reacciones-automaticas",
            title: "Tus reacciones automáticas",
            description:
              "Identifica qué haces automáticamente cuando sientes ansiedad, frustración o confusión.",
            type: "writing",
            order: 2,
            estimatedMinutes: 10,
            instructions: [
              {
                step: 0,
                title: "Cuando sientes ansiedad...",
                prompt:
                  "¿Qué haces AUTOMÁTICAMENTE cuando sientes ansiedad? (Ej: reviso el móvil, como, evito, me aíslo, sobreplaneo...)",
                inputType: "text",
              },
              {
                step: 1,
                title: "Cuando sientes frustración...",
                prompt:
                  "¿Qué haces automáticamente cuando algo te frustra? (Ej: abandono, me enfado con otros, me exijo más, me callo...)",
                inputType: "text",
              },
              {
                step: 2,
                title: "Cuando sientes confusión...",
                prompt:
                  "¿Qué haces automáticamente cuando no sabes qué hacer? (Ej: pido opinión a todos, no hago nada, busco más información sin parar...)",
                inputType: "text",
              },
              {
                step: 3,
                title: "El patrón común",
                prompt:
                  "Mira tus 3 respuestas. ¿Cuál es tu modo por defecto? ¿Evitas, controlas o te paralizas?",
                inputType: "choice",
                options: ["Evito", "Controlo", "Me paralizo", "Otro"],
              },
            ],
            debrief:
              "Nombra el modo por defecto que identificó (evitar, controlar, paralizarse) y explica cómo ese modo le protege pero también le frena.",
            tags: ["reacciones", "patrones", "defensa"],
          },
          {
            slug: "linea-de-energia",
            title: "Tu línea de energía",
            description:
              "Mapea a qué horas y en qué contextos tienes más y menos energía.",
            type: "reflection",
            order: 3,
            estimatedMinutes: 8,
            instructions: [
              {
                step: 0,
                title: "Mañana",
                prompt:
                  "¿Cómo es tu energía por las mañanas normalmente? Del 1 al 5.",
                inputType: "scale",
                scaleMin: 1,
                scaleMax: 5,
                scaleLabels: { min: "Sin energía", max: "Máxima energía" },
              },
              {
                step: 1,
                title: "Tarde",
                prompt: "¿Cómo es tu energía por las tardes? Del 1 al 5.",
                inputType: "scale",
                scaleMin: 1,
                scaleMax: 5,
                scaleLabels: { min: "Sin energía", max: "Máxima energía" },
              },
              {
                step: 2,
                title: "Noche",
                prompt: "¿Cómo es tu energía por las noches? Del 1 al 5.",
                inputType: "scale",
                scaleMin: 1,
                scaleMax: 5,
                scaleLabels: { min: "Sin energía", max: "Máxima energía" },
              },
              {
                step: 3,
                title: "Tu ventana de acción",
                prompt:
                  "Basándote en lo anterior, ¿cuál es tu mejor momento del día para tomar decisiones y ejecutar cosas importantes?",
                inputType: "text",
              },
            ],
            debrief:
              "Conecta su mapa de energía con las acciones y decisiones que necesita tomar. Si su energía alta coincide con su momento de evitar, señálalo.",
            tags: ["energía", "productividad", "autoconocimiento"],
          },
        ],
      },
      {
        slug: "fortalezas-bloqueos",
        title: "Fortalezas y bloqueos",
        description:
          "Identifica qué haces bien sin esfuerzo y qué te cuesta de forma recurrente.",
        order: 2,
        iconEmoji: "⚡",
        exercises: [
          {
            slug: "inventario-fortalezas",
            title: "Inventario de fortalezas",
            description:
              "Descubre qué haces bien — no lo que crees que deberías hacer bien, sino lo que fluye.",
            type: "writing",
            order: 1,
            estimatedMinutes: 10,
            instructions: [
              {
                step: 0,
                title: "Lo que fluye",
                prompt:
                  "Escribe 3 actividades o situaciones donde te sientes competente y el tiempo pasa sin darte cuenta.",
                inputType: "text",
              },
              {
                step: 1,
                title: "Lo que te dicen",
                prompt:
                  "¿Qué es lo que la gente suele reconocerte o pedirte ayuda? (Aunque a ti te parezca fácil o sin valor.)",
                inputType: "text",
              },
              {
                step: 2,
                title: "Tu fortaleza central",
                prompt:
                  "Si tuvieras que resumir tu principal fortaleza en una frase, ¿cuál sería?",
                inputType: "text",
              },
            ],
            debrief:
              "Ayúdale a ver que sus fortalezas son reales aunque le parezcan normales. Conecta su fortaleza central con posibles direcciones.",
            tags: ["fortalezas", "identidad", "autoconocimiento"],
          },
          {
            slug: "mapa-bloqueos",
            title: "Mapa de bloqueos recurrentes",
            description:
              "Identifica los 3 bloqueos que más se repiten en tu vida.",
            type: "reflection",
            order: 2,
            estimatedMinutes: 12,
            instructions: [
              {
                step: 0,
                title: "El bloqueo que se repite",
                prompt:
                  "¿Qué situación, decisión o tipo de tarea se te atraganta una y otra vez? Descríbela con detalle.",
                inputType: "text",
              },
              {
                step: 1,
                title: "¿Qué sientes cuando aparece?",
                prompt:
                  "Cuando ese bloqueo aparece, ¿qué emoción domina? ¿Y qué te dices a ti mismo?",
                inputType: "text",
              },
              {
                step: 2,
                title: "La creencia detrás",
                prompt:
                  "¿Qué creencia sobre ti mismo sostiene ese bloqueo? (Ej: 'no soy capaz', 'si fallo es catastrófico', 'otros lo hacen mejor')",
                inputType: "text",
              },
              {
                step: 3,
                title: "Intensidad del bloqueo",
                prompt: "¿Cuánto impacto tiene este bloqueo en tu vida del 1 al 5?",
                inputType: "scale",
                scaleMin: 1,
                scaleMax: 5,
                scaleLabels: { min: "Leve", max: "Me paraliza" },
              },
            ],
            debrief:
              "Nombra la creencia limitante que identificó y señala cómo funciona como protección. No la invalides — muéstrale que la ve por primera vez conscientemente.",
            tags: ["bloqueos", "creencias", "autoconocimiento"],
          },
        ],
      },
    ],
  },
  {
    slug: "gestion-emocional",
    title: "Gestiona tus emociones",
    description:
      "Aprende herramientas prácticas para regular lo que sientes sin evitarlo ni dejarte arrastrar.",
    phase: "gestion_emocional",
    order: 2,
    iconEmoji: "🧘",
    durationWeeks: 3,
    modules: [
      {
        slug: "regulacion-basica",
        title: "Regulación emocional básica",
        description:
          "Técnicas inmediatas para bajar la intensidad emocional cuando te desborda.",
        order: 1,
        iconEmoji: "🌬️",
        exercises: [
          {
            slug: "respiracion-4-7-8",
            title: "Respiración 4-7-8",
            description:
              "Una técnica simple de respiración que activa tu sistema nervioso parasimpático en menos de 2 minutos.",
            type: "breathing",
            order: 1,
            estimatedMinutes: 5,
            instructions: [
              {
                step: 0,
                title: "Prepárate",
                prompt:
                  "Siéntate cómodo. Cierra los ojos si puedes. Pon una mano en el pecho y otra en el abdomen.",
                inputType: "none",
              },
              {
                step: 1,
                title: "Inhala 4 segundos",
                prompt: "Inhala por la nariz contando hasta 4. Siente cómo se llena el abdomen.",
                inputType: "none",
              },
              {
                step: 2,
                title: "Retén 7 segundos",
                prompt: "Mantén el aire contando hasta 7. Sin tensión, simplemente retén.",
                inputType: "none",
              },
              {
                step: 3,
                title: "Exhala 8 segundos",
                prompt: "Exhala lentamente por la boca contando hasta 8. Repite 3 veces.",
                inputType: "none",
              },
              {
                step: 4,
                title: "¿Cómo te sientes ahora?",
                prompt: "Del 1 al 5, ¿cuánta calma sientes después del ejercicio?",
                inputType: "scale",
                scaleMin: 1,
                scaleMax: 5,
                scaleLabels: { min: "Igual de agitado", max: "Mucho más tranquilo" },
              },
            ],
            debrief:
              "Valida cualquier nivel de calma logrado. Si fue bajo, normalízalo — la regulación es una habilidad que se entrena.",
            tags: ["respiración", "regulación", "ansiedad"],
          },
          {
            slug: "anclaje-5-sentidos",
            title: "Anclaje con 5 sentidos",
            description:
              "Técnica de grounding para volver al presente cuando la ansiedad te saca de tu cuerpo.",
            type: "breathing",
            order: 2,
            estimatedMinutes: 7,
            instructions: [
              {
                step: 0,
                title: "5 cosas que ves",
                prompt: "Mira a tu alrededor. Nombra 5 cosas que puedes ver ahora mismo.",
                inputType: "text",
              },
              {
                step: 1,
                title: "4 cosas que puedes tocar",
                prompt: "Toca 4 superficies diferentes. Describe la textura de cada una.",
                inputType: "text",
              },
              {
                step: 2,
                title: "3 cosas que escuchas",
                prompt: "Quédate en silencio 10 segundos. ¿Qué 3 sonidos distingues?",
                inputType: "text",
              },
              {
                step: 3,
                title: "2 cosas que hueles",
                prompt: "¿Qué 2 olores puedes identificar ahora? (Si no hay olores, recuerda 2 olores que te calmen.)",
                inputType: "text",
              },
              {
                step: 4,
                title: "1 cosa que saboreas",
                prompt: "¿Qué sabor tienes en la boca ahora? ¿O qué te gustaría saborear para calmarte?",
                inputType: "text",
              },
            ],
            debrief:
              "El anclaje sensorial rompe la espiral mental. Pregunta si notó el cambio entre el inicio y el final.",
            tags: ["grounding", "ansiedad", "presencia"],
          },
        ],
      },
      {
        slug: "conciencia-emocional",
        title: "Conciencia sin reacción",
        description:
          "Aprende a observar lo que sientes sin reaccionar automáticamente.",
        order: 2,
        iconEmoji: "👁️",
        exercises: [
          {
            slug: "diario-emocional",
            title: "Diario emocional estructurado",
            description:
              "Registra una emoción intensa reciente y analízala con distancia.",
            type: "writing",
            order: 1,
            estimatedMinutes: 10,
            instructions: [
              {
                step: 0,
                title: "La situación",
                prompt: "Describe brevemente una situación reciente que te generó una emoción intensa.",
                inputType: "text",
              },
              {
                step: 1,
                title: "La emoción",
                prompt: "¿Qué emoción sentiste? Nombra la más precisa posible (no 'mal', sino 'frustrado', 'humillado', 'impotente').",
                inputType: "text",
              },
              {
                step: 2,
                title: "La reacción",
                prompt: "¿Qué hiciste? ¿Cómo reaccionaste en ese momento?",
                inputType: "text",
              },
              {
                step: 3,
                title: "La alternativa",
                prompt: "Si pudieras volver a ese momento con calma, ¿qué harías diferente?",
                inputType: "text",
              },
            ],
            debrief:
              "Señala la brecha entre su reacción automática y su alternativa consciente. Esa brecha es exactamente lo que está entrenando.",
            tags: ["diario", "conciencia", "regulación"],
          },
        ],
      },
    ],
  },
  {
    slug: "proposito-direccion",
    title: "Encuentra tu dirección",
    description:
      "Explora tus valores, tus motivaciones reales y construye una dirección con sentido — sin necesitar una respuesta perfecta.",
    phase: "proposito",
    order: 3,
    iconEmoji: "🧭",
    durationWeeks: 4,
    modules: [
      {
        slug: "valores-personales",
        title: "Tus valores reales",
        description:
          "Descubre qué es realmente importante para ti — no lo que debería serlo.",
        order: 1,
        iconEmoji: "💎",
        exercises: [
          {
            slug: "valores-en-accion",
            title: "Valores en acción",
            description:
              "Identifica tus valores reales a partir de tus decisiones, no de tus deseos.",
            type: "reflection",
            order: 1,
            estimatedMinutes: 12,
            instructions: [
              {
                step: 0,
                title: "Una decisión difícil",
                prompt:
                  "Piensa en la última decisión difícil que tomaste (o evitaste). ¿Cuál fue?",
                inputType: "text",
              },
              {
                step: 1,
                title: "¿Qué protegías?",
                prompt:
                  "Con esa decisión, ¿qué estabas intentando proteger o conseguir? (Ej: seguridad, libertad, aprobación, crecimiento...)",
                inputType: "text",
              },
              {
                step: 2,
                title: "¿Y si hubieras elegido diferente?",
                prompt:
                  "Si hubieras tomado la decisión opuesta, ¿qué habrías sacrificado?",
                inputType: "text",
              },
              {
                step: 3,
                title: "Tu valor dominante",
                prompt:
                  "Lo que protegías y lo que no estabas dispuesto a sacrificar — eso es un valor. Nombra el valor que ves.",
                inputType: "text",
              },
            ],
            debrief:
              "Ayúdale a ver que sus valores se revelan en las decisiones difíciles, no en las declaraciones. Conecta el valor con su vida actual.",
            tags: ["valores", "decisiones", "propósito"],
          },
          {
            slug: "carta-yo-futuro",
            title: "Carta a tu yo de dentro de 3 años",
            description:
              "Escribe una carta desde el futuro para conectar con la dirección que quieres.",
            type: "writing",
            order: 2,
            estimatedMinutes: 15,
            instructions: [
              {
                step: 0,
                title: "Imagina",
                prompt:
                  "Es 2029. Las cosas han ido bien. No perfecto, pero bien. Cierra los ojos 30 segundos e imagina cómo es tu día a día.",
                inputType: "none",
              },
              {
                step: 1,
                title: "Tu carta",
                prompt:
                  "Escríbele una carta a tu yo de hoy desde ese futuro. Cuéntale qué cambió, qué decisión fue clave, qué consejo le darías.",
                inputType: "text",
              },
              {
                step: 2,
                title: "La frase clave",
                prompt:
                  "De toda la carta, ¿cuál es la frase que más te resuena? Escríbela como un recordatorio.",
                inputType: "text",
              },
            ],
            debrief:
              "La carta revela la dirección que ya tiene dentro. Señala la frase clave y pregunta cómo se conecta con lo que hace hoy.",
            tags: ["futuro", "visión", "propósito"],
          },
        ],
      },
    ],
  },
  {
    slug: "accion-seguimiento",
    title: "Actúa y sostén",
    description:
      "Convierte la claridad en ejecución real. Construye hábitos, sostén el avance y no dejes que el progreso se evapore.",
    phase: "accion",
    order: 4,
    iconEmoji: "🚀",
    durationWeeks: 4,
    modules: [
      {
        slug: "primer-paso",
        title: "El primer paso concreto",
        description:
          "Define y ejecuta una acción visible en las próximas 24 horas.",
        order: 1,
        iconEmoji: "👣",
        exercises: [
          {
            slug: "accion-minima-viable",
            title: "Tu acción mínima viable",
            description:
              "Define una acción tan pequeña que sea imposible no hacerla.",
            type: "action",
            order: 1,
            estimatedMinutes: 8,
            instructions: [
              {
                step: 0,
                title: "Tu objetivo actual",
                prompt:
                  "¿Cuál es el objetivo o tema más importante para ti ahora mismo? (Una frase.)",
                inputType: "text",
              },
              {
                step: 1,
                title: "La versión mínima",
                prompt:
                  "¿Cuál es la versión más pequeña y concreta de avanzar en eso que podrías hacer en menos de 15 minutos?",
                inputType: "text",
              },
              {
                step: 2,
                title: "¿Cuándo?",
                prompt: "¿A qué hora exacta de hoy lo vas a hacer?",
                inputType: "text",
              },
              {
                step: 3,
                title: "Compromiso",
                prompt:
                  "En una escala del 1 al 5, ¿cuánta confianza tienes en que lo harás?",
                inputType: "scale",
                scaleMin: 1,
                scaleMax: 5,
                scaleLabels: { min: "Muy baja", max: "Lo haré seguro" },
              },
            ],
            debrief:
              "Si la confianza es baja, sugiere reducir la acción aún más. Si es alta, refuerza el compromiso con una hora concreta.",
            tags: ["acción", "ejecución", "compromiso"],
          },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding journeys...");

  for (const journeyData of JOURNEYS) {
    const { modules, ...journeyFields } = journeyData;

    const journey = await prisma.journey.upsert({
      where: { slug: journeyFields.slug },
      update: {
        title: journeyFields.title,
        description: journeyFields.description,
        phase: journeyFields.phase,
        order: journeyFields.order,
        iconEmoji: journeyFields.iconEmoji,
        durationWeeks: journeyFields.durationWeeks,
      },
      create: journeyFields,
    });

    console.log(`  Journey: ${journey.title} (${journey.slug})`);

    let prevModuleId: string | null = null;

    for (const moduleData of modules) {
      const { exercises, ...moduleFields } = moduleData;

      const mod = await prisma.journeyModule.upsert({
        where: {
          journeyId_slug: { journeyId: journey.id, slug: moduleFields.slug },
        },
        update: {
          title: moduleFields.title,
          description: moduleFields.description,
          order: moduleFields.order,
          iconEmoji: moduleFields.iconEmoji,
          unlockAfterModuleId: prevModuleId,
        },
        create: {
          journeyId: journey.id,
          slug: moduleFields.slug,
          title: moduleFields.title,
          description: moduleFields.description,
          order: moduleFields.order,
          iconEmoji: moduleFields.iconEmoji,
          unlockAfterModuleId: prevModuleId,
        },
      });

      console.log(`    Module: ${mod.title}`);

      for (const exData of exercises) {
        const ex = await prisma.exercise.upsert({
          where: { moduleId_slug: { moduleId: mod.id, slug: exData.slug } },
          update: {
            title: exData.title,
            description: exData.description,
            type: exData.type,
            order: exData.order,
            estimatedMinutes: exData.estimatedMinutes,
            instructions: exData.instructions,
            debrief: exData.debrief ?? null,
            tags: exData.tags,
          },
          create: {
            moduleId: mod.id,
            slug: exData.slug,
            title: exData.title,
            description: exData.description,
            type: exData.type,
            order: exData.order,
            estimatedMinutes: exData.estimatedMinutes,
            instructions: exData.instructions,
            debrief: exData.debrief ?? null,
            tags: exData.tags,
          },
        });

        console.log(`      Exercise: ${ex.title} (${ex.type})`);
      }

      prevModuleId = mod.id;
    }
  }

  console.log("Done seeding journeys.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
