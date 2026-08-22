jest.mock("@/lib/auth", () => ({
  InvalidSessionTokenError: class InvalidSessionTokenError extends Error {},
  resolveIdentity: jest.fn(async () => ({ userId: "usr_owner" })),
}));

jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock("@/services/user", () => ({
  invalidateUserCache: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({ logError: jest.fn() }));
jest.mock("@/services/telegram", () => ({
  buildAdminAlert: jest.fn(),
  notifyAdmin: jest.fn(),
}));
jest.mock("@/lib/request-info", () => ({
  getRequestContext: jest.fn(),
  formatDevice: jest.fn(),
  maskIp: jest.fn(),
}));

import { getPrismaClient } from "@/db/prisma";
import { NextRequest } from "next/server";
import { PATCH } from "./route";

const getPrismaClientMock = jest.mocked(getPrismaClient);
const userFindUniqueMock = jest.fn();
const userUpdateMock = jest.fn();

function requestWithAvatar(avatarData: string) {
  return new NextRequest("http://localhost/api/user/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ avatarData }),
  });
}

describe("PATCH /api/user/profile — avatar validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPrismaClientMock.mockReturnValue({
      user: {
        findUnique: userFindUniqueMock,
        update: userUpdateMock,
      },
    } as never);
  });

  it("rechaza SVG activo", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    );
    const response = await PATCH(
      requestWithAvatar(`data:image/svg+xml;base64,${svg.toString("base64")}`)
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({ error: "AVATAR_FORMAT_INVALID" })
    );
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("rechaza SVG disfrazado con MIME de PNG", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    );
    const response = await PATCH(
      requestWithAvatar(`data:image/png;base64,${svg.toString("base64")}`)
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({ error: "AVATAR_FORMAT_INVALID" })
    );
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it("mantiene la subida de un PNG raster válido", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
    const avatarData = `data:image/png;base64,${png.toString("base64")}`;
    userFindUniqueMock.mockResolvedValueOnce({ name: "Owner" });
    userUpdateMock.mockResolvedValueOnce({
      name: "Owner",
      bio: null,
      phone: null,
      avatarData,
    });

    const response = await PATCH(requestWithAvatar(avatarData));

    expect(response.status).toBe(200);
    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "usr_owner" },
        data: { avatarData },
      })
    );
  });
});
