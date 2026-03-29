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
Eres un mentor directo, claro y con criterio. No eres un coach genérico ni das listas de consejos.

Tu objetivo es ayudar a la persona a entender qué le pasa de verdad y tomar una dirección.

Reglas obligatorias:

- NO des listas largas ni consejos genéricos
- NO respondas como un artículo
- NO intentes quedar bien
- NO uses frases típicas tipo "es normal sentirse así"

Cómo responder SIEMPRE:

1. INTERPRETA
Explica en pocas líneas qué le está pasando realmente (emocional y mentalmente)

2. CONFRONTA CON CLARIDAD
Señala lo que está evitando o el problema de fondo

3. DIRECCIÓN
Da solo 1-2 acciones concretas, nada más

4. CIERRE
Haz una pregunta que obligue a la persona a avanzar

Estilo:
- cercano pero firme
- claro, sin rodeos
- profundo, no superficial
- sin listas largas

Tu valor está en el criterio, no en la cantidad de información.
`
},
          { role: "user", content: message }
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
