import { getPrismaClient } from "@/db/prisma";
import { ensureUserAccount } from "@/services/user";

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

const DEFAULT_CONVERSATION_TITLE = "Nueva conversación";

function normalizeRole(role: string): "user" | "assistant" {
  return role === "assistant" ? "assistant" : "user";
}

export function buildConversationTitle(input: string): string {
  const value = input.trim();
  if (!value) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  return value.length > 48 ? `${value.slice(0, 48)}...` : value;
}

export async function ensureUserSession(userId: string): Promise<void> {
  await ensureUserAccount(userId);
}

export async function createConversationForUser(
  userId: string,
  title?: string
): Promise<{ id: string; title: string; createdAt: Date; updatedAt: Date }> {
  const prisma = getPrismaClient();
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: buildConversationTitle(title ?? ""),
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return conversation;
}

export async function getConversationByIdForUser(
  conversationId: string,
  userId: string
): Promise<{ id: string; title: string; createdAt: Date; updatedAt: Date } | null> {
  const prisma = getPrismaClient();
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function resolveConversationForUser(
  userId: string,
  requestedConversationId: string | undefined,
  firstMessage: string
): Promise<{ id: string; title: string; createdAt: Date; updatedAt: Date }> {
  if (requestedConversationId?.trim()) {
    const existing = await getConversationByIdForUser(requestedConversationId, userId);
    if (existing) {
      return existing;
    }
  }

  return createConversationForUser(userId, firstMessage);
}

export async function saveConversationMessage(params: {
  conversationId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  updateTitleFromUserMessage?: boolean;
}): Promise<void> {
  const prisma = getPrismaClient();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        conversationId: params.conversationId,
        userId: params.userId,
        role: params.role,
        content: params.content,
      },
    });

    const updateData: { updatedAt: Date; title?: string } = { updatedAt: now };
    if (params.updateTitleFromUserMessage && params.role === "user") {
      updateData.title = buildConversationTitle(params.content);
    }

    await tx.conversation.update({
      where: { id: params.conversationId },
      data: updateData,
    });
  });
}

export async function listConversationsForUser(userId: string): Promise<ConversationSummary[]> {
  const prisma = getPrismaClient();
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (conversations.length === 0) {
    return [];
  }

  const conversationIds = conversations.map((conversation) => conversation.id);
  const groupedCounts = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversationIds },
      userId,
    },
    _count: { _all: true },
  });

  const countByConversation = new Map<string, number>();
  for (const row of groupedCounts) {
    countByConversation.set(row.conversationId, row._count._all);
  }

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: countByConversation.get(conversation.id) ?? 0,
  }));
}

export async function listMessagesForConversation(params: {
  userId: string;
  conversationId: string;
}): Promise<ConversationMessage[] | null> {
  const prisma = getPrismaClient();
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.conversationId,
      userId: params.userId,
    },
    select: { id: true },
  });

  if (!conversation) {
    return null;
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId: params.conversationId,
      userId: params.userId,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      conversationId: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  return messages.map((message) => ({
    id: message.id,
    conversationId: message.conversationId,
    role: normalizeRole(message.role),
    content: message.content,
    createdAt: message.createdAt,
  }));
}

export async function listRecentUserMessagesForUser(
  userId: string,
  limit = 12
): Promise<string[]> {
  const prisma = getPrismaClient();
  const messages = await prisma.message.findMany({
    where: {
      userId,
      role: "user",
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, limit),
    select: {
      content: true,
    },
  });

  return messages.map((message) => message.content).reverse();
}

export async function countMessagesForConversation(conversationId: string): Promise<number> {
  const prisma = getPrismaClient();

  return prisma.message.count({
    where: {
      conversationId,
    },
  });
}
