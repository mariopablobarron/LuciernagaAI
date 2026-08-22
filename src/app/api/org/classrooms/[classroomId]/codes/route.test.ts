jest.mock("@/db/prisma", () => ({
  getPrismaClient: jest.fn(),
}));

jest.mock("@/lib/org-auth", () => ({
  verifyOrgToken: jest.fn(() => ({ adminId: "org-admin-1" })),
}));

jest.mock("@/lib/cache", () => ({
  cache: { get: jest.fn(), invalidate: jest.fn() },
}));

jest.mock("@/lib/audit", () => ({ audit: jest.fn() }));
jest.mock("@/lib/logger", () => ({ logError: jest.fn() }));

import { getPrismaClient } from "@/db/prisma";
import { audit } from "@/lib/audit";
import { cache } from "@/lib/cache";
import { NextRequest } from "next/server";
import { POST } from "./route";

const getPrismaClientMock = jest.mocked(getPrismaClient);
const auditMock = jest.mocked(audit);
const cacheInvalidateMock = jest.mocked(cache.invalidate);
const orgAdminFindFirstMock = jest.fn();
const classroomFindUniqueMock = jest.fn();
const classroomCodeCreateMock = jest.fn();

function request() {
  return new NextRequest(
    "http://localhost/api/org/classrooms/classroom-a/codes?orgId=org-a&token=signed",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "Curso", maxUses: 20 }),
    }
  );
}

function createCode() {
  return POST(request(), { params: Promise.resolve({ classroomId: "classroom-a" }) });
}

describe("POST /api/org/classrooms/[classroomId]/codes — role allowlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPrismaClientMock.mockReturnValue({
      orgAdmin: { findFirst: orgAdminFindFirstMock },
      classroom: { findUnique: classroomFindUniqueMock },
      classroomCode: { create: classroomCodeCreateMock },
    } as never);
    classroomFindUniqueMock.mockResolvedValue({
      organizationId: "org-a",
      name: "Aula A",
    });
    classroomCodeCreateMock.mockResolvedValue({
      id: "code-1",
      code: "AULA-2026-TEST",
      label: "Curso",
      maxUses: 20,
    });
  });

  it.each(["hr", "therapist", "owner", "unexpected"])(
    "deniega la creación de códigos al rol %s",
    async (role) => {
      orgAdminFindFirstMock.mockResolvedValueOnce({
        id: "org-admin-1",
        role,
        classroomId: null,
      });

      const response = await createCode();

      expect(response.status).toBe(403);
      expect(classroomFindUniqueMock).not.toHaveBeenCalled();
      expect(classroomCodeCreateMock).not.toHaveBeenCalled();
      expect(auditMock).not.toHaveBeenCalled();
    }
  );

  it("deniega a un docente de otra aula", async () => {
    orgAdminFindFirstMock.mockResolvedValueOnce({
      id: "org-admin-1",
      role: "teacher",
      classroomId: "classroom-b",
    });

    const response = await createCode();

    expect(response.status).toBe(403);
    expect(classroomCodeCreateMock).not.toHaveBeenCalled();
  });

  it.each([
    ["teacher", "classroom-a"],
    ["admin", null],
  ])("permite y audita al rol %s autorizado", async (role, classroomId) => {
    orgAdminFindFirstMock.mockResolvedValueOnce({
      id: "org-admin-1",
      role,
      classroomId,
    });

    const response = await createCode();

    expect(response.status).toBe(201);
    expect(classroomCodeCreateMock).toHaveBeenCalled();
    expect(cacheInvalidateMock).toHaveBeenCalledWith("classroom:classroom-a");
    expect(auditMock).toHaveBeenCalledWith({
      actorId: "org-admin-1",
      actorType: "orgAdmin",
      action: "create",
      resource: "ClassroomCode",
      resourceId: "code-1",
      metadata: { organizationId: "org-a", classroomId: "classroom-a", role },
    });
  });

  it("impide a un admin cruzar el límite de tenant", async () => {
    orgAdminFindFirstMock.mockResolvedValueOnce({
      id: "org-admin-1",
      role: "admin",
      classroomId: null,
    });
    classroomFindUniqueMock.mockResolvedValueOnce({
      organizationId: "org-b",
      name: "Aula externa",
    });

    const response = await createCode();

    expect(response.status).toBe(404);
    expect(classroomCodeCreateMock).not.toHaveBeenCalled();
    expect(auditMock).not.toHaveBeenCalled();
  });
});
