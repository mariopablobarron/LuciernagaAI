import type { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { isAgeRange, type AgeRange } from "@/lib/age-range";

/**
 * Server-side helpers to read & write the user's age declaration.
 *
 * Storage layout:
 *   - Logged-in users: User.ageRange in Postgres (source of truth).
 *   - Anonymous: cookie `mentor_age_state` (httpOnly), so the client never
 *     touches the value directly. The cookie also stores a `blocked` flag
 *     for users who declared under_14 — they get redirected to /menores.
 *
 * The cookie is httpOnly to prevent client-side tampering. The UI consults
 * this state via GET /api/auth/age-state instead of reading cookies.
 */

const COOKIE_NAME = "mentor_age_state";
const COOKIE_MAX_AGE_RANGE = 60 * 60 * 24 * 365; // 1 year for age range
const COOKIE_MAX_AGE_BLOCKED = 60 * 60 * 24 * 30; // 30 days for under_14 lock

export type AgeState =
  | { kind: "unknown" }
  | { kind: "blocked" }
  | { kind: "declared"; ageRange: AgeRange };

type CookiePayload = {
  v: 1;
  blocked?: boolean;
  ageRange?: AgeRange;
};

function parseCookie(raw: string | undefined): CookiePayload | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as CookiePayload;
    if (parsed.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function serialiseCookie(payload: CookiePayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function readAgeStateFromCookie(req: NextRequest): AgeState {
  const raw = req.cookies.get(COOKIE_NAME)?.value;
  const parsed = parseCookie(raw);
  if (!parsed) return { kind: "unknown" };
  if (parsed.blocked) return { kind: "blocked" };
  if (parsed.ageRange && isAgeRange(parsed.ageRange)) {
    return { kind: "declared", ageRange: parsed.ageRange };
  }
  return { kind: "unknown" };
}

/**
 * Resolve the user's age state, preferring the DB row when there's a
 * logged-in user. Falls back to the cookie when anonymous or when the DB
 * row has no ageRange yet.
 */
export async function resolveAgeState(
  req: NextRequest,
  userId?: string | null,
): Promise<AgeState> {
  // Cookie takes precedence for the "blocked" signal — once the user
  // declared under_14 we honour that even if they later sign in.
  const fromCookie = readAgeStateFromCookie(req);
  if (fromCookie.kind === "blocked") return fromCookie;

  if (userId) {
    try {
      const prisma = getPrismaClient();
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { ageRange: true },
      });
      if (user?.ageRange && isAgeRange(user.ageRange)) {
        return { kind: "declared", ageRange: user.ageRange };
      }
    } catch {
      // fall through to cookie
    }
  }

  if (fromCookie.kind === "declared") return fromCookie;
  return { kind: "unknown" };
}

export async function setDeclaredAgeRange(
  res: NextResponse,
  ageRange: AgeRange,
  userId?: string | null,
): Promise<void> {
  const payload: CookiePayload = { v: 1, ageRange };
  res.cookies.set(COOKIE_NAME, serialiseCookie(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_RANGE,
  });
  if (userId) {
    try {
      const prisma = getPrismaClient();
      await prisma.user.update({
        where: { id: userId },
        data: { ageRange },
      });
    } catch {
      // cookie still set — DB persistence is best-effort here.
    }
  }
}

export function setBlockedAgeState(res: NextResponse): void {
  const payload: CookiePayload = { v: 1, blocked: true };
  res.cookies.set(COOKIE_NAME, serialiseCookie(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_BLOCKED,
  });
}

export const AGE_STATE_COOKIE_NAME = COOKIE_NAME;
