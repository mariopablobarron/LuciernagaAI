import { GET } from "./route";
import { cache } from "@/lib/cache";

jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn(() => ({
    $queryRaw: jest.fn((strings: TemplateStringsArray) => {
      const sql = Array.isArray(strings) ? strings.join("") : String(strings);
      if (sql.includes("_prisma_migrations")) {
        // No failed migrations
        return Promise.resolve([]);
      }
      // SELECT 1 health probe
      return Promise.resolve([{ "?column?": 1 }]);
    }),
  })),
}));

describe("GET /api/health", () => {
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    cache.invalidate("health:check");
  });

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  });

  it("incluye OPENROUTER_API_KEY en missingVars cuando no hay key", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.checks.missingVars).toContain("OPENROUTER_API_KEY");
    expect(typeof body.timestamp).toBe("string");
  });

  it("no incluye OPENROUTER_API_KEY en missingVars cuando existe key", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.checks.missingVars).not.toContain("OPENROUTER_API_KEY");
  });

  it("devuelve 503 + status=down cuando hay migraciones fallidas en _prisma_migrations", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    const { getPrismaClient } = jest.requireMock("@/db/prisma") as {
      getPrismaClient: jest.Mock;
    };
    const failedMock = {
      $queryRaw: jest.fn((strings: TemplateStringsArray) => {
        const sql = Array.isArray(strings) ? strings.join("") : String(strings);
        if (sql.includes("_prisma_migrations")) {
          return Promise.resolve([
            { migration_name: "20260427120000_add_semantic_memory" },
          ]);
        }
        return Promise.resolve([{ "?column?": 1 }]);
      }),
    };
    getPrismaClient.mockImplementation(() => failedMock);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("down");
    expect(body.checks.migrations).toBe("down");
    expect(body.checks.failedMigrations).toContain(
      "20260427120000_add_semantic_memory",
    );
  });
});
