import { MAX_AVATAR_BYTES, validateAvatarDataUri } from "./avatar-image";

function dataUri(contentType: string, bytes: Buffer): string {
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

function isoBmff(brand: string): Buffer {
  const buffer = Buffer.alloc(20);
  buffer.writeUInt32BE(20, 0);
  buffer.write("ftyp", 4, "ascii");
  buffer.write(brand, 8, "ascii");
  buffer.writeUInt32BE(0, 12);
  buffer.write(brand, 16, "ascii");
  return buffer;
}

describe("validateAvatarDataUri", () => {
  it.each([
    ["image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9])],
    [
      "image/webp",
      Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(1)]),
    ],
    ["image/gif", Buffer.from("GIF89a")],
    ["image/bmp", Buffer.from("BM")],
    ["image/tiff", Buffer.from([0x49, 0x49, 0x2a, 0x00])],
    ["image/avif", isoBmff("avif")],
    ["image/heic", isoBmff("heic")],
    ["image/heif", isoBmff("mif1")],
  ])("mantiene el formato raster %s", (contentType, bytes) => {
    const result = validateAvatarDataUri(dataUri(contentType, bytes));

    expect(result).toEqual(expect.objectContaining({ ok: true, contentType }));
  });

  it("normaliza el alias image/jpg", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]);

    expect(validateAvatarDataUri(dataUri("image/jpg", jpeg))).toEqual(
      expect.objectContaining({ ok: true, contentType: "image/jpeg", extension: "jpg" })
    );
  });

  it("rechaza contenido activo y MIME raster falsos", () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    );

    expect(validateAvatarDataUri(dataUri("image/svg+xml", svg))).toEqual({
      ok: false,
      reason: "format",
    });
    expect(validateAvatarDataUri(dataUri("image/png", svg))).toEqual({
      ok: false,
      reason: "format",
    });
  });

  it("rechaza base64 no canónico y payloads mayores de 200 KB", () => {
    expect(validateAvatarDataUri("data:image/png;base64,not_base64")).toEqual({
      ok: false,
      reason: "format",
    });
    expect(validateAvatarDataUri(dataUri("image/png", Buffer.alloc(MAX_AVATAR_BYTES + 1)))).toEqual(
      { ok: false, reason: "too_large" }
    );
  });
});
