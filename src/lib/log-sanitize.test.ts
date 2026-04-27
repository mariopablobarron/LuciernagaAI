import { sanitizeMeta } from "./log-sanitize";

describe("sanitizeMeta", () => {
  it("returns undefined for nullish input", () => {
    expect(sanitizeMeta(undefined)).toBeUndefined();
    expect(sanitizeMeta(null)).toBeUndefined();
  });

  it("redacts sensitive top-level keys", () => {
    const result = sanitizeMeta({
      email: "user@example.com",
      password: "hunter2",
      userMessage: "lo que escribió el usuario",
      prompt: "system prompt",
      token: "abc123",
      authorization: "Bearer xyz",
      cookie: "session=xxx",
      telegramId: 123456789,
      phone: "+34 600 000 000",
      regularField: "ok",
    });
    expect(result).toEqual({
      email: "[REDACTED]",
      password: "[REDACTED]",
      userMessage: "[REDACTED]",
      prompt: "[REDACTED]",
      token: "[REDACTED]",
      authorization: "[REDACTED]",
      cookie: "[REDACTED]",
      telegramId: "[REDACTED]",
      phone: "[REDACTED]",
      regularField: "ok",
    });
  });

  it("redacts sensitive keys regardless of casing or snake/camel form", () => {
    const result = sanitizeMeta({
      User_Email: "x@y.com",
      apiKey: "k",
      API_KEY: "k2",
      Cookie: "c",
      messageText: "hola",
    });
    expect(result).toEqual({
      User_Email: "[REDACTED]",
      apiKey: "[REDACTED]",
      API_KEY: "[REDACTED]",
      Cookie: "[REDACTED]",
      messageText: "[REDACTED]",
    });
  });

  it("recurses into nested objects", () => {
    const result = sanitizeMeta({
      user: { id: 1, email: "x@y.com", name: "Mario" },
      keep: { nested: { value: 42 } },
    });
    expect(result).toEqual({
      user: { id: 1, email: "[REDACTED]", name: "Mario" },
      keep: { nested: { value: 42 } },
    });
  });

  it("handles arrays", () => {
    const result = sanitizeMeta({
      users: [
        { id: 1, email: "a@b.com" },
        { id: 2, email: "c@d.com" },
      ],
    });
    expect(result).toEqual({
      users: [
        { id: 1, email: "[REDACTED]" },
        { id: 2, email: "[REDACTED]" },
      ],
    });
  });

  it("truncates very long strings", () => {
    const long = "a".repeat(2500);
    const result = sanitizeMeta({ description: long }) as Record<string, string>;
    expect(result.description.length).toBeLessThan(long.length);
    expect(result.description.endsWith("[+500]")).toBe(true);
  });

  it("does not blow up on circular references", () => {
    const a: Record<string, unknown> = { name: "a" };
    const b: Record<string, unknown> = { name: "b", a };
    a.b = b;
    const result = sanitizeMeta({ root: a }) as Record<string, unknown>;
    const root = result.root as Record<string, unknown>;
    const bChild = root.b as Record<string, unknown>;
    expect(bChild.a).toBe("[circular]");
  });

  it("preserves primitives and null", () => {
    const result = sanitizeMeta({
      n: 42,
      b: true,
      s: "ok",
      nil: null,
    });
    expect(result).toEqual({ n: 42, b: true, s: "ok", nil: null });
  });

  it("stops descending past max depth", () => {
    let nested: Record<string, unknown> = { value: "deep" };
    for (let i = 0; i < 20; i++) nested = { next: nested };
    const result = sanitizeMeta({ root: nested }) as Record<string, unknown>;
    const json = JSON.stringify(result);
    expect(json).toContain("[depth-limit]");
  });
});
