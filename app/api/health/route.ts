import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  console.log("[HEALTH] 🏥 Diagnostico de sistema");
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    },
    database: {
      status: "checking...",
      error: null as string | null,
    },
  };

  // Verificar DB
  try {
    console.log("[HH] 🔗 Intentando conexión a DB...");
    const result = await prisma.$queryRaw`SELECT 1`;
    diagnostics.database.status = "✅ CONNECTED";
    console.log("[HEALTH] ✅ DB OK");
  } catch (error: any) {
    diagnostics.database.status = "❌ FAILED";
    diagnostics.database.error = error.message || String(error);
    console.error(`[HEALTH] ❌ DB ERROR: ${error.code || error.message}`);
  }

  const allGood = 
    diagnostics.environment.hasOpenRouterKey &&
    diagnostics.environment.hasDatabaseUrl &&
    diagnostics.database.status.includes("✅");

  return NextResponse.json({
    ...diagnostics,
    ready: allGood,
    statusCode: allGood ? 200 : 503,
  }, {
    status: allGood ? 200 : 503,
  });
}
