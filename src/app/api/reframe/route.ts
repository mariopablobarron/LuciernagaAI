import { NextRequest, NextResponse } from "next/server";
import { resolveIdentity, InvalidSessionTokenError } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { getOpenRouterChatUrl, getOpenRouterHeaders } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Eres un espejo que muestra lo que la persona no ve.
Tu trabajo: reformular lo que el usuario dice para revelar lo que hay detrás.

Reglas:
- Máximo 2 frases.
- No des consejos. No digas qué hacer.
- Solo refleja lo que no están viendo: el patrón, la creencia, lo que protegen, lo que han normalizado.
- Sé directo pero no cruel.
- Responde en español.

Ejemplo:
Input: "Llevo semanas sin avanzar con el proyecto"
Output: "No es que no puedas avanzar. Es que cada vez que te sientas a hacerlo, hay algo que te dice que no va a ser suficiente. Y ese miedo a que no sea perfecto te mantiene quieto."`;

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    if (!identity?.userId) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }

    const body = (await req.json()) as { text?: string };
    const text = body.text?.trim();
    if (!text || text.length > 500) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }

    const res = await fetch(getOpenRouterChatUrl(), {
      method: "POST",
      headers: {
        ...getOpenRouterHeaders(apiKey, { feature: "reframe" }),
        "HTTP-Referer": process.env.APP_BASE_URL ?? "https://tresmilmillonesdelatidos.es",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-6",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        max_tokens: 200,
        temperature: 0.6,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      logError("REFRAME", new Error(`OpenRouter ${res.status}`), { body: errBody.slice(0, 200) });
      return NextResponse.json({ error: "AI_ERROR" }, { status: 502 });
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reframed = data.choices?.[0]?.message?.content?.trim();

    if (!reframed) {
      return NextResponse.json({ error: "EMPTY_RESPONSE" }, { status: 502 });
    }

    return NextResponse.json({ success: true, reframed });
  } catch (error) {
    if (error instanceof InvalidSessionTokenError) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }
    logError("REFRAME", error, { route: "/api/reframe" });
    return NextResponse.json({ error: "REFRAME_FAILED" }, { status: 500 });
  }
}
