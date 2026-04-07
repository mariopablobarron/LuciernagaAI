#!/usr/bin/env node
/**
 * Seed script: Create a realistic demo with organization, users, conversations,
 * goals, check-ins, crisis events, and emotional progression.
 *
 * Usage: node scripts/seed-org-demo.mjs
 * Requires DATABASE_URL in .env
 */

import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { config } from "dotenv";
config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function hoursAgo(n) {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── User profiles for realistic demo ─────────────────────────────────────────

const DEMO_USERS = [
  {
    email: "demo-lucia@test.com", name: "Lucía Martín",
    state: "claridad", systemState: "PROGRESANDO", phase: "accion",
    emotion: "determinacion", pattern: "compromiso_parcial", focus: "carrera", energy: "alto", risk: "low", trend: "mejorando",
    goals: [
      { title: "Lanzar mi portfolio profesional", status: "active", actions: [
        { desc: "Elegir 5 proyectos para mostrar", done: true },
        { desc: "Escribir la sección 'Sobre mí'", done: true },
        { desc: "Publicar el portfolio online", done: false },
      ]},
      { title: "Preparar entrevista en startup", status: "completed", actions: [
        { desc: "Investigar la empresa y su producto", done: true },
        { desc: "Practicar respuestas a preguntas técnicas", done: true },
        { desc: "Preparar preguntas para el entrevistador", done: true },
      ]},
    ],
    messages: [
      { role: "user", content: "He estado trabajando en mi portfolio y ya tengo 3 proyectos listos." },
      { role: "assistant", content: "Eso es avance real. ¿Cuáles son los 2 que te faltan y qué necesitas para cerrarlos esta semana?" },
      { role: "user", content: "Creo que uno de diseño UI y otro de backend. Los tengo medio hechos." },
      { role: "assistant", content: "Medio hecho no cuenta como hecho. Define: ¿qué falta exactamente en cada uno? Una tarea concreta por proyecto." },
    ],
    checkins: ["Con mucha energía, ayer publiqué el primer proyecto", "Algo cansada pero satisfecha, la entrevista salió bien", "Hoy tengo claridad sobre lo que quiero hacer"],
    moods: ["motivated", "tired", "focused"],
    streakDays: 12,
  },
  {
    email: "demo-carlos@test.com", name: "Carlos Vega",
    state: "bloqueo", systemState: "BLOQUEADO", phase: "bloqueo",
    emotion: "frustracion", pattern: "evita_decidir", focus: "propósito", energy: "bajo", risk: "medium", trend: "igual",
    goals: [
      { title: "Decidir si cambio de carrera", status: "active", actions: [
        { desc: "Listar 3 opciones reales de cambio", done: false },
        { desc: "Hablar con alguien que haya hecho el cambio", done: false },
        { desc: "Calcular cuánto tiempo/dinero necesito de colchón", done: false },
      ]},
    ],
    messages: [
      { role: "user", content: "Llevo meses diciendo que voy a cambiar de trabajo y no hago nada." },
      { role: "assistant", content: "No hacer nada también es una decisión. ¿Qué es lo que realmente te frena: miedo al fracaso, no saber qué quieres, o el dinero?" },
      { role: "user", content: "Creo que todo a la vez. Es como una niebla." },
      { role: "assistant", content: "Vamos a separar la niebla en partes concretas. Elige UNA de esas tres: ¿cuál atacamos primero?" },
    ],
    checkins: ["Otro día sin avanzar", "Me frustro porque sé lo que debería hacer", "Hoy intenté buscar información pero me bloqueé"],
    moods: ["stuck", "frustrated", "anxious"],
    streakDays: 2,
  },
  {
    email: "demo-andrea@test.com", name: "Andrea Ruiz",
    state: "ansiedad", systemState: "ALERTA", phase: "duda",
    emotion: "ansiedad", pattern: "sobreanalisis", focus: "relaciones", energy: "alto", risk: "medium", trend: "empeorando",
    goals: [
      { title: "Establecer límites con mi familia", status: "active", actions: [
        { desc: "Identificar las 3 situaciones donde cedo más", done: true },
        { desc: "Practicar decir 'no' en una situación de bajo riesgo", done: true },
        { desc: "Tener la conversación pendiente con mi madre", done: false },
      ]},
    ],
    messages: [
      { role: "user", content: "Cada vez que mi madre me llama siento que tengo que hacer lo que ella diga." },
      { role: "assistant", content: "Eso es un patrón de complacencia aprendido, no una obligación real. ¿Qué pasaría concretamente si dijeras 'no puedo esta vez'?" },
      { role: "user", content: "Se enfadaría. Y yo me sentiría culpable." },
      { role: "assistant", content: "La culpa es la alarma de un límite nuevo. No significa que estés haciendo algo mal. ¿Cuál es la próxima llamada donde podrías probar?" },
    ],
    checkins: ["Ansiosa, mañana tengo comida familiar", "Lo pasé mal pero dije que no a una cosa", "Me siento un poco más fuerte después de practicar"],
    moods: ["anxious", "overwhelmed", "hopeful"],
    streakDays: 7,
    crisis: { level: "high", message: "La usuario reporta no poder dormir por ansiedad ante conflicto familiar inminente" },
  },
  {
    email: "demo-marcos@test.com", name: "Marcos Delgado",
    state: "duda", systemState: "EXPLORANDO", phase: "exploración",
    emotion: "confusion", pattern: "busca_validacion", focus: "propósito", energy: "medio", risk: "low", trend: "mejorando",
    goals: [
      { title: "Definir mi proyecto personal para los próximos 6 meses", status: "active", actions: [
        { desc: "Escribir qué quiero que sea diferente en 6 meses", done: true },
        { desc: "Elegir UNA área de enfoque (no tres)", done: false },
        { desc: "Crear un plan de 4 semanas para el primer mes", done: false },
      ]},
    ],
    messages: [
      { role: "user", content: "Tengo muchas ideas pero no sé cuál elegir. ¿Cuál crees que es mejor?" },
      { role: "assistant", content: "No voy a elegir por ti. Pero puedo ayudarte a filtrar. De todas tus ideas, ¿cuál te genera más miedo si NO la haces?" },
      { role: "user", content: "La de escribir un libro. Pero no sé si es realista." },
      { role: "assistant", content: "'Realista' es una excusa disfrazada de prudencia. ¿Puedes escribir 200 palabras hoy? Sí o no." },
    ],
    checkins: ["Explorando opciones, me siento algo perdido", "Ayer escribí mis primeras 200 palabras", "Empiezo a ver que sí puedo hacerlo"],
    moods: ["confused", "curious", "motivated"],
    streakDays: 5,
  },
  {
    email: "demo-elena@test.com", name: "Elena Torres",
    state: "claridad", systemState: "PROGRESANDO", phase: "consolidación",
    emotion: "calma", pattern: "compromiso_real", focus: "salud", energy: "alto", risk: "low", trend: "mejorando",
    goals: [
      { title: "Completar 21 días de ejercicio consecutivo", status: "active", actions: [
        { desc: "Elegir rutina de 20 minutos que puedo hacer sin gimnasio", done: true },
        { desc: "Hacer los primeros 7 días sin fallar", done: true },
        { desc: "Llegar a 21 días", done: false },
      ]},
      { title: "Leer 2 libros este mes", status: "active", actions: [
        { desc: "Elegir los 2 libros y tenerlos listos", done: true },
        { desc: "Leer 30 páginas al día durante 15 días", done: false },
      ]},
    ],
    messages: [
      { role: "user", content: "¡Llevo 14 días seguidos haciendo ejercicio!" },
      { role: "assistant", content: "14 días es donde la mayoría abandona. No es motivación lo que te trajo aquí, es disciplina. ¿Qué harás cuando no tengas ganas mañana?" },
      { role: "user", content: "Ponerme la ropa de deporte y empezar aunque sea 5 minutos." },
      { role: "assistant", content: "Esa es la respuesta correcta. El truco no es 'tener ganas', es 'empezar antes de que la cabeza opine'. Sigue." },
    ],
    checkins: ["Día 14 de ejercicio, me siento genial", "Hoy costó pero lo hice igual", "Empecé el primer libro, 40 páginas"],
    moods: ["energetic", "disciplined", "focused"],
    streakDays: 18,
  },
  {
    email: "demo-pablo@test.com", name: "Pablo Navarro",
    state: "bloqueo", systemState: "ESTANCADO", phase: "bloqueo",
    emotion: "apatia", pattern: "postergacion_cronica", focus: "carrera", energy: "bajo", risk: "high", trend: "empeorando",
    goals: [
      { title: "Terminar el TFG", status: "active", actions: [
        { desc: "Escribir la introducción (500 palabras)", done: false },
        { desc: "Completar la revisión bibliográfica", done: false },
        { desc: "Enviar primer borrador al tutor", done: false },
      ]},
    ],
    messages: [
      { role: "user", content: "Llevo 4 meses sin tocar el TFG. La fecha límite es en 6 semanas." },
      { role: "assistant", content: "4 meses de evitación + 6 semanas de deadline = necesitas un plan de guerra, no motivación. ¿Cuántas horas reales puedes dedicar por semana?" },
      { role: "user", content: "Creo que 3 o 4 horas como mucho. Trabajo y no tengo energía." },
      { role: "assistant", content: "Con 4h/semana y 6 semanas tienes 24 horas totales. Es justo pero posible. Hoy, solo hoy: abre el documento y escribe 100 palabras. No 500. Cien." },
    ],
    checkins: ["No he hecho nada", "Abrí el documento pero lo cerré en 5 minutos"],
    moods: ["stuck", "guilty"],
    streakDays: 0,
    avoidance: [
      { type: "postpone", desc: "Escribir la introducción del TFG" },
      { type: "refuse", desc: "Enviar borrador al tutor" },
    ],
  },
  {
    email: "demo-sofia@test.com", name: "Sofía Herrera",
    state: "neutral", systemState: "ESTABLE", phase: "exploración",
    emotion: "calma", pattern: "evita_decidir", focus: "propósito", energy: "medio", risk: "low", trend: "igual",
    goals: [],
    messages: [
      { role: "user", content: "No sé muy bien qué hago aquí. Una amiga me lo recomendó." },
      { role: "assistant", content: "Que no sepas por qué estás aquí ya es información. ¿Hay algo que sientes que debería ser diferente en tu vida pero no sabrías nombrar?" },
      { role: "user", content: "Sí, como que todo está 'bien' pero no estoy contenta." },
      { role: "assistant", content: "Eso tiene nombre: inercia disfrazada de estabilidad. Vamos a empezar por un diagnóstico rápido para ver dónde estás realmente." },
    ],
    checkins: ["Todo normal, nada especial"],
    moods: ["neutral"],
    streakDays: 1,
  },
  {
    email: "demo-diego@test.com", name: "Diego Fernández",
    state: "claridad", systemState: "PROGRESANDO", phase: "accion",
    emotion: "determinacion", pattern: "compromiso_real", focus: "carrera", energy: "alto", risk: "low", trend: "mejorando",
    goals: [
      { title: "Conseguir 3 clientes freelance", status: "active", actions: [
        { desc: "Crear perfil profesional en LinkedIn", done: true },
        { desc: "Contactar 10 empresas con propuesta", done: true },
        { desc: "Cerrar al menos 1 proyecto esta semana", done: true },
      ]},
      { title: "Automatizar facturación", status: "active", actions: [
        { desc: "Investigar herramientas de facturación automática", done: true },
        { desc: "Configurar la herramienta elegida", done: false },
      ]},
    ],
    messages: [
      { role: "user", content: "¡Acabo de cerrar mi primer cliente freelance! 1200€ por un proyecto de 2 semanas." },
      { role: "assistant", content: "Primer cliente cerrado. Eso ya no es un 'quiero ser freelance', es un hecho. ¿Qué aprendiste del proceso de venta que puedes replicar?" },
      { role: "user", content: "Que ser directo y mostrar resultados anteriores funciona mejor que hablar de tecnologías." },
      { role: "assistant", content: "Exacto: vendes resultados, no herramientas. Documenta eso ahora mismo en una frase. Será tu plantilla para los 9 contactos restantes." },
    ],
    checkins: ["Gran día, cerré mi primer cliente", "Hoy contacté 3 empresas más", "Preparando propuesta para segundo cliente"],
    moods: ["excited", "focused", "motivated"],
    streakDays: 15,
  },
];

async function seed() {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");

  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // ─── 1. Organization + Admins ─────────────────────────────────────
    const org = await prisma.organization.upsert({
      where: { slug: "demo-corp" },
      update: {},
      create: {
        name: "Demo Corp — Centro de Desarrollo Personal",
        slug: "demo-corp",
        type: "clinic",
        plan: "team",
        maxUsers: 50,
        contactName: "Admin Demo",
        contactEmail: "admin@demo-corp.com",
      },
    });
    console.log(`\nOrg: ${org.name} (${org.id})`);

    const hrHash = await hashPassword("demo1234");
    const therapistHash = await hashPassword("demo1234");

    await prisma.orgAdmin.upsert({
      where: { organizationId_email: { organizationId: org.id, email: "hr@demo-corp.com" } },
      update: { passwordHash: hrHash },
      create: { organizationId: org.id, email: "hr@demo-corp.com", name: "María García (HR)", role: "hr", passwordHash: hrHash },
    });

    await prisma.orgAdmin.upsert({
      where: { organizationId_email: { organizationId: org.id, email: "psico@demo-corp.com" } },
      update: { passwordHash: therapistHash },
      create: { organizationId: org.id, email: "psico@demo-corp.com", name: "Dr. López (Terapeuta)", role: "therapist", passwordHash: therapistHash },
    });

    console.log("  Admins: hr@demo-corp.com / psico@demo-corp.com (password: demo1234)");

    // ─── 2. Users with rich data ──────────────────────────────────────
    for (const profile of DEMO_USERS) {
      const createdAt = daysAgo(randomBetween(14, 45));
      const user = await prisma.user.upsert({
        where: { email: profile.email },
        update: { organizationId: org.id, lastSeen: hoursAgo(randomBetween(1, 48)) },
        create: {
          email: profile.email,
          name: profile.name,
          organizationId: org.id,
          consentGiven: true,
          consentAt: createdAt,
          isActive: true,
          messageCount: profile.messages.length,
          lastMessageAt: hoursAgo(randomBetween(2, 72)),
          createdAt,
        },
      });
      console.log(`  User: ${user.name} (${profile.state})`);

      // UserState
      await prisma.userState.upsert({
        where: { userId: user.id },
        update: {
          state: profile.state,
          systemState: profile.systemState,
          transformationPhase: profile.phase,
          primaryEmotion: profile.emotion,
          dominantPattern: profile.pattern,
          focusArea: profile.focus,
          energyLevel: profile.energy,
          riskLevel: profile.risk,
          progressTrend: profile.trend,
          crisisActive: !!profile.crisis,
        },
        create: {
          userId: user.id,
          state: profile.state,
          systemState: profile.systemState,
          transformationPhase: profile.phase,
          primaryEmotion: profile.emotion,
          dominantPattern: profile.pattern,
          focusArea: profile.focus,
          energyLevel: profile.energy,
          riskLevel: profile.risk,
          progressTrend: profile.trend,
          crisisActive: !!profile.crisis,
        },
      });

      // Streak
      await prisma.streak.upsert({
        where: { userId: user.id },
        update: { currentDays: profile.streakDays, bestDays: Math.max(profile.streakDays, randomBetween(profile.streakDays, profile.streakDays + 5)) },
        create: {
          userId: user.id,
          currentDays: profile.streakDays,
          bestDays: Math.max(profile.streakDays, randomBetween(profile.streakDays, profile.streakDays + 5)),
          lastCheckInDate: profile.streakDays > 0 ? daysAgo(0) : null,
          status: profile.streakDays > 0 ? "active" : "inactive",
        },
      });

      // Conversation + Messages
      const conv = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: profile.goals[0]?.title ?? "Primera conversación",
          createdAt: daysAgo(randomBetween(3, 14)),
        },
      });

      for (let i = 0; i < profile.messages.length; i++) {
        const msg = profile.messages[i];
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            userId: msg.role === "user" ? user.id : null,
            role: msg.role,
            content: msg.content,
            createdAt: new Date(conv.createdAt.getTime() + i * 60 * 1000),
          },
        });
      }

      // Goals + Actions
      for (const goalDef of profile.goals) {
        const goal = await prisma.goal.create({
          data: {
            userId: user.id,
            title: goalDef.title,
            status: goalDef.status,
            createdAt: daysAgo(randomBetween(5, 20)),
          },
        });
        for (const actionDef of goalDef.actions) {
          await prisma.action.create({
            data: {
              goalId: goal.id,
              description: actionDef.desc,
              completed: actionDef.done,
            },
          });
        }
      }

      // Daily Check-ins + DailyLogs
      for (let i = 0; i < profile.checkins.length; i++) {
        const checkinDate = daysAgo(profile.checkins.length - 1 - i);
        await prisma.dailyCheckin.create({
          data: {
            userId: user.id,
            response: profile.checkins[i],
            mood: profile.moods[i] ?? null,
            createdAt: checkinDate,
          },
        });
        await prisma.dailyLog.create({
          data: {
            userId: user.id,
            emotionalState: profile.state,
            note: profile.checkins[i],
            mood: profile.moods[i] ?? null,
            checkIns: 1,
            messagesCount: randomBetween(2, 8),
            logDate: checkinDate,
            createdAt: checkinDate,
          },
        });
      }

      // Events (sign-up, check-in, message)
      await prisma.event.create({
        data: { userId: user.id, type: "signup", metadata: { source: "demo-seed" }, createdAt: user.createdAt },
      });
      for (let i = 0; i < profile.checkins.length; i++) {
        await prisma.event.create({
          data: { userId: user.id, type: "checkin", createdAt: daysAgo(profile.checkins.length - 1 - i) },
        });
      }

      // Crisis event
      if (profile.crisis) {
        await prisma.crisisEvent.create({
          data: {
            userId: user.id,
            level: profile.crisis.level,
            message: profile.crisis.message,
            response: "Se activó contención automática. Se ofreció línea de crisis (024) y se recomendó contactar red de apoyo.",
            createdAt: hoursAgo(randomBetween(4, 36)),
          },
        });
      }

      // Avoidance events
      if (profile.avoidance) {
        for (const av of profile.avoidance) {
          const goals = await prisma.goal.findMany({ where: { userId: user.id }, select: { actions: { select: { id: true }, take: 1 } }, take: 1 });
          const actionId = goals[0]?.actions[0]?.id;
          if (actionId) {
            await prisma.avoidanceEvent.create({
              data: {
                userId: user.id,
                actionId,
                type: av.type,
                createdAt: daysAgo(randomBetween(1, 5)),
              },
            });
          }
        }
      }
    }

    // ─── 3. Decision logs + Insights (for admin dashboard) ────────────
    const decisionMetrics = [
      { metric: "retention_d3", value: 0.62, decision: "Retención D3 por encima del umbral. Mantener flujo de onboarding actual." },
      { metric: "retention_d7", value: 0.41, decision: "Retención D7 en zona de alerta. Activar secuencia de re-engagement por email a día 5." },
      { metric: "checkin_drop", value: 0.35, decision: "Check-in drop moderado. Considerar notificación push a las 9:00 del día siguiente." },
      { metric: "crisis_rate", value: 0.08, decision: "Tasa de crisis estable. Protocolo de contención funcionando." },
      { metric: "avoidance_rate", value: 0.22, decision: "Evasión subiendo. Revisar si las acciones propuestas son demasiado ambiciosas." },
    ];

    for (let i = 0; i < decisionMetrics.length; i++) {
      const d = decisionMetrics[i];
      await prisma.decisionLog.create({
        data: { metric: d.metric, value: d.value, decision: d.decision, createdAt: daysAgo(decisionMetrics.length - i) },
      });
    }

    const insightEntries = [
      { type: "retention", title: "Caída de actividad en día 5-7", content: "Los usuarios que no reciben check-in reminder entre día 5 y 7 tienen 3x más probabilidad de abandonar.", action: "Implementar email automático de re-engagement en día 5.", priority: "high", confidence: "high" },
      { type: "engagement", title: "Los usuarios con objetivos completan 2x más check-ins", content: "Usuarios con al menos 1 objetivo activo hacen check-in un 68% más que los que no tienen objetivos.", action: "Sugerir creación de objetivo en la segunda conversación.", priority: "medium", confidence: "high" },
      { type: "crisis", title: "Patrón de crisis en domingos por la noche", content: "El 60% de eventos de crisis ocurren entre domingo 20:00 y lunes 02:00.", action: "Aumentar sensibilidad del detector de crisis en esas franjas.", priority: "high", confidence: "medium" },
      { type: "avoidance", title: "Acciones con deadline mejoran ejecución 40%", content: "Cuando la acción incluye una fecha concreta, la tasa de ejecución sube del 28% al 39%.", action: "Incluir siempre fecha en la acción sugerida.", priority: "medium", confidence: "medium" },
    ];

    for (let i = 0; i < insightEntries.length; i++) {
      const ins = insightEntries[i];
      await prisma.insight.create({
        data: { ...ins, createdAt: daysAgo(insightEntries.length - i) },
      });
    }

    console.log(`\n  Decision logs: ${decisionMetrics.length}`);
    console.log(`  Insights: ${insightEntries.length}`);

    // ─── Summary ──────────────────────────────────────────────────────
    console.log("\n━━━ Demo Setup Complete ━━━");
    console.log(`\n  Org:       demo-corp (${org.id})`);
    console.log(`  Users:     ${DEMO_USERS.length} con conversaciones, objetivos y check-ins`);
    console.log(`  States:    bloqueo(2), claridad(3), ansiedad(1), duda(1), neutral(1)`);
    console.log(`  Crisis:    1 evento (Andrea — conflicto familiar)`);
    console.log(`  Avoidance: 2 eventos (Pablo — TFG)`);
    console.log(`\n  Login /org/login:`);
    console.log(`    Slug:      demo-corp`);
    console.log(`    HR:        hr@demo-corp.com / demo1234`);
    console.log(`    Terapeuta: psico@demo-corp.com / demo1234`);
    console.log(`\n  Login /admin/login:`);
    console.log(`    Revisar dashboard con datos reales de estos 8 usuarios`);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
