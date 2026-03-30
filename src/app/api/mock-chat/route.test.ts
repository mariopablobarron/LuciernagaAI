import { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/mock-chat", () => {
  it("responde con estado detectado y mock=true", async () => {
    const req = new NextRequest("http://localhost/api/mock-chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "Estoy bloqueado y con parálisis",
        userId: "u-test",
      }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mock).toBe(true);
    expect(body.state).toBe("bloqueo");
    expect(typeof body.reply).toBe("string");
    expect(body.reply.length).toBeGreaterThan(0);
  });
});
