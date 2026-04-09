#!/usr/bin/env node
/**
 * Seed script: creates the first superadmin in the AdminUser table
 * using the current ADMIN_USERNAME / ADMIN_PASSWORD env vars.
 *
 * Usage:
 *   node scripts/seed-superadmin.mjs
 *
 * Idempotent — skips if a superadmin already exists.
 * Works in both Docker (env vars injected) and local dev (reads .env).
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

async function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(plain, salt, KEYLEN);
  return `${salt}:${derived.toString("hex")}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const email = process.env.ADMIN_EMAIL?.trim() || `${process.env.ADMIN_USERNAME?.trim() || "admin"}@admin.local`;
  const name = process.env.ADMIN_USERNAME?.trim() || "admin";
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!password) {
    console.error("ADMIN_PASSWORD is required");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString, min: 1, max: 5 });
  const prisma = new PrismaClient({ adapter });

  try {
    // Check if any superadmin exists
    const existing = await prisma.adminUser.findFirst({
      where: { role: "superadmin" },
    });

    if (existing) {
      console.log(`Superadmin already exists: ${existing.email} (${existing.name})`);
      console.log("Skipping seed.");
      return;
    }

    // Check email collision
    const byEmail = await prisma.adminUser.findUnique({ where: { email } });
    if (byEmail) {
      console.log(`AdminUser with email ${email} already exists (role: ${byEmail.role}). Promoting to superadmin.`);
      await prisma.adminUser.update({
        where: { id: byEmail.id },
        data: { role: "superadmin" },
      });
      console.log("Done — promoted to superadmin.");
      return;
    }

    const passwordHash = await hashPassword(password);
    const admin = await prisma.adminUser.create({
      data: { email, name, role: "superadmin", passwordHash },
    });

    console.log(`Superadmin created:`);
    console.log(`  ID:    ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name:  ${admin.name}`);
    console.log(`  Role:  superadmin`);
    console.log("");
    console.log("You can now log in with these credentials in the admin panel.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
