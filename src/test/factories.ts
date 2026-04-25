// Factories de dominio para tests E2E e integración.
//
// Cada función devuelve DATOS PLANOS aptos para `prisma.X.create({ data })`.
// No tocan la BD por sí mismas: la responsabilidad de persistir queda en el
// test, que decide el orden y maneja la limpieza.
//
// Uso típico:
//   const userData = anonymousUser();
//   const user = await prisma.user.create({ data: userData });
//
//   const { user: u, goal, actions } = userWithActiveGoal();
//   const created = await prisma.user.create({ data: u });
//   const g = await prisma.goal.create({ data: { ...goal, userId: created.id } });
//   for (const a of actions) await prisma.action.create({ data: { ...a, goalId: g.id } });
//
// Para tests reproducibles, llamar a `seedFactories(seed)` antes:
//   import { seedFactories, anonymousUser } from "@/test/factories";
//   beforeAll(() => seedFactories(42));

// Importamos desde el bundle CJS para compatibilidad con Jest sin tener que
// añadir transformIgnorePatterns globales. El locale español lo aplicamos
// manualmente abajo.
import { Faker, es, en, base } from "@faker-js/faker";

// es es prioritario; en cubre lorem y otros datasets que es no incluye.
export const faker = new Faker({ locale: [es, en, base] });
import type {
  CapsuleKind,
  CapsuleStatus,
  GoalStatus,
} from "@prisma/client";

export function seedFactories(seed: number): void {
  faker.seed(seed);
}

const SYNTHETIC_DOMAIN = "session.latidos.local";

// ── User ────────────────────────────────────────────────────────────────────

type UserOverrides = {
  email?: string;
  name?: string | null;
  isActive?: boolean;
  emailVerified?: boolean;
  telegramId?: string | null;
  googleId?: string | null;
  passwordHash?: string | null;
  deletedAt?: Date | null;
  lastSeen?: Date;
  messageCount?: number;
  source?: string | null;
  createdAt?: Date;
};

/**
 * Anónimo: email sintético @session.latidos.local, sin canales reachables,
 * sin password (entrada por sesión). Lo que /app/inicio crea por defecto.
 */
export function anonymousUser(overrides: UserOverrides = {}) {
  const id = faker.string.alphanumeric(12);
  return {
    email: `anon-${id}@${SYNTHETIC_DOMAIN}`,
    name: null,
    isActive: true,
    emailVerified: false,
    telegramId: null,
    googleId: null,
    passwordHash: null,
    deletedAt: null,
    lastSeen: faker.date.recent({ days: 7 }),
    messageCount: 0,
    source: "app",
    createdAt: faker.date.recent({ days: 14 }),
    ...overrides,
  };
}

/**
 * Registrado con email real y verificado. Usuario "happy path".
 */
export function registeredUser(overrides: UserOverrides = {}) {
  return {
    email: faker.internet.email().toLowerCase(),
    name: faker.person.firstName(),
    isActive: true,
    emailVerified: true,
    telegramId: null,
    googleId: null,
    passwordHash: faker.string.alphanumeric(60), // hash mock
    deletedAt: null,
    lastSeen: faker.date.recent({ days: 3 }),
    messageCount: faker.number.int({ min: 5, max: 100 }),
    source: "signup",
    createdAt: faker.date.past({ years: 1 }),
    ...overrides,
  };
}

/**
 * Anónimo dormido: el caso del cron purge-anonymous-dormant.
 * lastSeen >30d, sin mensajes, sin canal reachable.
 */
export function dormantAnonymous(overrides: UserOverrides = {}) {
  return anonymousUser({
    lastSeen: faker.date.past({ years: 1, refDate: new Date(Date.now() - 31 * 86400000) }),
    messageCount: 0,
    ...overrides,
  });
}

// ── Conversation + Message ──────────────────────────────────────────────────

type ConversationOverrides = {
  title?: string;
  journalMode?: boolean;
  createdAt?: Date;
};

export function conversation(overrides: ConversationOverrides = {}) {
  return {
    title: overrides.title ?? "Nueva conversación",
    journalMode: overrides.journalMode ?? false,
    createdAt: overrides.createdAt ?? faker.date.recent({ days: 7 }),
  };
}

type MessageOverrides = {
  role?: "user" | "assistant";
  content?: string;
  createdAt?: Date;
};

export function message(overrides: MessageOverrides = {}) {
  const role = overrides.role ?? (faker.datatype.boolean() ? "user" : "assistant");
  return {
    role,
    content: overrides.content ?? faker.lorem.sentence({ min: 4, max: 18 }),
    createdAt: overrides.createdAt ?? faker.date.recent({ days: 3 }),
  };
}

/**
 * Devuelve datos para crear un usuario + 1 conversación + n mensajes.
 * El test debe persistirlos en orden: user → conversation → messages.
 */
export function userWithMessages(
  count: number,
  options: { user?: UserOverrides; alternateRoles?: boolean } = {},
) {
  const user = registeredUser({ messageCount: count, ...options.user });
  const conv = conversation();
  const messages = Array.from({ length: count }, (_, i) => {
    const role: "user" | "assistant" = options.alternateRoles
      ? i % 2 === 0
        ? "user"
        : "assistant"
      : "user";
    return message({ role });
  });
  return { user, conversation: conv, messages };
}

// ── UserState ───────────────────────────────────────────────────────────────

type StateValue = "neutral" | "duda" | "ansiedad" | "bloqueo" | "claridad";

export function userState(state: StateValue = "neutral") {
  return {
    state,
    transformationPhase: null as string | null,
  };
}

// ── Goal + Action ───────────────────────────────────────────────────────────

type GoalOverrides = {
  title?: string;
  status?: GoalStatus;
};

export function goal(overrides: GoalOverrides = {}) {
  return {
    title: overrides.title ?? faker.lorem.sentence({ min: 3, max: 8 }),
    status: overrides.status ?? ("active" as GoalStatus),
  };
}

type ActionOverrides = {
  description?: string;
  completed?: boolean;
};

export function action(overrides: ActionOverrides = {}) {
  return {
    description: overrides.description ?? faker.lorem.sentence({ min: 4, max: 10 }),
    completed: overrides.completed ?? false,
  };
}

/**
 * Usuario + Goal active + 3 Actions (1 completada, 2 pendientes).
 * Estado realista del mentor con un objetivo en marcha.
 */
export function userWithActiveGoal(options: { user?: UserOverrides } = {}) {
  return {
    user: registeredUser(options.user),
    goal: goal({ status: "active" }),
    actions: [
      action({ completed: true }),
      action({ completed: false }),
      action({ completed: false }),
    ],
  };
}

// ── Capsule ─────────────────────────────────────────────────────────────────

const SNAPSHOT_WINDOW_DAYS = 30;

/**
 * Cápsula tipo snapshot, recién creada (pending), deliverAt en +30 días.
 */
export function pendingCapsule(options: {
  kind?: CapsuleKind;
  windowDays?: number;
  now?: Date;
} = {}) {
  const kind: CapsuleKind = options.kind ?? "snapshot";
  const now = options.now ?? new Date();
  const windowDays = options.windowDays ?? SNAPSHOT_WINDOW_DAYS;
  const payload = kind === "letter"
    ? {
        kind: "letter",
        createdAt: now.toISOString(),
        text: faker.lorem.paragraph({ min: 3, max: 6 }),
      }
    : {
        kind: "snapshot",
        windowDays,
        createdAt: now.toISOString(),
        stats: {
          messagesSent: faker.number.int({ min: 5, max: 80 }),
          heartbeats: faker.number.int({ min: 0, max: 30 }),
          dominantState: faker.helpers.arrayElement(["duda", "ansiedad", "bloqueo", "claridad", null]),
          activeGoalTitle: faker.helpers.maybe(() => faker.lorem.sentence({ min: 3, max: 8 }), { probability: 0.6 }) ?? null,
          activeGoalProgress: faker.helpers.maybe(() => faker.number.int({ min: 0, max: 100 }), { probability: 0.6 }) ?? null,
        },
        snippets: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => ({
          at: faker.date.recent({ days: 7 }).toISOString(),
          preview: faker.lorem.sentence({ min: 4, max: 12 }).slice(0, 140),
        })),
      };

  return {
    kind,
    status: "pending" as CapsuleStatus,
    deliverAt: new Date(now.getTime() + windowDays * 86400000),
    payload,
  };
}

/**
 * Cápsula ya lista para abrir (deliverAt en el pasado, status=ready).
 */
export function readyCapsule(options: { kind?: CapsuleKind; now?: Date } = {}) {
  const base = pendingCapsule(options);
  const now = options.now ?? new Date();
  return {
    ...base,
    status: "ready" as CapsuleStatus,
    deliverAt: new Date(now.getTime() - 86400000), // ayer
    deliveredAt: now,
  };
}
