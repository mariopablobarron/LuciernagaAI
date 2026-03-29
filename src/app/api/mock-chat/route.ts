import { NextRequest, NextResponse } from "next/server";
import { detectUserState } from "@/lib/user-state";

/**
 * Endpoint de testing/desarrollo
 * Simula respuestas del mentor sin necesidad de BD ni OpenRouter
 * Úsalo agregando ?mock=true a la petición
 */

const mockResponses: { [key: string]: string } = {
  perdido: `Te sientes atrapado en la indefinición. Aquí está lo que veo:

**LO QUE REALMENTE TE PASA:**
Saliste de algo estructurado (universidad) y ahora tienes infinitas opciones. Eso que se llama "libertad" se siente como vértigo.

**LA VERDAD INCÓMODA:**
No es que no sepas qué hacer. Es que tienes miedo de elegir mal. Esperas una respuesta "correcta" que no existe.

**ACCIÓN DE HOY:**
Pick 3 cosas que te atrae hacer (no importa si son realistas). Mañana elige 1. Ese es tu siguiente paso.

**PREGUNTA FINAL:**
¿Cuál de las 3 elegirías si supieras que no puede estar mal?`,

  ansioso: `Detecto el pánico. Vamos a desarmarlo:

**LO QUE REALMENTE TE PASA:**
El ruido está bloquenando el pensamiento claro. Tu mente está saltando entre 10 escenarios diferentes, todos malos.

**LA VERDAD INCÓMODA:**
Cuando todo se siente urgente, nada es realmente.
Debes frenar para ver qué importa.

**ACCIÓN DE HOY:**
Escribe 3 cosas que te asustan. Luego marca cuál es la ÚNICA que puedes controlar hoy. Haz solo eso.

**PREGUNTA FINAL:**
Si solo pudiera suceder UNA cosa hoy, ¿cuál sería y por qué?`,

  bloqueado: `Estás congelado. La parálisis es real, pero es más pequeña de lo que sientes.

**LO QUE REALMENTE TE PASA:**
Ves la montaña completa y pensaste que necesitas escalarla hoy. Por eso no estás subiendo.

**LA VERDAD INCÓMODA:**
No necesitas resolver todo. Necesitas 1 paso. Uno solo.

**ACCIÓN DE HOY:**
Haz algo tan pequeño que sea casi tonto. Una llamada. Una email. 15 minutos de trabajo. No importa qué. Quiebra solo la parálisis.

**PREGUNTA FINAL:**
¿Cuál es la acción más PEQUEÑA que podrías hacer en los próximos 30 minutos?`,

  normal: `Hola, estoy aquí para ayudarte a ver claro.

Cuéntame más:
- ¿Qué te duele exactamente?
- ¿Qué hace que no puedas avanzar?
- ¿Qué necesitas entender?

No les falles a los detalles.`,
};

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    const state = detectUserState(message || "");

    console.log(`[MOCK] 🎭 Estado: ${state}, userId: ${userId}`);

    return NextResponse.json({
      ok: true,
      reply: mockResponses[state] || mockResponses.normal,
      state,
      mock: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : "Unknown error";
    console.error("[MOCK] Error:", error);
    return NextResponse.json(
      { error: "Error en mock", details },
      { status: 500 }
    );
  }
}
