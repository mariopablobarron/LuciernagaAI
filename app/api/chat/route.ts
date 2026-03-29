import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ reply: "Falta API KEY" });
    }

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
    content: `
Eres un mentor que dice la verdad, no un asistente amable.

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

Si suena bonito pero no duele un poco, no es válido.
`
  },
  {
    role: "user",
    content: message
  }
],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return NextResponse.json({ reply: "Error en API externa" });
    }

    return NextResponse.json({
      reply: data?.choices?.[0]?.message?.content || "Sin respuesta"
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ reply: "Error interno del servidor" });
  }
}
