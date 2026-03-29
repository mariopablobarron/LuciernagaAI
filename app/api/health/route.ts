import { NextResponse } from "next/server";

export async function GET() {
  console.log("[HEALTH] 🏥 Diagnostico de sistema");
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    },
    server: {
      status: "✅ RUNNING",
      version: "v3",
    },
  };

  const allGood = 
    diagnostics.environment.hasOpenRouterKey &&
    diagnostics.environment.hasDatabaseUrl;

  return NextResponse.json({
    ...diagnostics,
    ready: allGood,
    statusCode: allGood ? 200 : 503,
  }, {
    status: allGood ? 200 : 503,
  });
}
