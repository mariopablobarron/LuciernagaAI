import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { hashPassword } from "@/lib/password";
import { issueSessionToken, attachSessionCookie } from "@/lib/auth";
import { normalizeEmail } from "@/services/user";
import { triggerWelcomeAvatarVideoAsync } from "@/services/welcomeAvatarVideo";
import { logError, logInfo } from "@/lib/logger";
import { sendAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/register-code
 * Register a new user with a classroom code. Assigns them to the org + classroom.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      code?: string;
      email?: string;
      password?: string;
      name?: string;
    };

    const { code, email, password, name } = body;

    if (!code?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Codigo, email y contraseña son obligatorios." },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const normalizedEmail = normalizeEmail(email);

    // 1. Find and validate the classroom code
    const classroomCode = await prisma.classroomCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            isActive: true,
            organization: { select: { id: true, name: true, isActive: true, maxUsers: true } },
          },
        },
      },
    });

    if (!classroomCode || !classroomCode.isActive) {
      return NextResponse.json(
        { error: "INVALID_CODE", message: "El codigo no es valido o ha sido desactivado." },
        { status: 400 },
      );
    }

    if (classroomCode.expiresAt && classroomCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "CODE_EXPIRED", message: "Este codigo ha expirado." },
        { status: 400 },
      );
    }

    if (classroomCode.maxUses > 0 && classroomCode.usedCount >= classroomCode.maxUses) {
      return NextResponse.json(
        { error: "CODE_EXHAUSTED", message: "Este codigo ya ha alcanzado el limite de usos." },
        { status: 400 },
      );
    }

    const classroom = classroomCode.classroom;
    if (!classroom.isActive || !classroom.organization.isActive) {
      return NextResponse.json(
        { error: "ORG_INACTIVE", message: "La organizacion o el aula no estan activas." },
        { status: 400 },
      );
    }

    // 2. Check org user limit
    const currentUserCount = await prisma.user.count({
      where: { organizationId: classroom.organizationId, isActive: true },
    });
    if (currentUserCount >= classroom.organization.maxUsers) {
      return NextResponse.json(
        { error: "ORG_FULL", message: "La organizacion ha alcanzado el limite de usuarios." },
        { status: 400 },
      );
    }

    // 3. Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      // If user exists but not in an org, assign them
      if (!existingUser.organizationId) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: existingUser.id },
            data: {
              organizationId: classroom.organizationId,
              classroomId: classroom.id,
            },
          }),
          prisma.classroomCode.update({
            where: { id: classroomCode.id },
            data: { usedCount: { increment: 1 } },
          }),
        ]);

        const token = issueSessionToken(existingUser.id);
        const res = NextResponse.json({
          success: true,
          userId: existingUser.id,
          classroom: classroom.name,
          organization: classroom.organization.name,
          existing: true,
        });
        attachSessionCookie(res, token);
        return res;
      }

      return NextResponse.json(
        { error: "EMAIL_EXISTS", message: "Este email ya esta registrado en otra organizacion." },
        { status: 409 },
      );
    }

    // 4. Create user + increment code usage in transaction
    const passwordHash = await hashPassword(password);
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name?.trim() || null,
          passwordHash,
          organizationId: classroom.organizationId,
          classroomId: classroom.id,
          emailVerified: true, // trusted because they have the classroom code
          consentGiven: true,
          consentAt: new Date(),
          source: `classroom:${classroom.name}`,
        },
      }),
      prisma.classroomCode.update({
        where: { id: classroomCode.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    logInfo("AUTH", "classroom_signup", {
      userId: user.id,
      email: normalizedEmail,
      classroomId: classroom.id,
      classroomName: classroom.name,
      orgId: classroom.organizationId,
      orgName: classroom.organization.name,
      code: classroomCode.code,
    });

    triggerWelcomeAvatarVideoAsync(user.id);

    // Notify admin
    sendAlert({
      type: "info",
      title: "Nuevo alumno registrado",
      message: `${name || normalizedEmail} se unio a ${classroom.name} (${classroom.organization.name}) con codigo ${classroomCode.code}`,
    });

    const token = issueSessionToken(user.id);
    const res = NextResponse.json({
      success: true,
      userId: user.id,
      classroom: classroom.name,
      organization: classroom.organization.name,
    }, { status: 201 });
    attachSessionCookie(res, token);
    return res;
  } catch (err) {
    logError("AUTH", err, { route: "POST /api/auth/register-code" });
    return NextResponse.json(
      { error: "REGISTRATION_FAILED", message: "Error al registrarse." },
      { status: 500 },
    );
  }
}
