import { GET } from "./route";

describe("GET /api/health", () => {
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  });

  it("retorna status ok y openrouter=false sin key", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.openrouter).toBe(false);
    expect(typeof body.timestamp).toBe("string");
  });

  it("retorna openrouter=true cuando existe key", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.openrouter).toBe(true);
  });
});
