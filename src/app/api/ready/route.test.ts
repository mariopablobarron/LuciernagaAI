const queryMock = jest.fn();

jest.mock("@/db/prisma", () => ({
  getPrismaClient: () => ({
    $queryRaw: queryMock,
  }),
}));

import { GET } from "./route";

describe("GET /api/ready", () => {
  it("retorna ok cuando la DB responde", async () => {
    queryMock.mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
  });

  it("retorna error cuando falla la DB", async () => {
    queryMock.mockRejectedValueOnce(new Error("DB down"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.status).toBe("error");
    expect(body.database).toBe("disconnected");
    // Error details intentionally omitted from response to avoid leaking infrastructure info
    expect(body.error).toBeUndefined();
  });
});
