import { NextRequest, NextResponse } from "next/server";
import { sendAlert } from "@/lib/alerts";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { type, title, message, metric, value } = await req.json();

    if (!title || !message) {
      return NextResponse.json(
        { error: "title y message required" },
        { status: 400 }
      );
    }

    await sendAlert({
      type: type || "info",
      title,
      message,
      metric,
      value,
    });

    return NextResponse.json({
      ok: true,
      message: "Alert sent to Telegram and Email",
    });
  } catch (error) {
    logError("ALERTS", error, { route: "/api/alerts" });
    return NextResponse.json(
      { error: "Error sending alert" },
      { status: 500 }
    );
  }
}
