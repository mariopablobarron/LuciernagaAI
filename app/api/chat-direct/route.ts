import { NextRequest, NextResponse } from "next/server";

function detectUserState(message: string): string {
  const lowerMessage = message.toLowerCase();
  if (
    lowerMessage.includes("no sé") ||
    lowerMessage.includes("confund") ||
    lowerMessage.includes("perdido")
  ) {
    return "perdido";
  }
  if (
    lowerMessage.includes("ansied") ||
    lowerMessage.includes("miedo") ||
    lowerMessage.includes("pánico")
  ) {
    return "ansioso";
  }
  if (
    lowerMessage.includes("bloqueado") ||
    lowerMessage.includes("parálisis") ||
    lowerMessage.includes("estancado")
  ) {
    return "bloqueado";
  }
  return "normal";
}

// Prompts confrontacionales - Sin filtros
const prompts: { [key: string]: string } = {
  perdido: `Acabas de salir de un sistema estructurado (uni, trabajo) y ahora tienes libertad absoluta.
Eso es aterrador. Así que tu cerebro está paralizado.

NO VOY A DECIRTE QUÉ HACER.

Voy a preguntarte qué INTENTAS evitar decidiendo.

Porque ese es el miedo real: no es "no sé qué hacer".
Es "si elijo mal, fallo".

Así que primero: ¿Qué te pasaría si eliges mal?
No es necesario que encuentres la respuesta perfecta hoy.
Necesitas elegir CUALQUIER cosa y ver qué pasa.

¿Cuál es UNA cosa que podrías intentar esta semana sin que tu vida explote?`,

  ansioso: `El pánico está en el futuro que estás inventando ahora.
No en lo que está pasando.

Tú no tienes miedo de X.
Tienes miedo de lo que SIGNIFICARÍA X.

Ej: "Tengo ansiedad por tomar una decisión"
= Realmente: "Si decido mal, me juzgaré"

Así que pregunta real:
¿Cuál es la conclusión terrible que tomaste si esto sale mal?

Y luego: ¿Es eso verdad o es lo que tu cerebro ASUME que es verdad?

Una acción: Escribe esa conclusión horrible.
Luego escribe: "¿Es esto definitivamente verdad? ¿O es una posibilidad?"

Eso quiebra el pánico.`,

  bloqueado: `Estás congelado.
Pero no por falta de capacidad.
Por perfeccionismo disfrazado de parálisis.

"No puedo avanzar hasta que esté bien"
= "No puedo fallar"
= "Estoy esperando un momento que nunca llega"

La verdad: El momento nunca llega.
La solución: Empieza mal.

Una acción concreta (tan simple que duele):
- Si es trabajo: envía UNA frase del email, no el perfecto
- Si es relación: envía UNA frase, aunque suene rara
- Si es decisión: elige UNA opción por 48 horas y vive con ella

La parálisis vive en la indecisión.
Muere en la acción pequeña.

¿Cuál es lo PEOR que podría pasar si haces esto mal?
(La mayoría de veces descubrirás: casi nada)`,

  normal: `Estoy aquí para ayudarte a ver claro.

Cuéntame:
- ¿Qué te duele exactamente?
- ¿Qué hace que no puedas avanzar?
- ¿Qué necesitas entender?

No me des la versión bonita. Dame la verdad.`,
};

export async function POST(req: NextRequest) {
  try {
    console.log("[CHAT-DIRECT] 📨 Petición recibida");

    const { message, userId } = await req.json();

    if (!message?.trim() || !userId?.trim()) {
      console.warn("[CHAT-DIRECT] ⚠️ Input vacío");
      return NextResponse.json(
        { reply: "Necesito que me cuentes qué te pasa", error: "EMPTY_INPUT" },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.error("[CHAT-DIRECT] 🔑 OPENROUTER_API_KEY falta");
      return NextResponse.json(
        { reply: "Error: servidor no configurado", error: "NO_API_KEY" },
        { status: 501 }
      );
    }

    // Detectar estado
    const state = detectUserState(message);
    console.log(`[CHAT-DIRECT] 🎯 Estado detectado: ${state}`);

    // Llamar OpenRouter directamente
    console.log(`[CHAT-DIRECT] 🌐 Llamando OpenRouter...`);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Luciernaga",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: prompts[state] || prompts.normal,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.9,
        max_tokens: 500,
      }),
    });

    console.log(`[CHAT-DIRECT] 📡 OpenRouter status: ${response.status}`);

    // Validar HTTP ANTES de parse
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[CHAT-DIRECT] ❌ OpenRouter error: ${response.status}`
      );
      return NextResponse.json(
        {
          reply: `Error ${response.status}: ${errorText.substring(0, 100)}`,
          error: "OPENROUTER_ERROR",
          state,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error(`[CHAT-DIRECT] ❌ Sin contenido en respuesta`);
      return NextResponse.json(
        {
          reply: "No obtuve respuesta. Intenta de nuevo.",
          error: "EMPTY_RESPONSE",
          state,
        },
        { status: 502 }
      );
    }

    console.log(`[CHAT-DIRECT] ✨ Éxito (${reply.length} chars)`);

    return NextResponse.json({
      ok: true,
      reply,
      state,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`[CHAT-DIRECT] 💥 Error:`, error.message);
    return NextResponse.json(
      {
        reply: "Error interno. Por favor intenta de nuevo.",
        error: "INTERNAL_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
