import { getPrismaClient } from "@/db/prisma";

export type FutureMessageSnapshot = {
  id: string;
  title: string;
  content: string;
  unlockAt: string;
  deliveredAt: string | null;
  status: string;
  createdAt: string;
};

function serializeFutureMessage(record: {
  id: string;
  title: string;
  content: string;
  unlockAt: Date;
  deliveredAt: Date | null;
  status: string;
  createdAt: Date;
}): FutureMessageSnapshot {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    unlockAt: record.unlockAt.toISOString(),
    deliveredAt: record.deliveredAt?.toISOString() ?? null,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function createFutureMessage(params: {
  userId: string;
  title: string;
  content: string;
  unlockAt: Date;
}): Promise<FutureMessageSnapshot> {
  const prisma = getPrismaClient();
  const message = await prisma.futureMessage.create({
    data: {
      userId: params.userId,
      title: params.title.trim(),
      content: params.content.trim(),
      unlockAt: params.unlockAt,
    },
  });

  return serializeFutureMessage(message);
}

export async function listAvailableFutureMessages(userId: string): Promise<{
  availableMessages: FutureMessageSnapshot[];
  lockedCount: number;
}> {
  const prisma = getPrismaClient();
  const now = new Date();
  const [available, lockedCount] = await Promise.all([
    prisma.futureMessage.findMany({
      where: {
        userId,
        unlockAt: {
          lte: now,
        },
      },
      orderBy: {
        unlockAt: "asc",
      },
    }),
    prisma.futureMessage.count({
      where: {
        userId,
        unlockAt: {
          gt: now,
        },
      },
    }),
  ]);

  const idsToDeliver = available
    .filter((message) => !message.deliveredAt)
    .map((message) => message.id);

  if (idsToDeliver.length > 0) {
    await prisma.futureMessage.updateMany({
      where: {
        id: {
          in: idsToDeliver,
        },
      },
      data: {
        deliveredAt: now,
        status: "available",
      },
    });
  }

  return {
    availableMessages: available.map((message) =>
      serializeFutureMessage({
        ...message,
        deliveredAt: message.deliveredAt ?? (idsToDeliver.includes(message.id) ? now : null),
        status: message.unlockAt <= now ? "available" : message.status,
      })
    ),
    lockedCount,
  };
}
