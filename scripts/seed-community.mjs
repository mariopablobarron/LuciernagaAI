/**
 * Seed script: creates 15 initial anonymous community posts.
 * Run: node scripts/seed-community.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const POSTS = [
  { type: "victory", content: "Hoy por fin envie el email que llevaba 2 semanas posponiendo. Solo tardé 3 minutos. Todo el sufrimiento fue inventado.", feeling: "alivio" },
  { type: "reflection", content: "Me he dado cuenta de que cada vez que digo 'mañana lo hago' es porque tengo miedo de hacerlo mal. No es falta de tiempo. Es miedo.", feeling: "duda" },
  { type: "victory", content: "Llevo 7 dias seguidos haciendo check-in. No parece mucho, pero para alguien que nunca ha sido constante en nada, es enorme.", feeling: "esperanza" },
  { type: "reflection", content: "El mentor me preguntó '¿desde cuándo das esto por hecho?' y me quedé sin palabras. Llevaba años normalizando algo que me estaba frenando.", feeling: "confusion" },
  { type: "step", content: "Mi microacción de hoy: escribir 3 cosas que quiero decir en la reunión de mañana. Solo 3. No un guion perfecto.", step: "accion" },
  { type: "reflection", content: "He descubierto que siempre que estoy bloqueado, en realidad estoy evitando una conversación difícil. El bloqueo no es el problema, es el síntoma.", feeling: "claridad" },
  { type: "victory", content: "Primera semana con metas y acciones. Completé 4 de 5. Antes no completaba ninguna porque me ponía metas imposibles.", feeling: "gratitud" },
  { type: "step", content: "Hoy voy a hacer el ejercicio de respiración antes de la reunión. 4-7-8. Solo eso.", step: "calma" },
  { type: "reflection", content: "Lo más difícil no es actuar. Es admitir que llevas meses haciendo lo cómodo en vez de lo importante.", feeling: "tristeza" },
  { type: "victory", content: "Le dije a mi familia lo que necesitaba. Sin excusas, sin rodeos. Y no pasó nada malo. Todo lo contrario.", feeling: "alivio" },
  { type: "reflection", content: "¿Alguien más siente que el patrón de evitación es casi automático? Como si tu cerebro decidiera por ti antes de que puedas pensar.", feeling: "frustracion" },
  { type: "step", content: "Mi acción de hoy: 15 minutos investigando algo que llevo meses queriendo empezar. Solo investigar. Sin compromiso.", step: "curiosidad" },
  { type: "victory", content: "El modo impulso me hizo ver que mi 'no puedo' era realmente un 'no quiero enfrentar esto'. Día 12 de 21 y por primera vez siento que avanzo de verdad.", feeling: "determinacion" },
  { type: "reflection", content: "Progreso no es sentirte bien todos los días. Es que los días malos ya no te paran.", feeling: "calma" },
  { type: "victory", content: "Primer mes usando la plataforma. No soy otra persona, pero por fin sé qué me frena y tengo herramientas para moverme cuando me bloqueo.", feeling: "esperanza" },
];

async function main() {
  // Check if there are already posts
  const count = await prisma.communityPost.count();
  if (count >= 10) {
    console.log(`⏭️  Community already has ${count} posts. Skipping seed.`);
    return;
  }

  for (const post of POSTS) {
    await prisma.communityPost.create({
      data: {
        type: post.type,
        content: post.content,
        feeling: post.feeling ?? null,
        step: post.step ?? null,
        anonymous: true,
        heartbeats: Math.floor(Math.random() * 12) + 3,
      },
    });
  }
  console.log(`✅ Created ${POSTS.length} community posts.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
