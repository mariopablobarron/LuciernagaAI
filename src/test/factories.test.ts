// Smoke tests del módulo de factories. No tocan BD; sólo validan la forma
// y consistencia de los datos generados, y el determinismo con seed.

import {
  action,
  anonymousUser,
  conversation,
  dormantAnonymous,
  goal,
  message,
  pendingCapsule,
  readyCapsule,
  registeredUser,
  seedFactories,
  userState,
  userWithActiveGoal,
  userWithMessages,
} from "./factories";

describe("anonymousUser", () => {
  it("genera email sintético @session.latidos.local sin canales reachables", () => {
    const u = anonymousUser();
    expect(u.email).toMatch(/@session\.latidos\.local$/);
    expect(u.telegramId).toBeNull();
    expect(u.googleId).toBeNull();
    expect(u.passwordHash).toBeNull();
    expect(u.emailVerified).toBe(false);
    expect(u.deletedAt).toBeNull();
    expect(u.isActive).toBe(true);
  });

  it("respeta overrides", () => {
    const u = anonymousUser({ name: "Mario", lastSeen: new Date("2026-01-01") });
    expect(u.name).toBe("Mario");
    expect(u.lastSeen.toISOString().startsWith("2026-01-01")).toBe(true);
  });
});

describe("registeredUser", () => {
  it("tiene email real, verificado y password hash", () => {
    const u = registeredUser();
    expect(u.email).not.toMatch(/@session\./);
    expect(u.emailVerified).toBe(true);
    expect(u.passwordHash).toBeTruthy();
    expect(u.messageCount).toBeGreaterThanOrEqual(5);
  });
});

describe("dormantAnonymous", () => {
  it("lastSeen >30 días en el pasado", () => {
    const u = dormantAnonymous();
    const ageMs = Date.now() - u.lastSeen.getTime();
    expect(ageMs).toBeGreaterThan(30 * 86400000);
    expect(u.messageCount).toBe(0);
    expect(u.email).toMatch(/@session\.latidos\.local$/);
  });
});

describe("conversation + message", () => {
  it("conversation tiene defaults razonables", () => {
    const c = conversation();
    expect(typeof c.title).toBe("string");
    expect(c.journalMode).toBe(false);
  });

  it("message respeta role override", () => {
    const m = message({ role: "assistant", content: "hola" });
    expect(m.role).toBe("assistant");
    expect(m.content).toBe("hola");
  });
});

describe("userWithMessages", () => {
  it("devuelve user + conversation + n messages", () => {
    const { user, conversation: conv, messages } = userWithMessages(5);
    expect(user.messageCount).toBe(5);
    expect(messages).toHaveLength(5);
    expect(conv.title).toBeTruthy();
  });

  it("alterna roles cuando alternateRoles=true", () => {
    const { messages } = userWithMessages(4, { alternateRoles: true });
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
    expect(messages[2].role).toBe("user");
    expect(messages[3].role).toBe("assistant");
  });
});

describe("userState", () => {
  it("acepta un estado y lo devuelve tal cual", () => {
    expect(userState("claridad").state).toBe("claridad");
    expect(userState().state).toBe("neutral");
  });
});

describe("goal + action", () => {
  it("goal tiene status active por defecto", () => {
    expect(goal().status).toBe("active");
  });
  it("action tiene completed=false por defecto", () => {
    expect(action().completed).toBe(false);
  });
});

describe("userWithActiveGoal", () => {
  it("devuelve usuario + goal active + 3 actions (1 completada)", () => {
    const result = userWithActiveGoal();
    expect(result.user.email).toBeTruthy();
    expect(result.goal.status).toBe("active");
    expect(result.actions).toHaveLength(3);
    const completed = result.actions.filter((a) => a.completed);
    expect(completed).toHaveLength(1);
  });
});

describe("pendingCapsule", () => {
  it("snapshot por defecto, deliverAt en +30 días", () => {
    const NOW = new Date("2026-04-25T10:00:00.000Z");
    const c = pendingCapsule({ now: NOW });
    expect(c.kind).toBe("snapshot");
    expect(c.status).toBe("pending");
    expect(c.deliverAt.getTime() - NOW.getTime()).toBe(30 * 86400000);
    expect(c.payload).toMatchObject({ kind: "snapshot", windowDays: 30 });
  });

  it("letter genera texto de paragraph en payload", () => {
    const c = pendingCapsule({ kind: "letter" });
    expect(c.kind).toBe("letter");
    expect((c.payload as { kind: string; text: string }).text.length).toBeGreaterThan(0);
  });
});

describe("readyCapsule", () => {
  it("status=ready y deliverAt en el pasado", () => {
    const NOW = new Date("2026-04-25T10:00:00.000Z");
    const c = readyCapsule({ now: NOW });
    expect(c.status).toBe("ready");
    expect(c.deliverAt.getTime()).toBeLessThan(NOW.getTime());
    expect(c.deliveredAt).toEqual(NOW);
  });
});

describe("seedFactories", () => {
  it("misma semilla → mismo email anónimo", () => {
    seedFactories(42);
    const a = anonymousUser();
    seedFactories(42);
    const b = anonymousUser();
    expect(a.email).toBe(b.email);
  });
});
