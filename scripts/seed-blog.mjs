/**
 * Seed script: creates 3 initial blog posts for SEO.
 * Run: node scripts/seed-blog.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const POSTS = [
  {
    slug: "que-es-tres-mil-millones-de-latidos",
    title: "Que es Tres Mil Millones de Latidos y por que puede ayudarte",
    excerpt:
      "Una plataforma de mentoria con IA que no te dice que hacer. Te hace las preguntas que necesitas para descubrirlo tu.",
    content: `El corazon humano late aproximadamente tres mil millones de veces en una vida. Cada uno de esos latidos es una oportunidad — de avanzar, de pararse, de elegir.

La mayoria de las personas saben que algo tiene que cambiar. Lo sienten. Pero entre el saber y el hacer hay un abismo: bloqueos que no se nombran, patrones que se repiten, decisiones que se posponen.

Tres Mil Millones de Latidos existe para cerrar ese abismo.

No es terapia. No es coaching tradicional. No es una app de habitos. Es un mentor con inteligencia artificial que te acompana en un proceso muy concreto:

1. Identificar que te bloquea — sin rodeos, sin juicio.
2. Ordenar tus pensamientos — transformar la niebla mental en claridad.
3. Actuar hoy — con microacciones de 10 minutos, no con planes abstractos.

La IA detecta tu estado emocional (bloqueo, ansiedad, duda, claridad) y adapta cada conversacion a lo que necesitas en ese momento. Si estas bloqueado, simplifica. Si estas ansioso, baja el ritmo. Si tienes claridad, aprovecha el momentum.

Lo que diferencia a Tres Mil Millones de Latidos de cualquier chatbot:

- No da consejos genericos. Hace preguntas que obligan a pensar.
- No te dice que hacer. Te ayuda a que lo descubras tu.
- Detecta tus patrones de evitacion y te los muestra.
- Cada conversacion termina con algo que puedes hacer HOY.

El objetivo no es que uses la plataforma para siempre. Es que dejes de necesitarla. El exito se mide en autonomia, no en tiempo de uso.

Ahora mismo estamos en fase MVP: todas las funciones Pro estan disponibles de forma gratuita. Sin tarjeta de credito. Sin compromiso. Solo tu y las preguntas que no te estas haciendo.`,
    tags: ["plataforma", "IA", "mentoria", "bienestar"],
    authorName: "Mario Pablo Sanchez Barron",
  },
  {
    slug: "bloqueo-emocional-que-es-y-como-salir",
    title: "Bloqueo emocional: que es, por que ocurre y como salir de el hoy",
    excerpt:
      "El bloqueo no es pereza. Es un mecanismo de proteccion. Entenderlo es el primer paso para superarlo.",
    content: `Si alguna vez has sentido que sabes que hacer pero no puedes hacerlo, no estas solo. No es pereza. No es falta de motivacion. Es bloqueo emocional.

El bloqueo es un mecanismo de proteccion. Tu cerebro detecta algo que percibe como amenaza — puede ser fracaso, rechazo, incertidumbre, dolor — y activa el freno. No porque seas debil, sino porque esta intentando protegerte.

El problema es que ese freno se activa tambien cuando no hay peligro real. Se activa cuando tienes que enviar un email importante, cuando tienes que tener una conversacion dificil, cuando tienes que tomar una decision que llevas semanas posponiendo.

Senales de que estas bloqueado:

- Piensas mucho pero no haces nada concreto.
- Sientes que "no es el momento" (nunca lo es).
- Te refugias en tareas secundarias para evitar la importante.
- Sientes una presion en el pecho cuando piensas en "eso".
- Repites el patron: mismo bloqueo, diferente contexto.

Lo que NO funciona para salir del bloqueo:

- Esperar a estar motivado (la motivacion viene DESPUES de actuar, no antes).
- Leer otro libro de autoayuda (mas informacion no es lo que necesitas).
- Planificar mas (la planificacion excesiva es una forma elegante de evitar).
- Decirte "mañana empiezo" (mañana diras lo mismo).

Lo que SI funciona:

1. Nombra el bloqueo. No "estoy mal". Sino: "Estoy evitando hablar con mi jefe porque tengo miedo de que me diga que no".

2. Preguntate: ¿que es lo peor que puede pasar? Casi siempre, lo peor es mucho menos grave de lo que tu mente te cuenta.

3. Haz una microaccion. No "resolver el problema". Solo el paso mas pequeño posible. Si tienes que enviar un email, abre el editor y escribe el asunto. Solo eso.

4. Hazlo ahora. No dentro de 5 minutos. Ahora. La ventana de claridad se cierra rapido.

En Tres Mil Millones de Latidos, el mentor detecta cuando estas en estado de bloqueo y adapta automaticamente su respuesta: simplifica, reduce la exigencia, y te propone una microaccion tan pequeña que no puedes decir que no.

No necesitas mas informacion. Necesitas un primer paso. Y ese paso siempre dura menos de 10 minutos.`,
    tags: ["bloqueo", "emociones", "accion", "psicologia"],
    authorName: "Equipo Tres Mil Millones de Latidos",
  },
  {
    slug: "microacciones-el-secreto-para-avanzar-cuando-estas-atascado",
    title: "Microacciones: el secreto para avanzar cuando estas atascado",
    excerpt:
      "No necesitas un plan perfecto. Necesitas un paso tan pequeño que no puedas decir que no.",
    content: `Hay una razon por la que la mayoria de propuestas de cambio personal fracasan: son demasiado grandes.

"Voy a hacer ejercicio todos los dias." "Voy a meditar 30 minutos cada manana." "Voy a organizar toda mi vida este fin de semana."

Suena bien. Pero tres dias despues, la motivacion desaparece, la vida se interpone, y vuelves al punto de partida con una capa extra de culpa.

La alternativa se llama microaccion.

Una microaccion es un paso tan pequeño que resulta casi ridiculo no hacerlo. No es un plan. No es una meta. Es algo que puedes hacer ahora, en menos de 10 minutos, sin necesitar nada especial.

Ejemplos de microacciones:

- En vez de "buscar trabajo": abre LinkedIn y actualiza tu titular. 2 minutos.
- En vez de "hablar con mi jefe": escribe en un papel los 3 puntos que quieres tratar. 5 minutos.
- En vez de "organizar mi vida": abre tu calendario y bloquea 1 hora para lo mas importante de manana. 1 minuto.
- En vez de "superar mi ansiedad": escribe que es exactamente lo que te preocupa ahora mismo. 3 minutos.

Por que funcionan las microacciones:

1. Eliminan la paralisis. No puedes decir "no tengo tiempo" para algo de 2 minutos.

2. Generan inercia. Un paso lleva al siguiente. Es mas facil seguir que empezar.

3. Cambian la identidad. Cada microaccion completada te dice "soy alguien que actua", en vez de "soy alguien que piensa en actuar".

4. Son acumulativas. 10 microacciones en una semana tienen mas impacto que 1 plan perfecto que nunca ejecutas.

La regla de oro: si tardas mas de 10 minutos, es demasiado grande. Dividelo.

En Tres Mil Millones de Latidos, cada conversacion con el mentor termina con una microaccion concreta. No "piensa en lo que quieres". Sino "escribe en una frase lo que te esta frenando ahora mismo y envia el mensaje".

La diferencia entre las personas que avanzan y las que no, rara vez es talento o informacion. Es la capacidad de dar el primer paso. Y el primer paso siempre es mas pequeno de lo que crees.`,
    tags: ["microacciones", "productividad", "habitos", "accion"],
    authorName: "Equipo Tres Mil Millones de Latidos",
  },
];

async function main() {
  for (const post of POSTS) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (existing) {
      console.log(`⏭️  Skip (exists): ${post.slug}`);
      continue;
    }
    await prisma.blogPost.create({
      data: {
        ...post,
        status: "published",
        publishedAt: new Date(),
      },
    });
    console.log(`✅ Created: ${post.slug}`);
  }
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
