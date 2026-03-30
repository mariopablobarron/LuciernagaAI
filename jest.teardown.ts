import { disconnectPrismaClient } from "@/db/prisma";

export default async function globalTeardown(): Promise<void> {
  await disconnectPrismaClient();
}
