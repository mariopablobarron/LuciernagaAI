import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { persistBackupLocally, sanitizeFilename } from "./backup-storage";

describe("sanitizeFilename", () => {
  it("permite alphanum, guion, punto, subrayado", () => {
    expect(sanitizeFilename("backup_2026-05-01.sql.gz")).toBe("backup_2026-05-01.sql.gz");
  });

  it("bloquea path traversal con ../", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("../");
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
  });

  it("bloquea barra forward y backward", () => {
    expect(sanitizeFilename("a/b\\c.gz")).toBe("a_b_c.gz");
  });

  it("trunca nombres muy largos a 200 chars", () => {
    const long = "a".repeat(500) + ".gz";
    const out = sanitizeFilename(long);
    expect(out.length).toBeLessThanOrEqual(200);
  });

  it("reemplaza caracteres especiales por subrayado", () => {
    expect(sanitizeFilename("nombre con espacios y * ? & .gz")).toMatch(/^[a-zA-Z0-9._-]+$/);
  });
});

describe("persistBackupLocally", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "backup-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("escribe el archivo y devuelve absolutePath", async () => {
    const buffer = Buffer.from("contenido del backup");
    const result = await persistBackupLocally(buffer, "test.sql.gz", { dir: tmpDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.absolutePath).toContain(tmpDir);
    expect(result.absolutePath).toContain("test.sql.gz");
    expect(result.sizeBytes).toBe(buffer.length);

    const written = await fs.readFile(result.absolutePath);
    expect(written.toString()).toBe("contenido del backup");
  });

  it("crea el directorio si no existe (mkdir recursive)", async () => {
    const nestedDir = path.join(tmpDir, "deep/nested/dir");
    const result = await persistBackupLocally(Buffer.from("x"), "test.gz", { dir: nestedDir });
    expect(result.ok).toBe(true);
    const exists = await fs.stat(nestedDir);
    expect(exists.isDirectory()).toBe(true);
  });

  it("sanitiza el filename — no permite traversal", async () => {
    const result = await persistBackupLocally(Buffer.from("x"), "../../escape.gz", { dir: tmpDir });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // El path resuelto NO debe escapar del tmpDir.
    expect(result.absolutePath.startsWith(path.resolve(tmpDir))).toBe(true);
  });

  it("devuelve mkdir_failed si el path no es escribible", async () => {
    // /proc en Linux es read-only para escritura nueva. En macOS prueba con
    // un path imposible.
    const result = await persistBackupLocally(Buffer.from("x"), "test.gz", {
      dir: "/dev/null/imposible/no-puedo-crear-aqui",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("mkdir_failed");
  });
});
