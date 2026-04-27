import { sendAdminDocument, TELEGRAM_DOC_MAX_BYTES } from "./telegram";

describe("sendAdminDocument size guard", () => {
  it("exposes a 49 MB cap", () => {
    expect(TELEGRAM_DOC_MAX_BYTES).toBe(49 * 1024 * 1024);
  });

  it("rejects buffers larger than the cap with a structured error, without hitting the network", async () => {
    const oversize = Buffer.alloc(TELEGRAM_DOC_MAX_BYTES + 1);
    const result = await sendAdminDocument(oversize, "huge_backup.sql.gz");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("size_exceeds_limit");
    expect(result.sizeBytes).toBe(TELEGRAM_DOC_MAX_BYTES + 1);
    expect(result.limitBytes).toBe(TELEGRAM_DOC_MAX_BYTES);
    expect(result.error).toContain("over the");
  });

  it("does not hit the network for oversize buffers even if env vars are missing", async () => {
    const original = {
      adminId: process.env.ADMIN_TELEGRAM_ID,
      token: process.env.TELEGRAM_BOT_TOKEN,
    };
    delete process.env.ADMIN_TELEGRAM_ID;
    delete process.env.TELEGRAM_BOT_TOKEN;

    const oversize = Buffer.alloc(TELEGRAM_DOC_MAX_BYTES + 1);
    const result = await sendAdminDocument(oversize, "x.sql.gz");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // size guard runs first → reason should be size, not missing env
      expect(result.reason).toBe("size_exceeds_limit");
    }

    if (original.adminId) process.env.ADMIN_TELEGRAM_ID = original.adminId;
    if (original.token) process.env.TELEGRAM_BOT_TOKEN = original.token;
  });
});
