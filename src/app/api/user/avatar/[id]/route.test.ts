jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn(),
}));

import { getPrismaClient } from "@/db/prisma";
import { GET } from "./route";

const getPrismaClientMock = jest.mocked(getPrismaClient);
const userFindUniqueMock = jest.fn();

function getAvatar() {
  return GET(new Request("http://localhost/api/user/avatar/usr_owner"), {
    params: Promise.resolve({ id: "usr_owner" }),
  });
}

describe("GET /api/user/avatar/[id] — active content boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPrismaClientMock.mockReturnValue({
      user: { findUnique: userFindUniqueMock },
    } as never);
  });

  it("no sirve un SVG legacy almacenado", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    );
    userFindUniqueMock.mockResolvedValueOnce({
      avatarData: `data:image/svg+xml;base64,${svg.toString("base64")}`,
    });

    const response = await getAvatar();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBeNull();
  });

  it("no sirve contenido SVG disfrazado de PNG", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    );
    userFindUniqueMock.mockResolvedValueOnce({
      avatarData: `data:image/png;base64,${svg.toString("base64")}`,
    });

    const response = await getAvatar();

    expect(response.status).toBe(404);
  });

  it("sirve un PNG raster válido con cabeceras de documento pasivo", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
    userFindUniqueMock.mockResolvedValueOnce({
      avatarData: `data:image/png;base64,${png.toString("base64")}`,
    });

    const response = await getAvatar();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
