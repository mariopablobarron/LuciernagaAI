import { type NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { getBalance, getTransactions, spendLatidos, type LatidoReason } from "@/services/latidos";

export const dynamic = "force-dynamic";

// GET /api/user/latidos — balance + recent transactions
export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const [balance, transactions] = await Promise.all([
      getBalance(identity.userId),
      getTransactions(identity.userId, 30),
    ]);
    return NextResponse.json({ balance, transactions });
  } catch (e) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/user/latidos — spend latidos
export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    const body = (await req.json().catch(() => null)) as {
      action?: string;
      amount?: number;
      meta?: string;
    } | null;

    if (!body?.action || !body.amount || body.amount <= 0) {
      return NextResponse.json({ error: "action y amount requeridos" }, { status: 400 });
    }

    const validActions = ["spend_unlock", "spend_gift", "spend_theme", "spend_session"];
    if (!validActions.includes(body.action)) {
      return NextResponse.json({ error: "Accion no valida" }, { status: 400 });
    }

    const newBalance = await spendLatidos(
      identity.userId,
      body.amount,
      body.action as LatidoReason,
      body.meta,
    );

    return NextResponse.json({ ok: true, balance: newBalance });
  } catch (e) {
    if (e instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "INSUFFICIENT_LATIDOS") {
      return NextResponse.json({ error: "No tienes suficientes latidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
