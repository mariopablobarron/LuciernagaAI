/**
 * OEPS — Open Enneagram of Personality Scales
 * Fuente: https://openpsychometrics.org/tests/OEPS/ (dominio público)
 *
 * 90 ítems en 9 tipos (10 ítems por tipo). Likert 1-5 directo (sin reverse-keyed).
 * Score por tipo = suma de respuestas en sus 10 ítems → rango [10, 50].
 * Tipo dominante = el que tiene mayor score; el wing es el vecino con score
 * más alto entre los dos contiguos en el círculo del eneagrama.
 *
 * Ítems traducidos al español manteniendo el sentido del inventario original.
 * Orden mezclado (no agrupado por tipo) para que el usuario no pueda inferir
 * estructura mientras responde.
 */

export type LikertAnswer = 1 | 2 | 3 | 4 | 5;
export type EnneagramType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type EnneagramItem = {
  /// Identificador estable del ítem (q1..q90); usar éste como clave en el form,
  /// nunca el índice del array, por si reordenamos el orden de presentación.
  id: string;
  /// El tipo al que suma este ítem cuando la respuesta es alta (4-5).
  type: EnneagramType;
  text: string;
};

/**
 * Items en el orden original de OEPS, agrupados por tipo en bloques de 10
 * para mantener la traducción comprobable contra la fuente. La página los
 * presenta MEZCLADOS — ver `getShuffledItems()`.
 */
export const ENNEAGRAM_ITEMS: ReadonlyArray<EnneagramItem> = [
  // Tipo 1 — El reformador / perfeccionista
  { id: "q1",  type: 1, text: "Tengo unos estándares de calidad muy altos." },
  { id: "q2",  type: 1, text: "Suelo notar lo que está mal o fuera de su sitio." },
  { id: "q3",  type: 1, text: "Me cuesta dejar las cosas a medio hacer." },
  { id: "q4",  type: 1, text: "Soy crítico/a conmigo mismo/a la mayor parte del tiempo." },
  { id: "q5",  type: 1, text: "Me parece importante hacer lo correcto, aunque cueste." },
  { id: "q6",  type: 1, text: "Me molesta cuando otros no se esfuerzan." },
  { id: "q7",  type: 1, text: "Tengo un sentido fuerte del deber." },
  { id: "q8",  type: 1, text: "Me cuesta relajarme si hay algo pendiente." },
  { id: "q9",  type: 1, text: "Reviso mi trabajo varias veces para asegurarme." },
  { id: "q10", type: 1, text: "Me preocupa cometer errores delante de otros." },

  // Tipo 2 — El ayudador
  { id: "q11", type: 2, text: "Disfruto cuando puedo ayudar a alguien." },
  { id: "q12", type: 2, text: "A menudo sé qué necesita la gente antes que ellos mismos." },
  { id: "q13", type: 2, text: "Me siento bien cuando me necesitan." },
  { id: "q14", type: 2, text: "Me cuesta pedir ayuda para mí mismo/a." },
  { id: "q15", type: 2, text: "Me importa que la gente cercana se sienta querida." },
  { id: "q16", type: 2, text: "A veces me olvido de mis propias necesidades por las de otros." },
  { id: "q17", type: 2, text: "Me gusta hacer pequeños gestos para que alguien sonría." },
  { id: "q18", type: 2, text: "Me afecta más de lo normal que alguien me ignore." },
  { id: "q19", type: 2, text: "Soy bueno/a notando los sentimientos de otras personas." },
  { id: "q20", type: 2, text: "Doy demasiado y luego me siento agotado/a." },

  // Tipo 3 — El triunfador
  { id: "q21", type: 3, text: "Me motiva conseguir resultados visibles." },
  { id: "q22", type: 3, text: "Me importa la imagen que doy a los demás." },
  { id: "q23", type: 3, text: "Soy competitivo/a por naturaleza." },
  { id: "q24", type: 3, text: "Me adapto rápido a lo que cada situación pide de mí." },
  { id: "q25", type: 3, text: "Disfruto siendo eficiente y productivo/a." },
  { id: "q26", type: 3, text: "Me cuesta parar incluso cuando estoy cansado/a." },
  { id: "q27", type: 3, text: "Me siento incómodo/a cuando fracaso públicamente." },
  { id: "q28", type: 3, text: "Suelo asumir roles de liderazgo." },
  { id: "q29", type: 3, text: "Me importa avanzar en mi carrera o proyectos." },
  { id: "q30", type: 3, text: "Me cuesta mostrarme vulnerable." },

  // Tipo 4 — El individualista
  { id: "q31", type: 4, text: "Me siento diferente a la mayoría de la gente." },
  { id: "q32", type: 4, text: "Tengo una vida emocional muy intensa." },
  { id: "q33", type: 4, text: "Me atraen las cosas con belleza o profundidad." },
  { id: "q34", type: 4, text: "A menudo siento que falta algo en mi vida." },
  { id: "q35", type: 4, text: "Me identifico con la melancolía o la nostalgia." },
  { id: "q36", type: 4, text: "Quiero que mi vida tenga un significado especial." },
  { id: "q37", type: 4, text: "Me cuesta sentirme parte de un grupo." },
  { id: "q38", type: 4, text: "Soy creativo/a o artístico/a en algún ámbito." },
  { id: "q39", type: 4, text: "Mis emociones cambian rápido y con fuerza." },
  { id: "q40", type: 4, text: "Necesito tiempo a solas para reconectar conmigo." },

  // Tipo 5 — El investigador
  { id: "q41", type: 5, text: "Necesito tiempo a solas para recargar." },
  { id: "q42", type: 5, text: "Disfruto investigando temas en profundidad." },
  { id: "q43", type: 5, text: "Prefiero observar antes que participar." },
  { id: "q44", type: 5, text: "Cuido mucho mi energía y a quién se la doy." },
  { id: "q45", type: 5, text: "Me incomodan las exigencias emocionales constantes." },
  { id: "q46", type: 5, text: "Me siento más seguro/a cuando entiendo cómo funciona algo." },
  { id: "q47", type: 5, text: "Reservo mucho de mí para muy pocas personas." },
  { id: "q48", type: 5, text: "No me gusta sentirme intrusivamente observado/a." },
  { id: "q49", type: 5, text: "Antes de actuar, necesito tener información suficiente." },
  { id: "q50", type: 5, text: "Disfruto del silencio y de los espacios tranquilos." },

  // Tipo 6 — El leal / escéptico
  { id: "q51", type: 6, text: "Me preocupa lo que podría salir mal." },
  { id: "q52", type: 6, text: "Soy fiel a las personas y grupos en los que confío." },
  { id: "q53", type: 6, text: "Me cuesta tomar decisiones importantes solo/a." },
  { id: "q54", type: 6, text: "Suelo dudar de mis propias decisiones." },
  { id: "q55", type: 6, text: "Soy más bien precavido/a que arriesgado/a." },
  { id: "q56", type: 6, text: "Necesito sentirme respaldado/a por alguien de confianza." },
  { id: "q57", type: 6, text: "Anticipo problemas para estar preparado/a." },
  { id: "q58", type: 6, text: "Cuestiono las intenciones de los que tienen poder." },
  { id: "q59", type: 6, text: "Me siento más cómodo/a cuando hay reglas claras." },
  { id: "q60", type: 6, text: "Cumplo con lo que prometo." },

  // Tipo 7 — El entusiasta
  { id: "q61", type: 7, text: "Me ilusionan los planes y las posibilidades nuevas." },
  { id: "q62", type: 7, text: "Me cuesta mantener la atención mucho tiempo en una sola cosa." },
  { id: "q63", type: 7, text: "Evito instintivamente el malestar emocional." },
  { id: "q64", type: 7, text: "Tengo muchas ideas y proyectos en marcha." },
  { id: "q65", type: 7, text: "Disfruto mucho las experiencias intensas." },
  { id: "q66", type: 7, text: "Me cuesta comprometerme con una sola opción." },
  { id: "q67", type: 7, text: "Prefiero mirar hacia adelante que rumiar el pasado." },
  { id: "q68", type: 7, text: "Soy optimista incluso en momentos difíciles." },
  { id: "q69", type: 7, text: "Me aburre la rutina prolongada." },
  { id: "q70", type: 7, text: "Suelo improvisar y salir bien parado/a." },

  // Tipo 8 — El desafiador
  { id: "q71", type: 8, text: "No me cuesta tomar el mando si nadie lo hace." },
  { id: "q72", type: 8, text: "Defiendo a quien considero injustamente tratado/a." },
  { id: "q73", type: 8, text: "Digo lo que pienso sin demasiados rodeos." },
  { id: "q74", type: 8, text: "No tolero bien que me digan lo que tengo que hacer." },
  { id: "q75", type: 8, text: "Me siento cómodo/a en confrontaciones directas." },
  { id: "q76", type: 8, text: "Tengo más energía que la mayoría de la gente." },
  { id: "q77", type: 8, text: "Me cuesta mostrarme vulnerable, aunque lo sienta." },
  { id: "q78", type: 8, text: "Pruebo los límites de las normas que considero injustas." },
  { id: "q79", type: 8, text: "Protejo con fuerza a los míos." },
  { id: "q80", type: 8, text: "Prefiero ser dueño/a de la situación a depender de otros." },

  // Tipo 9 — El pacificador
  { id: "q81", type: 9, text: "Evito los conflictos siempre que puedo." },
  { id: "q82", type: 9, text: "Me cuesta saber lo que quiero realmente." },
  { id: "q83", type: 9, text: "Soy una persona tranquila y de trato fácil." },
  { id: "q84", type: 9, text: "Procrastino las decisiones que pueden generar tensión." },
  { id: "q85", type: 9, text: "Me adapto a lo que prefieren los demás." },
  { id: "q86", type: 9, text: "Disfruto de las rutinas tranquilas." },
  { id: "q87", type: 9, text: "Veo varios puntos de vista a la vez." },
  { id: "q88", type: 9, text: "A veces desconecto cuando la situación se carga." },
  { id: "q89", type: 9, text: "Necesito que mi entorno sea armonioso para estar bien." },
  { id: "q90", type: 9, text: "Pospongo lo que no me apetece hasta que toca a la fuerza." },
] as const;

/**
 * Devuelve los ítems en orden estable pero mezclado entre tipos. Determinista
 * (no hace shuffle aleatorio en cada render) para que el resultado sea
 * reproducible y testeable.
 */
export function getOrderedItems(): EnneagramItem[] {
  // Interleave: ítem 1 de tipo 1, ítem 1 de tipo 2, ..., ítem 1 de tipo 9,
  // ítem 2 de tipo 1, ... → el usuario no ve 10 preguntas seguidas del mismo tipo.
  const byType = new Map<EnneagramType, EnneagramItem[]>();
  for (const item of ENNEAGRAM_ITEMS) {
    const arr = byType.get(item.type) ?? [];
    arr.push(item);
    byType.set(item.type, arr);
  }
  const out: EnneagramItem[] = [];
  for (let i = 0; i < 10; i++) {
    for (let t = 1 as EnneagramType; t <= 9; t = (t + 1) as EnneagramType) {
      const arr = byType.get(t)!;
      out.push(arr[i]);
    }
  }
  return out;
}

export const ENNEAGRAM_TYPE_NAMES: Record<EnneagramType, string> = {
  1: "El reformador",
  2: "El ayudador",
  3: "El triunfador",
  4: "El individualista",
  5: "El investigador",
  6: "El leal",
  7: "El entusiasta",
  8: "El desafiador",
  9: "El pacificador",
};

export const ENNEAGRAM_TYPE_DESCRIPTIONS: Record<EnneagramType, string> = {
  1: "Buscas hacer las cosas bien. Eres responsable, ético/a y con altos estándares. Te cuesta soltar lo imperfecto.",
  2: "Tu energía se vuelca en los demás: notas lo que necesitan y das. El reto es atender también lo tuyo.",
  3: "Te impulsan los logros y la imagen. Eficiente y adaptativo/a. El reto es aceptar la vulnerabilidad y el descanso.",
  4: "Vives las emociones con intensidad y buscas autenticidad y significado. El reto es no quedarte en lo que falta.",
  5: "Observas, analizas, conservas tu energía. El reto es bajar de la cabeza al cuerpo y compartir más.",
  6: "Eres leal y precavido/a; anticipas problemas. El reto es confiar en tu propia voz al decidir.",
  7: "Te ilusionan las posibilidades y la experiencia. El reto es sostener el malestar sin escapar a otra cosa.",
  8: "Asumes el mando, defiendes a los tuyos, vas de frente. El reto es permitirte la vulnerabilidad.",
  9: "Buscas paz, armonía, evitar conflicto. El reto es escuchar tu propio deseo y no diluirte.",
};

/**
 * Wing vecinos en el círculo del eneagrama. El wing es el vecino con score
 * más alto. Se devuelve el wing solo si está claramente por encima del 3º
 * tipo más alto.
 */
const WING_NEIGHBORS: Record<EnneagramType, [EnneagramType, EnneagramType]> = {
  1: [9, 2],
  2: [1, 3],
  3: [2, 4],
  4: [3, 5],
  5: [4, 6],
  6: [5, 7],
  7: [6, 8],
  8: [7, 9],
  9: [8, 1],
};

const WING_MARGIN = 3; // diferencia mínima sobre el 3º tipo para reportar wing.

export type EnneagramScores = Record<`type${EnneagramType}`, number>;

export type EnneagramResult = {
  scoresByType: EnneagramScores;
  dominantType: EnneagramType;
  wing: EnneagramType | null;
  /// Lista de tipos ordenados por score desc — útil para mostrar top-3 en UI.
  ranking: Array<{ type: EnneagramType; score: number }>;
};

/**
 * Score determinista a partir de las respuestas. Ítems sin responder se
 * tratan como 3 (neutro) — la UI no debe permitir submit con menos de 90,
 * pero el server defiende.
 */
export function scoreEnneagram(answers: Partial<Record<string, LikertAnswer>>): EnneagramResult {
  const totals: Record<EnneagramType, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  };

  for (const item of ENNEAGRAM_ITEMS) {
    const raw = answers[item.id];
    const value = raw === 1 || raw === 2 || raw === 3 || raw === 4 || raw === 5 ? raw : 3;
    totals[item.type] += value;
  }

  const ranking = (Object.keys(totals) as Array<`${EnneagramType}`>)
    .map((k) => ({ type: Number(k) as EnneagramType, score: totals[Number(k) as EnneagramType] }))
    .sort((a, b) => b.score - a.score || a.type - b.type);

  const dominantType = ranking[0].type;
  const [wA, wB] = WING_NEIGHBORS[dominantType];
  const scoreA = totals[wA];
  const scoreB = totals[wB];
  const candidateWing: EnneagramType = scoreA >= scoreB ? wA : wB;
  const candidateScore = Math.max(scoreA, scoreB);
  const thirdScore = ranking.find(
    (r) => r.type !== dominantType && r.type !== candidateWing
  )?.score ?? 0;
  const wing = candidateScore - thirdScore >= WING_MARGIN ? candidateWing : null;

  const scoresByType: EnneagramScores = {
    type1: totals[1],
    type2: totals[2],
    type3: totals[3],
    type4: totals[4],
    type5: totals[5],
    type6: totals[6],
    type7: totals[7],
    type8: totals[8],
    type9: totals[9],
  };

  return { scoresByType, dominantType, wing, ranking };
}
