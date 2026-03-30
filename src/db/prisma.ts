import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    const adapter = new PrismaPg({ connectionString });
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });
  }

  return globalForPrisma.prisma;
}

export function getExistingPrismaClient(): PrismaClient | undefined {
  return globalForPrisma.prisma;
}

export async function disconnectPrismaClient(): Promise<void> {
  if (!globalForPrisma.prisma) {
    return;
  }

  await globalForPrisma.prisma.$disconnect();
  delete globalForPrisma.prisma;
}
