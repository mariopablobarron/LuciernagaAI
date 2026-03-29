import { NextResponse } from "next/server";

export async function GET() {
  console.log("[HEALTH] 🏥 Diagnostico de sistema");
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      isProd: process.env.NODE_ENV === "production",
    },
    server: {
      status: "✅ RUNNING",
      version: "v3",
      uptime: process.uptime(),
    },
    dependencies: {
      openrouter: process.env.OPENROUTER_API_KEY ? "✅" : "⚠️ MISSING",
      database: process.env.DATABASE_URL ? "✅" : "⏭️ Optional",
    },
  };

  // In production, we only require OpenRouter key
  const isHealthy = process.env.NODE_ENV === "production" 
    ? !!process.env.OPENROUTER_API_KEY
    : true;

  return NextResponse.json({
    ...diagnostics,
    ready: isHealthy,
    statusCode: isHealthy ? 200 : 503,
  }, {
    status: isHealthy ? 200 : 503,
  });
}
