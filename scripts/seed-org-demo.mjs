#!/usr/bin/env node
/**
 * Seed script: Create a demo organization with HR and therapist admins.
 *
 * Usage: node scripts/seed-org-demo.mjs
 * Requires DATABASE_URL in .env
 */

import { createHmac } from "crypto";
import { config } from "dotenv";
config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

function hashPassword(password) {
  return createHmac("sha256", "org-admin-salt").update(password).digest("hex");
}

async function seed() {
  // Dynamic import of Prisma
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // 1. Create organization
    const org = await prisma.organization.upsert({
      where: { slug: "demo-corp" },
      update: {},
      create: {
        name: "Demo Corp",
        slug: "demo-corp",
        type: "company",
        plan: "team",
        maxUsers: 50,
        contactName: "Admin Demo",
        contactEmail: "admin@demo-corp.com",
      },
    });
    console.log(`Organization: ${org.name} (${org.id})`);

    // 2. Create HR admin
    const hr = await prisma.orgAdmin.upsert({
      where: { organizationId_email: { organizationId: org.id, email: "hr@demo-corp.com" } },
      update: {},
      create: {
        organizationId: org.id,
        email: "hr@demo-corp.com",
        name: "María García (HR)",
        role: "hr",
        passwordHash: hashPassword("demo1234"),
      },
    });
    console.log(`HR Admin: ${hr.email} (password: demo1234)`);

    // 3. Create therapist admin
    const therapist = await prisma.orgAdmin.upsert({
      where: { organizationId_email: { organizationId: org.id, email: "psico@demo-corp.com" } },
      update: {},
      create: {
        organizationId: org.id,
        email: "psico@demo-corp.com",
        name: "Dr. López (Terapeuta)",
        role: "therapist",
        passwordHash: hashPassword("demo1234"),
      },
    });
    console.log(`Therapist: ${therapist.email} (password: demo1234)`);

    // 4. Assign existing users to the org (first 10)
    const users = await prisma.user.findMany({
      where: { organizationId: null },
      select: { id: true, email: true },
      take: 10,
    });

    if (users.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: users.map((u) => u.id) } },
        data: { organizationId: org.id },
      });
      console.log(`Assigned ${users.length} users to ${org.name}`);
    }

    console.log("\n--- Demo Setup Complete ---");
    console.log(`\nLogin at /org/login with:`);
    console.log(`  Org slug: demo-corp`);
    console.log(`  HR:       hr@demo-corp.com / demo1234`);
    console.log(`  Therapist: psico@demo-corp.com / demo1234`);
  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
