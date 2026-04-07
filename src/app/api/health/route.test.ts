import { GET } from "./route";
import { cache } from "@/lib/cache";

jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn(() => ({
    $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
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
});
