import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Detectar estado del usuario
function detectUserState(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("no sé") ||
    lowerMessage.includes("no entiendo") ||
    lowerMessage.includes("confundido") ||
    lowerMessage.includes("perdido")
  ) {
    return "perdido";
  }

  if (
    lowerMessage.includes("ansiedad") ||
    lowerMessage.includes("ansioso") ||
    lowerMessage.includes("pánico") ||
    lowerMessage.includes("miedo") ||
    lowerMessage.includes("nervioso")
  ) {
    return "ansioso";
  }

  if (
    lowerMessage.includes("bloqueado") ||
    lowerMessage.includes("atrapado") ||
    lowerMessage.includes("no puedo") ||
    lowerMessage.includes("parálisis") ||
    lowerMessage.includes("estancado")
  ) {
    return "bloqueado";
  }

  return "normal";
}

// Adaptar prompt según estado
function buildPrompt(state: string): string {
  const basePrompt = `Eres un mentor que dice la verdad, no un asistente amable.

Tu prioridad es ayudar a la persona a entender qué le pasa de verdad, aunque incomode.

PROHIBIDO:
- listas de consejos
- tono neutro o amable en exceso
- respuestas genéricas
- explicaciones largas

FORMATO OBLIGATORIO:

1. INTERPRETACIÓN
Describe en pocas líneas qué le está pasando realmente (emocionalmente)

2. VERDAD INCÓMODA
Señala sin suavizar lo que está evitando o el autoengaño

3. ACCIÓN
Da una sola acción concreta y ejecutable hoy

4. PREGUNTA FINAL
Haz una pregunta directa que obligue a decidir

ESTILO:
- directo
- humano
- sin rodeos
- sin quedar bien

Si suena bonito pero no duele un poco, no es válido.`;

  const stateAdaptations: { [key: string]: string } = {
    perdido: `\n\nESTADO DETECTADO: PERDIDO
El usuario no sabe por dónde empezar o se siente desorientado. 
Sé más directo aún: reduce la ambigüedad, da pasos pequeños y concretos.
La acción debe ser específica y ejecutable EN ESTE MOMENTO.`,

    ansioso: `\n\nESTADO DETECTADO: ANSIOSO
El usuario tiene miedo o ansiedad. 
Calma sin ser genérico. Va directo al problema, pero con firmeza en los pasos.
La acción debe ser algo que reduzca el caos mental.`,

    bloqueado: `\n\nESTADO DETECTADO: BLOQUEADO
El usuario se siente atrapado o paralizador.
Quiebra la parálisis con una acción PEQUEÑA pero clara.
Dile explícitamente que no necesita resolver todo hoy, solo dar el primer paso.`,
  };

  return basePrompt + (stateAdaptations[state] || "");
}

export async function POST(req: NextRequest) {
  try {
    // 1. PARSE REQUEST
    console.log("[CHAT] 📨 Petición recibida");
    const { message, userId } = await req.json();
    console.log(`[CHAT] userState=${userId}, msgLen=${message?.length || 0}`);

    // 2. VALIDAR INPUT
    if (!message?.trim() || !userId?.trim()) {
      console.warn("[CHAT] ⚠️ Input incompleto: message o userId vacíos");
      return NextResponse.json(
        { 
          reply: "Error: message y userId son requeridos",
          error: "INVALID_INPUT"
        }, 
        { status: 400 }
      );
    }

    // 3. VALIDAR API KEY
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("[CHAT] 🔑 OPENROUTER_API_KEY no definida");
      return NextResponse.json(
        { 
          reply: "Error: servidor no configurado (falta API key)",
          error: "MISSING_API_KEY"
        },
        { status: 501 }
      );
    }

    // 4. DETECTAR ESTADO
    const userState = detectUserState(message);
    console.log(`[CHAT] 🎯 Estado detectado: ${userState}`);

    // 5. GUARDAR ESTADO EN DB (CON FALLBACK)
    try {
      console.log(`[CHAT] 💾 Guardando UserState en DB...`);
      await prisma.userState.upsert({
        where: { userId },
        update: { state: userState, updatedAt: new Date() },
        create: { userId, state: userState },
      });
      console.log(`[CHAT] ✅ UserState guardado`);
    } catch (dbError: any) {
      console.warn(`[CHAT] ⚠️ DB error (no crítico): ${dbError.code || dbError.message}`);
      // NO fallar aquí - continuar sin persistencia
    }

    // 6. ADAPTAR RESPUESTA SEGÚN ESTADO
    const adaptedPrompt = buildPrompt(userState);
    console.log(`[CHAT] 🧠 Prompt construido (${adaptedPrompt.length} chars)`);

    // 7. LLAMAR A OPENROUTER
    console.log(`[CHAT] 🌐 Llamando OpenRouter...`);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: adaptedPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    console.log(`[CHAT] 📡 OpenRouter responded with status ${response.status}`);

    // 8. VALIDAR RESPUESTA HTTP ANTES DE PARSE
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CHAT] ❌ OpenRouter error: ${response.status} - ${errorText.substring(0, 200)}`);
      return NextResponse.json(
        {
          reply: `Error de API externa (${response.status}). Intenta de nuevo.`,
          error: "OPENROUTER_ERROR",
          statusCode: response.status
        },
        { status: 502 }
      );
    }

    // 9. PARSE JSON CON VALIDACIÓN
    let data;
    try {
      data = await response.json();
      console.log(`[CHAT] ✅ JSON parsed correctamente`);
    } catch (parseError) {
      console.error(`[CHAT] ❌ JSON parse error: ${String(parseError)}`);
      return NextResponse.json(
        {
          reply: "Error: respuesta del servidor no válida",
          error: "JSON_PARSE_ERROR"
        },
        { status: 502 }
      );
    }

    // 10. VALIDAR ESTRUCTURA DE RESPUESTA
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      console.error(`[CHAT] ❌ Respuesta sin contenido: ${JSON.stringify(data).substring(0, 200)}`);
      return NextResponse.json(
        {
          reply: "Error: el modelo no generó respuesta",
          error: "EMPTY_RESPONSE"
        },
        { status: 502 }
      );
    }

    console.log(`[CHAT] ✨ Respuesta generada (${reply.length} chars)`);

    // 11. RETORNAR ÉXITO
    return NextResponse.json({
      ok: true,
      reply,
      state: userState,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error(`[CHAT] 💥 UNHANDLED ERROR: ${error.message}`);
    console.error(error.stack);
    
    return NextResponse.json(
      {
        reply: "Error inesperado en el servidor. Por favor, intenta de nuevo.",
        error: "INTERNAL_ERROR",
        message: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
