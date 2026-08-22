export const MAX_AVATAR_BYTES = 200 * 1024;
export const MAX_AVATAR_DATA_URI_LENGTH = 270_000;

const AVATAR_DATA_URI_REGEX =
  /^data:(image\/(?:png|jpe?g|webp|gif|bmp|tiff?|avif|heic|heif));base64,([A-Za-z0-9+/]+={0,2})$/;

type SafeAvatar = {
  ok: true;
  buffer: Buffer;
  contentType: string;
  extension: string;
};

type UnsafeAvatar = {
  ok: false;
  reason: "format" | "too_large";
};

export type AvatarValidationResult = SafeAvatar | UnsafeAvatar;

function startsWithBytes(buffer: Buffer, bytes: number[]): boolean {
  return buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);
}

function hasAscii(buffer: Buffer, offset: number, value: string): boolean {
  return (
    buffer.length >= offset + value.length &&
    buffer.toString("ascii", offset, offset + value.length) === value
  );
}

function isoBmffBrands(buffer: Buffer): Set<string> {
  if (buffer.length < 16 || !hasAscii(buffer, 4, "ftyp")) return new Set();

  const boxSize = buffer.readUInt32BE(0);
  if (boxSize < 16 || boxSize > buffer.length) return new Set();

  const brands = new Set<string>([buffer.toString("ascii", 8, 12)]);
  for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
    brands.add(buffer.toString("ascii", offset, offset + 4));
  }
  return brands;
}

function matchesDeclaredImageType(buffer: Buffer, contentType: string): boolean {
  switch (contentType) {
    case "image/png":
      return startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return (
        startsWithBytes(buffer, [0xff, 0xd8, 0xff]) &&
        buffer.length >= 5 &&
        buffer.at(-2) === 0xff &&
        buffer.at(-1) === 0xd9
      );
    case "image/webp":
      return hasAscii(buffer, 0, "RIFF") && hasAscii(buffer, 8, "WEBP");
    case "image/gif":
      return hasAscii(buffer, 0, "GIF87a") || hasAscii(buffer, 0, "GIF89a");
    case "image/bmp":
      return hasAscii(buffer, 0, "BM");
    case "image/tiff":
      return (
        startsWithBytes(buffer, [0x49, 0x49, 0x2a, 0x00]) ||
        startsWithBytes(buffer, [0x4d, 0x4d, 0x00, 0x2a])
      );
    case "image/avif": {
      const brands = isoBmffBrands(buffer);
      return brands.has("avif") || brands.has("avis");
    }
    case "image/heic": {
      const brands = isoBmffBrands(buffer);
      return ["heic", "heix", "hevc", "hevx", "heim", "heis"].some((brand) => brands.has(brand));
    }
    case "image/heif": {
      const brands = isoBmffBrands(buffer);
      return ["mif1", "msf1", "heic", "heix", "hevc", "hevx", "heim", "heis"].some((brand) =>
        brands.has(brand)
      );
    }
    default:
      return false;
  }
}

export function validateAvatarDataUri(value: string): AvatarValidationResult {
  if (value.length > MAX_AVATAR_DATA_URI_LENGTH) {
    return { ok: false, reason: "too_large" };
  }

  const match = AVATAR_DATA_URI_REGEX.exec(value);
  if (!match) return { ok: false, reason: "format" };

  const payload = match[2];
  if (payload.length % 4 !== 0) return { ok: false, reason: "format" };

  const buffer = Buffer.from(payload, "base64");
  if (
    buffer.length === 0 ||
    buffer.toString("base64").replace(/=+$/, "") !== payload.replace(/=+$/, "")
  ) {
    return { ok: false, reason: "format" };
  }
  if (buffer.length > MAX_AVATAR_BYTES) {
    return { ok: false, reason: "too_large" };
  }

  const declaredType = match[1];
  const contentType =
    declaredType === "image/jpg"
      ? "image/jpeg"
      : declaredType === "image/tif"
        ? "image/tiff"
        : declaredType;
  if (!matchesDeclaredImageType(buffer, contentType)) {
    return { ok: false, reason: "format" };
  }

  const extension = contentType.slice("image/".length).replace("jpeg", "jpg");
  return { ok: true, buffer, contentType, extension };
}
