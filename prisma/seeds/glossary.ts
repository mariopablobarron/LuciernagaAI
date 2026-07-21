/**
 * Seed inicial del glosario de temas trabajables.
 * Run via: npx dotenv -e .env -- tsx prisma/seeds/glossary.ts
 * Or:      DATABASE_URL=... npx tsx prisma/seeds/glossary.ts
 *
 * Idempotente (upsert por slug): re-ejecutar re-sincroniza el contenido sin
 * duplicar. A partir de aquí, el equipo humano edita desde /admin/glosario.
 *
 * Barandilla (AI Act / honestidad relacional): PSICOEDUCACIÓN, no diagnóstico.
 * El material es curado y revisable por humanos. Contenido a validar por la
 * psicóloga del equipo.
 */

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TOPICS = [
  {
    slug: "impostor",
    label: "Síndrome del impostor",
    enabled: true,
    triggers: [
      "sindrome del impostor",
      "me siento un impostor",
      "me siento una impostora",
      "soy un fraude",
      "soy una fraude",
      "me siento un fraude",
      "me van a descubrir",
      "me van a pillar",
      "se van a dar cuenta de que no valgo",
      "no me lo merezco",
      "no merezco este puesto",
      "no me lo he ganado",
      "todo ha sido suerte",
      "solo tuve suerte",
      "no fue merito mio",
      "no se como he llegado aqui",
      "cualquiera podria hacer mi trabajo",
      "creen que soy mejor de lo que soy",
      "es cuestion de tiempo que se den cuenta",
    ],
    mentorGuidance: [
      "Cómo acompañar:",
      "- NO etiquetes a la persona. No digas «tienes síndrome del impostor». Si nombras el concepto, hazlo como hipótesis y con puerta de salida: «lo que cuentas suena a algo que a muchísima gente capaz le pasa —lo llaman síndrome del impostor—, ¿te resuena o lo ves de otra forma?».",
      "- Normaliza sin minimizar: es frecuente justo en personas competentes; sentirlo no significa que sea cierto.",
      "- Separa el HECHO (logros, dónde está) de la INTERPRETACIÓN («fue suerte», «me descubrirán»). Devuélvele esa distinción.",
      "- Preguntas potentes, no consejos: «¿Qué tendría que pasar para que te creyeras que te lo has ganado?», «Si un amigo te contara esto mismo de sí mismo, ¿qué le dirías?», «¿Qué evidencia estás descartando para sostener que no vales?».",
      "- Si encaja y la persona quiere, PUEDES ofrecerle el ejercicio. Ofrécelo, no lo impongas; una sola invitación.",
      "- No conviertas esto en diagnóstico ni en promesa terapéutica. Si detectas sufrimiento intenso o bloqueo serio, recuerda con naturalidad que hablar con un profesional puede ayudar.",
    ].join("\n"),
    exerciseTitle: "El registro de evidencia",
    exerciseGoal:
      "Contrastar la narrativa de «no valgo / fue suerte» con hechos concretos, para reatribuir logros a la propia capacidad.",
    exerciseSteps: [
      "Pídele que recuerde 3 logros o momentos recientes de los que esté, aunque sea un poco, satisfecho.",
      "Para cada uno, que escriba la explicación que se da a sí mismo (¿suerte? ¿ayuda de otros? ¿casualidad? ¿capacidad?).",
      "Para cada logro, que busque UNA prueba concreta de que su capacidad influyó (una decisión que tomó, algo que hizo distinto, una dificultad que resolvió).",
      "Devuélvele el contraste: ¿qué patrón hay en cómo se atribuye lo bueno frente a lo malo?",
      "Cierre: que se quede con una sola frase realista y creíble para sí mismo — ni «soy el mejor» ni «fue suerte», algo intermedio y verdadero.",
    ],
  },
];

async function seed() {
  for (const t of TOPICS) {
    await prisma.glossaryTopic.upsert({
      where: { slug: t.slug },
      update: {
        label: t.label,
        enabled: t.enabled,
        triggers: t.triggers,
        mentorGuidance: t.mentorGuidance,
        exerciseTitle: t.exerciseTitle,
        exerciseGoal: t.exerciseGoal,
        exerciseSteps: t.exerciseSteps,
      },
      create: t,
    });
    console.log(`  ✓ ${t.slug} (${t.triggers.length} disparadores)`);
  }
  console.log(`Glosario seed OK — ${TOPICS.length} tema(s).`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
