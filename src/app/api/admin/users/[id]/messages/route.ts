import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission, resolveAdminAuth } from "@/lib/admin-auth";
import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { sendUserEmail } from "@/lib/email";
import { baseLayout } from "@/lib/email-layout";
import { isSyntheticEmail } from "@/services/user";
import { signTrackingToken } from "@/lib/tracking-token";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const MAX_SUBJECT = 180;
const MAX_BODY = 8000;

function sanitize(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, max);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailHtml(params: {
  subject: string;
  body: string;
  trackingPixelUrl?: string;
  openUrl: string;
}): string {
  const paragraphs = params.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const trackingPixel = params.trackingPixelUrl
    ? `<img src="${params.trackingPixelUrl}" alt="" width="1" height="1" style="display:none;"/>`
    : "";
  const composedBody = `
            <p style="margin:0 0 8px;font-size:13px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Mensaje del equipo</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111;line-height:1.3;letter-spacing:-0.3px">${escapeHtml(params.subject)}</h1>
            ${paragraphs}
            ${trackingPixel}`;
  return baseLayout({
    theme: "light",
    header: "branded",
    footer: "product",
    body: composedBody,
    cta: { href: params.openUrl, label: "Ver en la app" },
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const adminAuth = requireAdminPermission(req, "users:write");
    if (adminAuth instanceof NextResponse) return adminAuth;
    const auth = resolveAdminAuth(req);

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const subject = sanitize(body?.subject, MAX_SUBJECT);
    const content = sanitize(body?.body, MAX_BODY);
    const sendEmail = body?.sendEmail !== false;

    if (!subject || !content) {
      return NextResponse.json(
        { error: "MISSING_FIELDS", message: "Asunto y cuerpo son obligatorios." },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const canEmail =
      sendEmail &&
      !!user.email &&
      !isSyntheticEmail(user.email);
    const channels = canEmail ? "in_app,email" : "in_app";

    const message = await prisma.adminMessage.create({
      data: {
        userId: id,
        createdByAdmin: auth.adminId ?? null,
        subject,
        body: content,
        channels,
      },
      select: { id: true },
    });

    const notification = await prisma.notification
      .create({
        data: {
          userId: id,
          title: subject,
          body: content.slice(0, 280),
          url: `/app/mensajes/${message.id}`,
          icon: "✉️",
          channel: "admin",
        },
        select: { id: true },
      })
      .catch((err) => {
        logError("admin.messages", "notification_create_failed", { message: (err as Error)?.message });
        return null;
      });

    let emailOk = true;
    if (canEmail) {
      const baseUrl = process.env.APP_BASE_URL?.trim() ?? "https://tresmilmillonesdelatidos.es";
      const html = renderEmailHtml({
        subject,
        body: content,
        trackingPixelUrl: `${baseUrl}/api/admin-message/${message.id}/track?t=${encodeURIComponent(signTrackingToken(message.id))}`,
        openUrl: `${baseUrl}/app/mensajes/${message.id}`,
      });
      const text = `${subject}\n\n${content}\n\nAbrir en la app: ${baseUrl}/app/mensajes/${message.id}`;
      emailOk = await sendUserEmail({
        to: user.email,
        subject,
        html,
        text,
        userId: id,
        template: "admin_message",
      });
    }

    const delivered = (notification !== null) && (!canEmail || emailOk);
    await prisma.adminMessage.update({
      where: { id: message.id },
      data: {
        notificationId: notification?.id ?? null,
        deliveredAt: delivered ? new Date() : null,
      },
    });

    audit({
      actorId: auth.adminId ?? "unknown",
      actorType: "admin",
      action: "create",
      resource: "AdminMessage",
      resourceId: message.id,
      metadata: { userId: id, channels, emailOk, notificationCreated: notification !== null },
    });

    logInfo("admin.messages", "sent", {
      messageId: message.id,
      userId: id,
      channels,
      delivered,
    });

    return NextResponse.json({
      ok: true,
      id: message.id,
      delivered,
      channels: channels.split(","),
    });
  } catch (error) {
    logError("admin.messages", "send_failed", { message: (error as Error)?.message });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const adminAuth = requireAdminPermission(req, "users:read");
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });

    const prisma = getPrismaClient();
    const messages = await prisma.adminMessage.findMany({
      where: { userId: id },
      orderBy: { sentAt: "desc" },
      take: 50,
      select: {
        id: true,
        subject: true,
        body: true,
        channels: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        createdByAdmin: true,
      },
    });

    return NextResponse.json({
      items: messages.map((m) => ({
        id: m.id,
        subject: m.subject,
        body: m.body,
        channels: m.channels.split(","),
        sentAt: m.sentAt.toISOString(),
        deliveredAt: m.deliveredAt?.toISOString() ?? null,
        readAt: m.readAt?.toISOString() ?? null,
        createdByAdmin: m.createdByAdmin,
      })),
    });
  } catch (error) {
    logError("admin.messages", "list_failed", { message: (error as Error)?.message });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
