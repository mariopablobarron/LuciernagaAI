import { POST } from "./route";

describe("POST /api/mock-chat", () => {
  it("responde con estado detectado y mock=true", async () => {
    const req = {
      json: async () => ({
        message: "Estoy bloqueado y con parálisis",
        userId: "u-test",
      }),
    } as unknown as Request;

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mock).toBe(true);
    expect(body.state).toBe("bloqueado");
    expect(typeof body.reply).toBe("string");
    expect(body.reply.length).toBeGreaterThan(0);
  });
});
