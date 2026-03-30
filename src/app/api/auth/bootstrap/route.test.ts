import { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/auth/bootstrap", () => {
  it("genera sesión y setea cookie cuando no existe", async () => {
    const req = new NextRequest("http://localhost/api/auth/bootstrap", {
      method: "POST",
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(typeof body.userId).toBe("string");
    expect(body.source).toBe("generated");
    expect(response.headers.get("set-cookie")).toContain("mw_session=");
  });

  it("valida sesión existente sin regenerar cookie", async () => {
    const initialReq = new NextRequest("http://localhost/api/auth/bootstrap", {
      method: "POST",
    });
    const initialResponse = await POST(initialReq);
    const cookieHeader = initialResponse.headers.get("set-cookie");
    expect(cookieHeader).toContain("mw_session=");

    const req = new NextRequest("http://localhost/api/auth/bootstrap", {
      method: "POST",
      headers: {
        cookie: (cookieHeader || "").split(";")[0],
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.source).toBe("session");
  });
});
