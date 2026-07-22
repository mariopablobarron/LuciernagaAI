jest.mock("@/lib/auth", () => ({
  bootstrapSessionIdentity: jest.fn(),
  attachSessionCookie: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

jest.mock("@/services/journeys", () => ({
  listAvailableJourneys: jest.fn(),
  assignJourneyToUser: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "./route";
import { bootstrapSessionIdentity, attachSessionCookie } from "@/lib/auth";
import { listAvailableJourneys } from "@/services/journeys";

function req() {
  return new NextRequest("http://localhost/api/journeys");
}

describe("GET /api/journeys — bootstrap anónimo", () => {
  beforeEach(() => jest.clearAllMocks());

  it("hace bootstrap de sesión anónima y devuelve los journeys (no 401)", async () => {
    // Usuario nuevo, sin sesión previa: bootstrap crea una anónima.
    (bootstrapSessionIdentity as jest.Mock).mockResolvedValue({
      userId: "anon_1",
      shouldSetCookie: true,
      sessionToken: "tok_anon",
    });
    (listAvailableJourneys as jest.Mock).mockResolvedValue([{ slug: "autoconocimiento" }]);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.journeys).toHaveLength(1);
    expect(bootstrapSessionIdentity).toHaveBeenCalledTimes(1);
    // Adjunta la cookie de la nueva sesión anónima.
    expect(attachSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("no adjunta cookie si la sesión ya existía", async () => {
    (bootstrapSessionIdentity as jest.Mock).mockResolvedValue({
      userId: "usr_1",
      shouldSetCookie: false,
      sessionToken: "tok",
    });
    (listAvailableJourneys as jest.Mock).mockResolvedValue([]);

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(attachSessionCookie).not.toHaveBeenCalled();
  });
});
