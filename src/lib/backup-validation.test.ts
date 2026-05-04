import { gzipSync } from "node:zlib";
import { validateBackupDump } from "./backup-validation";

const VALID_DUMP = `-- Backup: 2026-05-01T00:00:00.000Z
-- Tables: 6
SET statement_timeout = 0;
SET client_encoding = 'UTF8';

-- Table: User
CREATE TABLE IF NOT EXISTS "User" (
  "id" text NOT NULL,
  "email" text NOT NULL
);
INSERT INTO "User" ("id", "email") VALUES ('a', 'a@b.es') ON CONFLICT DO NOTHING;
INSERT INTO "User" ("id", "email") VALUES ('c', 'c@d.es') ON CONFLICT DO NOTHING;

-- Table: Message
CREATE TABLE IF NOT EXISTS "Message" (
  "id" text NOT NULL
);
INSERT INTO "Message" ("id") VALUES ('m1') ON CONFLICT DO NOTHING;

-- Table: Conversation
CREATE TABLE IF NOT EXISTS "Conversation" ("id" text);
-- Table: Goal
CREATE TABLE IF NOT EXISTS "Goal" ("id" text);
-- Table: Event
CREATE TABLE IF NOT EXISTS "Event" ("id" text);
-- Table: Foo
CREATE TABLE IF NOT EXISTS "Foo" ("id" text);
`;

describe("validateBackupDump — happy path", () => {
  it("acepta un dump bien formado en string", () => {
    const result = validateBackupDump(VALID_DUMP);
    expect(result.ok).toBe(true);
    expect(result.hasHeader).toBe(true);
    expect(result.createTableCount).toBeGreaterThanOrEqual(5);
    expect(result.insertCount).toBeGreaterThanOrEqual(1);
    expect(result.tablesDetected).toContain("User");
    expect(result.tablesDetected).toContain("Message");
    expect(result.reasons).toEqual([]);
  });

  it("acepta dump gzipped (auto-detecta magic bytes)", () => {
    const buf = gzipSync(Buffer.from(VALID_DUMP));
    const result = validateBackupDump(buf);
    expect(result.ok).toBe(true);
    expect(result.tablesDetected).toContain("User");
  });

  it("acepta buffer no comprimido tratándolo como utf-8", () => {
    const buf = Buffer.from(VALID_DUMP);
    const result = validateBackupDump(buf);
    expect(result.ok).toBe(true);
  });
});

describe("validateBackupDump — rejecta", () => {
  it("rejecta dump vacío", () => {
    const result = validateBackupDump("");
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes("too small"))).toBe(true);
  });

  it("rejecta dump sin header", () => {
    const noHeader = VALID_DUMP.split("\n").slice(1).join("\n");
    const result = validateBackupDump(noHeader);
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes("header"))).toBe(true);
  });

  it("rejecta dump con muy pocas tablas", () => {
    const tiny = `-- Backup: x\nCREATE TABLE "A" ("id" text);\nCREATE TABLE "B" ("id" text);\nINSERT INTO "A" VALUES (1);`;
    const result = validateBackupDump(tiny);
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes("CREATE TABLE"))).toBe(true);
  });

  it("rejecta dump con tablas pero sin un solo INSERT", () => {
    const noInserts = `-- Backup: x
CREATE TABLE "A" ("id" text);
CREATE TABLE "B" ("id" text);
CREATE TABLE "C" ("id" text);
CREATE TABLE "D" ("id" text);
CREATE TABLE "E" ("id" text);
CREATE TABLE "F" ("id" text);`;
    const result = validateBackupDump(noInserts);
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes("INSERT"))).toBe(true);
  });

  it("rejecta gzip corrupto", () => {
    const fakeGzip = Buffer.from([0x1f, 0x8b, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const result = validateBackupDump(fakeGzip);
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes("gunzip"))).toBe(true);
  });
});

describe("validateBackupDump — counts", () => {
  it("cuenta tablas únicas (sin duplicar si hay 2 CREATE para la misma)", () => {
    const repeated = `-- Backup: x
CREATE TABLE IF NOT EXISTS "User" ("id" text);
CREATE TABLE IF NOT EXISTS "User" ("id" text);
CREATE TABLE IF NOT EXISTS "B" ("id" text);
CREATE TABLE IF NOT EXISTS "C" ("id" text);
CREATE TABLE IF NOT EXISTS "D" ("id" text);
CREATE TABLE IF NOT EXISTS "E" ("id" text);
INSERT INTO "User" VALUES (1);`;
    const result = validateBackupDump(repeated);
    // tablesDetected es uniq, createTableCount NO
    expect(result.tablesDetected.filter((t) => t === "User").length).toBe(1);
    expect(result.createTableCount).toBe(6);
  });

  it("cuenta múltiples INSERT correctamente", () => {
    const result = validateBackupDump(VALID_DUMP);
    // 2 inserts en User + 1 en Message = 3 mínimo
    expect(result.insertCount).toBe(3);
  });
});
