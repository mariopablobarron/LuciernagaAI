#!/usr/bin/env node
/**
 * Reset password de un AdminUser (típicamente el superadmin).
 *
 * El seed `scripts/seed-superadmin.mjs` crea el superadmin la PRIMERA vez
 * y después es idempotente — si ya existe, NO toca la password aunque
 * cambies ADMIN_PASSWORD en `.env-vars`. Esto provoca "credenciales
 * inválidas" silenciosas cuando rotas el secret.
 *
 * Este script hace EXACTAMENTE lo que el seed haría con la password actual
 * del env, pero forzando UPDATE en BD. Mismo algoritmo de hash (scrypt
 * con KEYLEN=64) que `seed-superadmin.mjs` y `src/lib/password.ts`.
 *
 * Uso típico — desde dentro del container en VPS:
 *   docker exec luciernaga-ai node scripts/reset-superadmin-password.mjs
 *
 * Por defecto resetea `admin@admin.local` con la password de ADMIN_PASSWORD.
 * Para resetear otro usuario o usar otra password:
 *   ADMIN_EMAIL=foo@bar.com ADMIN_PASSWORD=NewPass docker exec ...
 *
 * Idempotencia: si la password actual del usuario YA coincide con la
 * del env, no hace UPDATE (skip). Devuelve exit 0 con mensaje claro.
 *
 * Logs: imprime email afectado + 'updated' | 'noop' | 'not-found'. No
 * imprime la password ni el hash (PII / opsec básico).
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

async function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(plain, salt, KEYLEN);
  return `${salt}:${derived.toString("hex")}`;
}

/**
 * Verifica una password contra un hash "salt:derived" (mismo formato que
 * el seed). Timing-safe para evitar timing attacks.
 */
async function verifyPassword(plain, stored) {
  if (typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const derived = await scryptAsync(plain, salt, expected.length);
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const email = process.env.ADMIN_EMAIL?.trim()
    || `${process.env.ADMIN_USERNAME?.trim() || "admin"}@admin.local`;
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!password) {
    console.error("ADMIN_PASSWORD is required (set it in .env-vars or pass inline)");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString, min: 1, max: 5 });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user) {
      console.log(JSON.stringify({ email, result: "not-found" }));
      process.exit(2);
    }

    // Idempotencia: ¿la password actual ya coincide?
    const alreadyMatches = await verifyPassword(password, user.passwordHash);
    if (alreadyMatches) {
      console.log(JSON.stringify({ email, role: user.role, result: "noop" }));
      return;
    }

    const newHash = await hashPassword(password);
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: newHash, updatedAt: new Date() },
    });
    console.log(JSON.stringify({ email, role: user.role, result: "updated" }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
