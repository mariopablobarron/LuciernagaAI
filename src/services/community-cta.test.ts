const findUniqueMock = jest.fn();
const detectRecurrentStateMock = jest.fn();

jest.mock("@/db/prisma", () => ({
  getPrismaClient: () => ({
    communitySpace: { findUnique: findUniqueMock },
  }),
}));

jest.mock("@/services/blocker-recurrence", () => ({
  detectRecurrentState: (...args: unknown[]) => detectRecurrentStateMock(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
}));

import { resolveCommunityCta } from "./community-cta";
import { resetCtaCooldownForTests } from "./community-cta-map";

describe("resolveCommunityCta", () => {
  const now = new Date(Date.UTC(2026, 3, 23, 12, 0, 0));

  beforeEach(() => {
    findUniqueMock.mockReset();
    detectRecurrentStateMock.mockReset();
    resetCtaCooldownForTests();
  });

  it("devuelve null en crisisMode, sin llamar al detector", async () => {
    const result = await resolveCommunityCta({ userId: "u1", crisisMode: true });
    expect(result).toBeNull();
    expect(detectRecurrentStateMock).not.toHaveBeenCalled();
  });

  it("devuelve null si el detector no encuentra recurrencia", async () => {
    detectRecurrentStateMock.mockResolvedValue({ isRecurrent: false });
    const result = await resolveCommunityCta({ userId: "u1", crisisMode: false });
    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("devuelve null si el space configurado no existe en DB (falla cerrada)", async () => {
    detectRecurrentStateMock.mockResolvedValue({
      isRecurrent: true, state: "bloqueo", daysHit: 3,
    });
    findUniqueMock.mockResolvedValue(null);
    const result = await resolveCommunityCta({ userId: "u1", crisisMode: false });
    expect(result).toBeNull();
  });

  it("devuelve null si el space está inactivo", async () => {
    detectRecurrentStateMock.mockResolvedValue({
      isRecurrent: true, state: "bloqueo", daysHit: 2,
    });
    findUniqueMock.mockResolvedValue({ slug: "bloqueos", isActive: false });
    const result = await resolveCommunityCta({ userId: "u1", crisisMode: false });
    expect(result).toBeNull();
  });

  it("devuelve CTA con href y metadata cuando todo cuadra", async () => {
    detectRecurrentStateMock.mockResolvedValue({
      isRecurrent: true, state: "bloqueo", daysHit: 2,
    });
    findUniqueMock.mockResolvedValue({ slug: "bloqueos", isActive: true });
    const result = await resolveCommunityCta({
      userId: "u1", crisisMode: false, options: { now },
    });
    expect(result).toEqual({
      kind: "recurrent_blocker",
      state: "bloqueo",
      daysHit: 2,
      spaceSlug: "bloqueos",
      href: "/community?space=bloqueos",
      label: expect.any(String),
      reason: expect.any(String),
    });
  });

  it("respeta cooldown: segunda llamada inmediata devuelve null", async () => {
    detectRecurrentStateMock.mockResolvedValue({
      isRecurrent: true, state: "bloqueo", daysHit: 2,
    });
    findUniqueMock.mockResolvedValue({ slug: "bloqueos", isActive: true });

    const first = await resolveCommunityCta({
      userId: "u1", crisisMode: false, options: { now },
    });
    expect(first).not.toBeNull();

    const second = await resolveCommunityCta({
      userId: "u1", crisisMode: false, options: { now },
    });
    expect(second).toBeNull();
  });

  it("tras 7 días el cooldown expira", async () => {
    detectRecurrentStateMock.mockResolvedValue({
      isRecurrent: true, state: "bloqueo", daysHit: 2,
    });
    findUniqueMock.mockResolvedValue({ slug: "bloqueos", isActive: true });

    const first = await resolveCommunityCta({
      userId: "u1", crisisMode: false, options: { now },
    });
    expect(first).not.toBeNull();

    const later = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    const second = await resolveCommunityCta({
      userId: "u1", crisisMode: false, options: { now: later },
    });
    expect(second).not.toBeNull();
  });

  it("falla cerrada ante error inesperado", async () => {
    detectRecurrentStateMock.mockRejectedValue(new Error("db down"));
    const result = await resolveCommunityCta({ userId: "u1", crisisMode: false });
    expect(result).toBeNull();
  });
});
