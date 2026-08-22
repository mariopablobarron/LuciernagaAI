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
import { GET } from "./route";

const getPrismaClientMock = jest.mocked(getPrismaClient);
const auditMock = jest.mocked(audit);
const cacheGetMock = jest.mocked(cache.get);
const orgAdminFindFirstMock = jest.fn();
const classroomFindUniqueMock = jest.fn();
const userFindManyMock = jest.fn();
const classroomCodeFindManyMock = jest.fn();

function request() {
  return new NextRequest(
    "http://localhost/api/org/classrooms/classroom-a?orgId=org-a&token=signed"
  );
}

function getClassroom() {
  return GET(request(), { params: Promise.resolve({ classroomId: "classroom-a" }) });
}

describe("GET /api/org/classrooms/[classroomId] — role allowlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPrismaClientMock.mockReturnValue({
      orgAdmin: { findFirst: orgAdminFindFirstMock },
      classroom: { findUnique: classroomFindUniqueMock },
      user: { findMany: userFindManyMock },
      classroomCode: { findMany: classroomCodeFindManyMock },
    } as never);
    cacheGetMock.mockImplementation(async (_key, _ttl, fetcher) => fetcher());
    classroomFindUniqueMock.mockResolvedValue({
      id: "classroom-a",
      name: "Aula A",
      description: null,
      organizationId: "org-a",
    });
    userFindManyMock.mockResolvedValue([]);
    classroomCodeFindManyMock.mockResolvedValue([]);
  });

  it.each(["hr", "therapist", "admin", "owner", "unexpected"])(
    "deniega los datos individuales al rol %s",
    async (role) => {
      orgAdminFindFirstMock.mockResolvedValueOnce({
        id: "org-admin-1",
        role,
        classroomId: null,
      });

      const response = await getClassroom();

      expect(response.status).toBe(403);
      expect(classroomFindUniqueMock).not.toHaveBeenCalled();
      expect(userFindManyMock).not.toHaveBeenCalled();
      expect(auditMock).not.toHaveBeenCalled();
    }
  );

  it("deniega a un docente de otra aula", async () => {
    orgAdminFindFirstMock.mockResolvedValueOnce({
      id: "org-admin-1",
      role: "teacher",
      classroomId: "classroom-b",
    });

    const response = await getClassroom();

    expect(response.status).toBe(403);
    expect(classroomFindUniqueMock).not.toHaveBeenCalled();
  });

  it("mantiene el acceso del docente asignado y lo audita", async () => {
    orgAdminFindFirstMock.mockResolvedValueOnce({
      id: "org-admin-1",
      role: "teacher",
      classroomId: "classroom-a",
    });

    const response = await getClassroom();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        classroom: expect.objectContaining({ id: "classroom-a" }),
        students: [],
        codes: [],
      })
    );
    expect(auditMock).toHaveBeenCalledWith({
      actorId: "org-admin-1",
      actorType: "orgAdmin",
      action: "read",
      resource: "ClassroomClinicalData",
      resourceId: "classroom-a",
      metadata: { organizationId: "org-a", role: "teacher" },
    });
  });

  it("mantiene el límite de tenant aunque la asignación esté desincronizada", async () => {
    orgAdminFindFirstMock.mockResolvedValueOnce({
      id: "org-admin-1",
      role: "teacher",
      classroomId: "classroom-a",
    });
    classroomFindUniqueMock.mockResolvedValueOnce({
      id: "classroom-a",
      name: "Aula externa",
      description: null,
      organizationId: "org-b",
    });

    const response = await getClassroom();

    expect(response.status).toBe(404);
    expect(userFindManyMock).not.toHaveBeenCalled();
    expect(auditMock).not.toHaveBeenCalled();
  });
});
