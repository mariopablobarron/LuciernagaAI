jest.mock("@/lib/auth", () => {
  class MockInvalidSessionTokenError extends Error {
    constructor() {
      super("Invalid or expired session token");
      this.name = "InvalidSessionTokenError";
    }
  }

  return {
    InvalidSessionTokenError: MockInvalidSessionTokenError,
    resolveIdentity: jest.fn(),
    attachSessionCookie: jest.fn(),
    clearSessionCookie: jest.fn(),
  };
});

jest.mock("@/lib/prisma", () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock("@/services/state", () => ({
  detectUserState: jest.fn(),
  updateUserState: jest.fn(),
}));

jest.mock("@/services/emotional-model", () => ({
  analyzeEmotionalProfile: jest.fn(),
  updateEmotionalProfile: jest.fn(),
}));

jest.mock("@/services/impulse-challenges", () => ({
  upsertDailyImpulseLog: jest.fn(),
  updateActiveChallengesFromCheckin: jest.fn(),
}));

jest.mock("@/services/streak", () => ({
  updateStreak: jest.fn(),
}));

jest.mock("@/services/latidos", () => ({
  awardLatidos: jest.fn().mockResolvedValue(0),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";
import { resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { analyzeEmotionalProfile, updateEmotionalProfile } from "@/services/emotional-model";
import {
  upsertDailyImpulseLog,
  updateActiveChallengesFromCheckin,
} from "@/services/impulse-challenges";
import { detectUserState, updateUserState } from "@/services/state";
import { updateStreak } from "@/services/streak";

describe("POST /api/checkin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveIdentity as jest.Mock).mockReturnValue({
      userId: "usr_session_1",
      source: "session",
      sessionToken: "token",
      shouldSetCookie: false,
    });
    (detectUserState as jest.Mock).mockReturnValue("claridad");
    (updateUserState as jest.Mock).mockResolvedValue(undefined);
    (analyzeEmotionalProfile as jest.Mock).mockReturnValue({
      primaryEmotion: "calma",
      dominantPattern: "evita_decidir",
      focusArea: "propósito",
      energyLevel: "medio",
      riskLevel: "low",
      progressTrend: "mejora",
    });
    (updateEmotionalProfile as jest.Mock).mockResolvedValue(undefined);
    (upsertDailyImpulseLog as jest.Mock).mockResolvedValue({
      id: "log_1",
      emotionalState: "claridad",
      note: "Hoy me siento mejor",
      mood: "positive",
      challengeStatus: "cumplido",
      momentum: 4,
      createdAt: new Date().toISOString(),
    });
    (updateActiveChallengesFromCheckin as jest.Mock).mockResolvedValue([]);
    (updateStreak as jest.Mock).mockResolvedValue({
      currentDays: 1,
      bestDays: 1,
      lastCheckInDate: new Date().toISOString(),
      status: "active",
    });
    (getPrismaClient as jest.Mock).mockReturnValue({
      dailyCheckin: {
        create: jest.fn().mockResolvedValue({
          id: "checkin_1",
          userId: "usr_session_1",
          response: "Hoy me siento mejor",
          mood: "positive",
        }),
        count: jest.fn().mockResolvedValue(1),
      },
    });
  });

  it("usa la identidad de sesión y no un userId enviado en el body", async () => {
    const req = new NextRequest("http://localhost/api/checkin", {
      method: "POST",
      body: JSON.stringify({
        userId: "usr_fake",
        response: "Hoy me siento mejor",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.userId).toBe("usr_session_1");
    expect(body.emotionalProfile.primaryEmotion).toBe("calma");
    expect(updateUserState).toHaveBeenCalledWith("usr_session_1", "claridad");
    expect(updateEmotionalProfile).toHaveBeenCalledWith(
      "usr_session_1",
      expect.any(Object)
    );
  });
});
