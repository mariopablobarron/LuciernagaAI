import { getPrismaClient } from "@/db/prisma";

const fmt = (d: Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })
    : "—";

const escape = (s: string) => s.replace(/[*_`\[\]()]/g, (c) => `\\${c}`);

export async function buildUserSearchMessage(query: string): Promise<string> {
  const q = query.trim();
  if (!q) {
    return "Uso: `/buscar <email_o_id>`\nEjemplo: `/buscar maria@ejemplo.com`";
  }

  const prisma = getPrismaClient();

  const user = await prisma.user.findFirst({
    where: q.includes("@")
      ? { email: { equals: q, mode: "insensitive" } }
      : { OR: [{ id: q }, { telegramId: q }] },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      lastSeen: true,
      lastMessageAt: true,
      messageCount: true,
      stripeCustomerId: true,
      telegramId: true,
      _count: { select: { conversations: true } },
    },
  });

  if (!user) {
    return `🔍 Sin resultados para \`${escape(q)}\``;
  }

  const [activeSub, state] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: user.id, status: "active" },
      select: { plan: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }),
    prisma.userState.findUnique({
      where: { userId: user.id },
      select: { state: true, systemState: true, crisisActive: true },
    }),
  ]);

  const lines = [
    `👤 *${escape(user.name ?? "(sin nombre)")}*`,
    `\`${user.id}\``,
    "",
    `📧 ${escape(user.email)} ${user.emailVerified ? "✓" : "(sin verificar)"}`,
    user.telegramId ? `📱 Telegram: \`${user.telegramId}\`` : null,
    `Rol: ${user.role} · Activo: ${user.isActive ? "sí" : "no"}`,
    "",
    `Alta: ${fmt(user.createdAt)}`,
    `Último visto: ${fmt(user.lastSeen)}`,
    `Último mensaje: ${fmt(user.lastMessageAt)}`,
    `Mensajes: ${user.messageCount} · Conversaciones: ${user._count.conversations}`,
    "",
    activeSub
      ? `💳 Plan: *${activeSub.plan}*${activeSub.cancelAtPeriodEnd ? " (cancela al final)" : ""} → hasta ${fmt(activeSub.currentPeriodEnd)}`
      : `💳 Sin suscripción activa`,
    "",
    state
      ? `🧠 Estado: ${state.state} · Sistema: ${state.systemState}${state.crisisActive ? " · 🚨 CRISIS" : ""}`
      : `🧠 Sin UserState`,
  ].filter(Boolean);

  return lines.join("\n");
}
