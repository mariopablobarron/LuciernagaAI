jest.mock("@/db/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { GET } from "./route";
import { prisma } from "@/db/prisma";

describe("GET /api/ready", () => {
  it("retorna ok cuando la DB responde", async () => {
    const queryMock = prisma.$queryRaw as jest.Mock;
    queryMock.mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
  });

  it("retorna error cuando falla la DB", async () => {
    const queryMock = prisma.$queryRaw as jest.Mock;
    queryMock.mockRejectedValueOnce(new Error("DB down"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.status).toBe("error");
    expect(body.database).toBe("disconnected");
    expect(body.error).toContain("DB down");
  });
});
