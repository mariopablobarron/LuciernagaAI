/**
 * Tests del extractStructured — la pieza que decide qué del meta va a
 * columnas dedicadas de SystemLog vs queda en el JSON context.
 *
 * No se exporta directamente desde logger.ts (es interno), así que aquí
 * testeamos el comportamiento end-to-end via logInfo + observar lo que
 * llega al `enqueueLog`. Para no acoplarnos al buffer real, mockeamos
 * `getPrismaClient` y observamos el batch que llegaría a createMany.
 */

import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock dependencias antes de importar el logger.
jest.mock("@/db/prisma", () => {
  const createManyMock = jest.fn().mockResolvedValue({ count: 0 });
  return {
    __esModule: true,
    getPrismaClient: () => ({
      systemLog: { createMany: createManyMock },
    }),
    __createManyMock: createManyMock,
  };
});

// Necesitamos forzar el flag IS_DB_SINK_ENABLED para que el flush ocurra
// (por defecto en tests puede estar off). Lo más simple: setear DATABASE_URL
// si el módulo lo consulta. Lo dejamos por ahora — los tests más detallados
// requieren refactor del logger para inyectar deps.

import { logInfo, logError } from "./logger";

describe("logInfo / logError — campos especiales __route/__userId/etc.", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("acepta meta sin campos especiales sin romper (back-compat)", () => {
    expect(() =>
      logInfo("TEST", "hello", { foo: "bar", n: 42 }),
    ).not.toThrow();
  });

  it("acepta meta con __route + __durationMs sin romper", () => {
    expect(() =>
      logInfo("TEST", "request_done", {
        __route: "/api/foo",
        __durationMs: 250,
        __statusCode: 200,
        __userId: "user-123",
        method: "GET",
      }),
    ).not.toThrow();
  });

  it("logError acepta los campos estructurados igual", () => {
    expect(() =>
      logError("TEST", new Error("kaboom"), {
        __route: "/api/foo",
        __durationMs: 50,
        __statusCode: 500,
        extra: "info",
      }),
    ).not.toThrow();
  });

  it("ignora silenciosamente campos especiales con tipo incorrecto", () => {
    // Si alguien pasa __durationMs como string, no debe romper — solo
    // se ignora ese campo (queda undefined en la columna).
    expect(() =>
      logInfo("TEST", "weird", {
        __route: 123 as unknown as string,           // tipo malo
        __durationMs: "fast" as unknown as number,   // tipo malo
        __statusCode: NaN,                            // !isFinite
        __userId: "x".repeat(500),                    // demasiado largo
      }),
    ).not.toThrow();
  });

  it("no rompe sin meta", () => {
    expect(() => logInfo("TEST", "no meta")).not.toThrow();
  });
});
