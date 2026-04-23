import { NextRequest, NextResponse } from "next/server";
import { InvalidSessionTokenError, resolveIdentity } from "@/lib/auth";
import { getPrismaClient } from "@/db/prisma";
import { invalidateUserCache } from "@/services/user";
import { logError } from "@/lib/logger";
import { buildAdminAlert, notifyAdmin } from "@/services/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // allow time for large avatar uploads

const MAX_NAME = 100;
const MAX_BIO = 500;
const MAX_PHONE = 20;
const MAX_AVATAR_LENGTH = 270_000; // ~200KB base64
const PHONE_REGEX = /^\+?[\d\s()-]{6,20}$/;
const AVATAR_PREFIX_REGEX = /^data:image\/(png|jpe?g|webp|gif|svg\+xml|bmp|tiff?|avif|heic|heif);base64,/;

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { name: true, bio: true, phone: true, avatarData: true },
    });

    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        name: user.name,
        bio: user.bio,
        phone: user.phone,
        hasAvatar: Boolean(user.avatarData),
      },
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    const msg = error instanceof Error ? error.message : "Unknown";
    logError("USER", error, { route: "/api/user/profile", method: "GET", msg });

    if (msg.includes("Unknown argument") || msg.includes("column") || msg.includes("does not exist")) {
      return NextResponse.json({
        error: "MIGRATION_PENDING",
        message: "Los campos de perfil aun no estan disponibles.",
      }, { status: 503 });
    }

    return NextResponse.json({ error: "PROFILE_LOAD_FAILED", message: msg.slice(0, 200) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json()) as {
      name?: string;
      bio?: string;
      phone?: string;
      avatarData?: string | null;
    };

    const data: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (trimmed.length < 1 || trimmed.length > MAX_NAME) {
        return NextResponse.json({ error: "NAME_INVALID", message: `El nombre debe tener entre 1 y ${MAX_NAME} caracteres.` }, { status: 400 });
      }
      data.name = trimmed;
    }

    if (typeof body.bio === "string") {
      const trimmed = body.bio.trim();
      if (trimmed.length > MAX_BIO) {
        return NextResponse.json({ error: "BIO_TOO_LONG", message: `La bio no puede superar ${MAX_BIO} caracteres.` }, { status: 400 });
      }
      data.bio = trimmed || null;
    }

    if (typeof body.phone === "string") {
      const trimmed = body.phone.trim();
      if (trimmed && !PHONE_REGEX.test(trimmed)) {
        return NextResponse.json({ error: "PHONE_INVALID", message: "El formato del teléfono no es válido." }, { status: 400 });
      }
      data.phone = trimmed || null;
    }

    if (body.avatarData === null) {
      data.avatarData = null;
    } else if (typeof body.avatarData === "string") {
      if (!AVATAR_PREFIX_REGEX.test(body.avatarData)) {
        return NextResponse.json({ error: "AVATAR_FORMAT_INVALID", message: "Formato no soportado. Usa PNG, JPG, WebP, GIF, SVG, BMP, TIFF, AVIF o HEIC." }, { status: 400 });
      }
      if (body.avatarData.length > MAX_AVATAR_LENGTH) {
        return NextResponse.json({ error: "AVATAR_TOO_LARGE", message: "La imagen debe ser menor de 200 KB." }, { status: 400 });
      }
      data.avatarData = body.avatarData;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "NOTHING_TO_UPDATE" }, { status: 400 });
    }

    const prisma = getPrismaClient();

    // Capturamos el nombre previo para saber si este PATCH es la primera
    // vez que el usuario pone un nombre — único caso en que queremos
    // alertar al admin.
    const previous = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { name: true },
    });
    const firstNameCapture =
      typeof data.name === "string" &&
      data.name.length > 0 &&
      !previous?.name?.trim();

    const updated = await prisma.user.update({
      where: { id: identity.userId },
      data,
      select: { name: true, bio: true, phone: true, avatarData: true },
    });

    invalidateUserCache(identity.userId);

    if (firstNameCapture && typeof data.name === "string") {
      notifyAdmin(
        buildAdminAlert({
          tipo: "name_captured",
          userId: identity.userId,
          name: data.name,
        }),
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        name: updated.name,
        bio: updated.bio,
        phone: updated.phone,
        hasAvatar: Boolean(updated.avatarData),
      },
    });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    const msg = error instanceof Error ? error.message : "Unknown";
    logError("USER", error, { route: "/api/user/profile", method: "PATCH", msg });

    // Detect missing column error (migration not applied)
    if (msg.includes("Unknown argument") || msg.includes("column") || msg.includes("does not exist")) {
      return NextResponse.json({
        error: "MIGRATION_PENDING",
        message: "Los campos de perfil aun no estan disponibles. Es posible que falte ejecutar una migracion de base de datos.",
      }, { status: 503 });
    }

    return NextResponse.json({ error: "PROFILE_UPDATE_FAILED", message: msg.slice(0, 200) }, { status: 500 });
  }
}
