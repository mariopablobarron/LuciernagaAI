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
    const { message } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ reply: "Falta API KEY" });
    }

    // 1. DETECTAR ESTADO
    const userState = detectUserState(message);

    // 2. GUARDAR ESTADO EN DB
    const sessionId = `session-${Date.now()}`;
    await prisma.userState.upsert({
      where: { userId: sessionId },
      update: { state: userState, updatedAt: new Date() },
      create: { userId: sessionId, state: userState },
    });

    // 3. ADAPTAR RESPUESTA SEGÚN ESTADO
    const adaptedPrompt = buildPrompt(userState);

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

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return NextResponse.json({ reply: "Error en API externa" });
    }

    return NextResponse.json({
      reply: data?.choices?.[0]?.message?.content || "Sin respuesta",
      state: userState,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ reply: "Error interno del servidor" });
  }
}
