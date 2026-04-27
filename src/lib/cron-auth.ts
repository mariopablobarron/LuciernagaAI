import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isValidCronSecret(provided: string | null | undefined): boolean {
  if (!provided) return false;
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  return safeEqual(provided.trim(), expected);
}

export function requireCronSecret(req: NextRequest): NextResponse | null {
  const fromQuery = req.nextUrl.searchParams.get("secret");
  const fromHeader = req.headers.get("x-cron-secret");
  const provided = fromQuery ?? fromHeader;
  if (!isValidCronSecret(provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
