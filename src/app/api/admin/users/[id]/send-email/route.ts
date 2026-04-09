import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import { sendUserEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const POST = withRateLimit(
  async function POST(req: NextRequest, ctx: unknown) {
    try {
      const adminAuth = requireAdminPermission(req, "users:send-email");
      if (adminAuth instanceof NextResponse) return adminAuth;

      const { id } = await (ctx as Params).params;
      if (!id) {
        return NextResponse.json(
          { error: "INVALID_USER_ID", message: "User id is required." },
          { status: 400 },
        );
      }

      const body = (await req.json()) as { subject?: string; body?: string };
      const { subject, body: emailBody } = body;

      if (!subject || typeof subject !== "string" || !subject.trim()) {
        return NextResponse.json(
          { error: "MISSING_SUBJECT", message: "Email subject is required." },
          { status: 400 },
        );
      }

      if (!emailBody || typeof emailBody !== "string" || !emailBody.trim()) {
        return NextResponse.json(
          { error: "MISSING_BODY", message: "Email body is required." },
          { status: 400 },
        );
      }

      const prisma = getPrismaClient();

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "USER_NOT_FOUND", message: "No existe ese usuario." },
          { status: 404 },
        );
      }

      // Convert plain text body to simple HTML
      const htmlBody = emailBody
        .split("\n")
        .map((line) => (line.trim() ? `<p>${line}</p>` : "<br/>"))
        .join("\n");

      const sent = await sendUserEmail({
        to: user.email,
        subject: subject.trim(),
        html: htmlBody,
        text: emailBody.trim(),
      });

      if (!sent) {
        logError("ADMIN", new Error("Email send returned false"), {
          route: "POST /api/admin/users/[id]/send-email",
          userId: id,
        });
        return NextResponse.json(
          { error: "EMAIL_SEND_FAILED", message: "No se pudo enviar el email. Revisa la configuración de Resend." },
          { status: 502 },
        );
      }

      logInfo("ADMIN", "admin_email_sent", {
        userId: id,
        to: user.email,
        subject: subject.trim(),
      });

      return NextResponse.json({ success: true, userId: id, to: user.email });
    } catch (error: unknown) {
      logError("ADMIN", error, { route: "POST /api/admin/users/[id]/send-email" });
      return NextResponse.json(
        { error: "EMAIL_SEND_FAILED", message: "Error al enviar el email." },
        { status: 500 },
      );
    }
  },
  { limit: 5 },
);
