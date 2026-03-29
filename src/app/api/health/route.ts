import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      status: "ok",
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "ok",
        openrouter: false,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
