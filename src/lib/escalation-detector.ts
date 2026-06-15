/**
 * Detector client-side de "esto necesita terapia humana, no IA".
 *
 * Filosofía: la IA NO es terapeuta. Cuando un usuario menciona síntomas
 * que requieren atención profesional (no de crisis aguda, eso ya lo
 * cubre el detector de crisis-hotlines), el producto debe ser HONESTO y
 * sugerir terapia humana en lugar de seguir conversando.
 *
 * NO sustituye el detector de crisis (suicide/self-harm). Aquel dispara
 * el panel rojo con teléfonos de emergencia. ESTE detector es para casos
 * MÁS LEVES pero igualmente serios:
 *  - Trauma severo / abuso continuado
 *  - Trastornos alimentarios
 *  - Síntomas psicóticos (oír voces, paranoia)
 *  - Dependencias activas (alcohol, drogas)
 *  - Solicitudes explícitas de terapeuta
 *
 * Heurística regex por idioma. Cero llamadas a LLM (cero coste, cero
 * latencia, cero PII enviado a servidor). Mejor falsos negativos que
 * falsos positivos — preferimos NO derivar a alguien que necesita
 * solo venteo que SÍ derivar a alguien que se sentiría rechazado.
 */

export type EscalationCategory =
  | "trauma"
  | "eating_disorder"
  | "psychotic_symptoms"
  | "active_addiction"
  | "explicit_request"
  | null;

export type EscalationResult = {
  category: EscalationCategory;
  /** Confianza 0-1. <0.5 → ignorar. ≥0.5 → mostrar banner. */
  confidence: number;
  /** Las palabras/frases que dispararon la detección. Para debug, no UI. */
  matches: string[];
};

type LocaleKey = "es" | "en" | "pt" | "fr" | "de";

// Patrones por idioma. Cada uno es una regex case-insensitive.
// IMPORTANTE: solo añadir patrones MUY explícitos. La IA debe seguir
// ayudando con malestar emocional general; este detector solo dispara
// para casos que claramente requieren profesional.
const PATTERNS: Record<LocaleKey, Record<Exclude<EscalationCategory, null>, RegExp[]>> = {
  es: {
    trauma: [
      /\b(me\s+(violaron|abusaron|pegaba|maltrataba)|fui\s+(violad[ao]|abusad[ao]|maltratad[ao]))\b/i,
      /\babuso\s+(sexual|físico|continuado|en\s+la\s+infancia)\b/i,
      /\b(tortur(ado|ada|aron)|secuestrad[ao])\b/i,
      /\b(trauma|tept|ptsd)\s+(severo|profundo|de\s+infancia|complejo)\b/i,
    ],
    eating_disorder: [
      /\b(anorexia|bulimia|atracones?|trastorno\s+alimentario)\b/i,
      /\b(no\s+como|llevo\s+\d+\s+(días|semanas)\s+sin\s+comer|vomito\s+(después|tras)\s+(comer|las\s+comidas))\b/i,
      /\b(odio\s+mi\s+cuerpo|me\s+veo\s+gord[ao]\s+aunque)\b/i,
    ],
    psychotic_symptoms: [
      /\b(oigo\s+voces|escucho\s+voces|las\s+voces\s+me\s+dicen)\b/i,
      /\b(me\s+(siguen|persiguen|vigilan|espían))\b/i,
      /\b(siento\s+que\s+me\s+controlan|me\s+leen\s+la\s+mente)\b/i,
      /\b(alucina(ciones|ndo)|psicosis|paranoia)\b/i,
    ],
    active_addiction: [
      /\b(no\s+puedo\s+(parar|dejar)\s+de\s+(beber|tomar|consumir))\b/i,
      /\b(soy\s+(alcohóli[ck][ao]|adict[ao]))\b/i,
      /\b(bebo\s+(todos\s+los\s+días|cada\s+día|sin\s+parar))\b/i,
      /\b(consumo\s+(cocaína|heroína|cristal|metanfetamina))\b/i,
    ],
    explicit_request: [
      /\bnecesito\s+(un\s+)?(psicólog[ao]|psiquiatra|terapeuta|terapia)\b/i,
      /\b(no\s+(soy|eres)\s+suficiente|esto\s+(me\s+)?supera)\b/i,
      /\b(quiero\s+(ir\s+a\s+)?terapia|busco\s+un\s+(profesional|psicólog[ao]))\b/i,
    ],
  },
  en: {
    trauma: [
      /\bi\s+was\s+(raped|abused|beaten|molested)\b/i,
      /\b(sexual|physical|childhood|continued)\s+abuse\b/i,
      /\b(tortured|kidnapped)\b/i,
      /\b(complex|severe|childhood)\s+trauma\b/i,
      /\bptsd\b/i,
    ],
    eating_disorder: [
      /\b(anorexi[ac]|bulimi[ac]|binge\s+eat(ing)?|eating\s+disorder)\b/i,
      /\b(i\s+(don'?t|haven'?t)\s+eat(en)?|haven'?t\s+eaten\s+in\s+\d+\s+(days|weeks))\b/i,
      /\bi\s+(throw\s+up|vomit|purge)\s+after\s+(eating|meals)\b/i,
      /\bi\s+hate\s+my\s+body\s+even\s+though\b/i,
    ],
    psychotic_symptoms: [
      /\b(hear(ing)?\s+voices?|the\s+voices\s+tell\s+me)\b/i,
      /\b(being\s+(followed|watched|stalked))\b/i,
      /\b(they\s+(control|read)\s+my\s+mind)\b/i,
      /\b(hallucinati(ng|ons)|psychosis|paranoid)\b/i,
    ],
    active_addiction: [
      /\bi\s+can'?t\s+stop\s+(drinking|using|taking)\b/i,
      /\bi'?m\s+(an\s+)?(alcoholic|addict)\b/i,
      /\bi\s+drink\s+(every\s+day|all\s+the\s+time)\b/i,
      /\bi\s+use\s+(cocaine|heroin|meth)\b/i,
    ],
    explicit_request: [
      /\bi\s+need\s+(a\s+)?(therapist|psychologist|psychiatrist|therapy)\b/i,
      /\byou'?re\s+not\s+enough|this\s+is\s+beyond\s+(you|me)\b/i,
      /\bi\s+want\s+(to\s+go\s+to\s+)?therapy\b/i,
    ],
  },
  pt: {
    trauma: [
      /\b(fui\s+(violad[ao]|abusad[ao]|espancad[ao])|sofri\s+abuso)\b/i,
      /\babuso\s+(sexual|físico|continuado|na\s+infância)\b/i,
      /\b(torturad[ao]|raptad[ao])\b/i,
      /\btrauma\s+(severo|profundo|complexo|de\s+infância)\b/i,
    ],
    eating_disorder: [
      /\b(anorexia|bulimia|compulsão\s+alimentar|distúrbio\s+alimentar)\b/i,
      /\b(não\s+como|estou\s+há\s+\d+\s+(dias|semanas)\s+sem\s+comer|vomito\s+(depois|após)\s+(comer|as\s+refeições))\b/i,
    ],
    psychotic_symptoms: [
      /\b(ouço\s+vozes|as\s+vozes\s+(dizem-me|me\s+dizem))\b/i,
      /\b(estão\s+a\s+(seguir-me|perseguir-me|vigiar-me))\b/i,
      /\b(controlam-me|leem-me\s+a\s+mente)\b/i,
      /\b(alucin(ações|ar)|psicose|paranoia)\b/i,
    ],
    active_addiction: [
      /\bnão\s+consigo\s+(parar|deixar)\s+de\s+(beber|consumir|tomar)\b/i,
      /\b(sou\s+(alcoóli[ck][ao]|viciad[ao]))\b/i,
      /\bbebo\s+(todos\s+os\s+dias|cada\s+dia|sem\s+parar)\b/i,
    ],
    explicit_request: [
      /\bpreciso\s+(de\s+)?(um\s+)?(psicólog[ao]|psiquiatra|terapeuta|terapia)\b/i,
      /\b(não\s+(és|sou)\s+suficiente|isto\s+(ultrapassa-me|supera-me))\b/i,
      /\bquero\s+(ir\s+a\s+)?terapia\b/i,
    ],
  },
  fr: {
    trauma: [
      /\b(j'?ai\s+été\s+(viol[ée]|abus[ée]|battu[e]?|maltrait[ée]))\b/i,
      /\babus\s+(sexuel|physique|continu|d'?enfance)\b/i,
      /\b(tortur[ée]|enlev[ée]|kidnapp[ée])\b/i,
      /\btraumatisme\s+(sévère|profond|complexe|d'?enfance)\b/i,
      /\bSSPT\b/,
    ],
    eating_disorder: [
      /\b(anorexie|boulimie|hyperphagie|trouble\s+alimentaire)\b/i,
      /\b(je\s+ne\s+mange\s+pas|ça\s+fait\s+\d+\s+(jours|semaines)\s+que\s+je\s+ne\s+mange)\b/i,
      /\bje\s+vomis\s+après\s+(avoir\s+mangé|les\s+repas)\b/i,
    ],
    psychotic_symptoms: [
      /\b(j'?entends\s+des\s+voix|les\s+voix\s+me\s+disent)\b/i,
      /\b(on\s+me\s+(suit|surveille|épie))\b/i,
      /\b(ils\s+(contrôlent|lisent)\s+mon\s+esprit)\b/i,
      /\b(hallucination|psychose|paranoïa)\b/i,
    ],
    active_addiction: [
      /\bje\s+ne\s+peux\s+pas\s+(arrêter|m'?arrêter)\s+de\s+(boire|consommer)\b/i,
      /\b(je\s+suis\s+(alcoolique|toxicomane|addict))\b/i,
      /\bje\s+bois\s+(tous\s+les\s+jours|chaque\s+jour|sans\s+arrêt)\b/i,
    ],
    explicit_request: [
      /\bj'?ai\s+besoin\s+d'?un[e]?\s+(psychologue|psychiatre|thérapeute|thérapie)\b/i,
      /\b(tu\s+n'?es\s+pas\s+suffisant|ça\s+me\s+dépasse)\b/i,
      /\bje\s+veux\s+(aller\s+en\s+)?thérapie\b/i,
    ],
  },
  de: {
    trauma: [
      /\b(ich\s+wurde\s+(vergewaltigt|missbraucht|geschlagen|misshandelt))\b/i,
      /\b(sexuell|körperlich|seit\s+der\s+kindheit)er?\s+(missbrauch|misshandlung)\b/i,
      /\b(gefoltert|entführt)\b/i,
      /\b(trauma|ptbs|posttraumatisch)e?[snr]?\s+(schwer|tief|kindheits|komplex)/i,
    ],
    eating_disorder: [
      /\b(anorexie|magersucht|bulimie|essstörung|binge[\s-]?eating)\b/i,
      /\b(ich\s+esse\s+nicht|seit\s+\d+\s+(tagen|wochen)\s+nichts\s+gegessen)\b/i,
      /\b(ich\s+übergebe\s+mich\s+nach\s+dem\s+essen)\b/i,
      /\b(ich\s+hasse\s+meinen\s+körper|sehe\s+mich\s+dick\s+obwohl)\b/i,
    ],
    psychotic_symptoms: [
      /\b(ich\s+höre\s+stimmen|die\s+stimmen\s+sagen\s+mir)\b/i,
      /\b(man\s+(verfolgt|beobachtet|bespitzelt)\s+mich)\b/i,
      /\b(sie\s+(kontrollieren|lesen)\s+meine\s+gedanken)\b/i,
      /\b(halluzination|psychose|paranoia)\b/i,
    ],
    active_addiction: [
      /\b(ich\s+kann\s+nicht\s+aufhören\s+zu\s+(trinken|konsumieren))\b/i,
      /\b(ich\s+bin\s+(alkoholiker|drogenabhängig|süchtig))\b/i,
      /\b(ich\s+trinke\s+(jeden\s+tag|täglich|ohne\s+pause))\b/i,
    ],
    explicit_request: [
      /\b(ich\s+brauche\s+(einen\s+)?(psychologen|psychiater|therapeuten|therapie))\b/i,
      /\b(du\s+reichst\s+nicht|das\s+übersteigt\s+mich)\b/i,
      /\b(ich\s+will\s+(in\s+)?therapie)\b/i,
    ],
  },
};

/**
 * Devuelve la primera categoría que dispara con confidence ≥0.5,
 * o null. Para que dispare, requiere al menos 1 match de un patrón.
 */
export function detectEscalation(text: string, locale: string): EscalationResult {
  const loc = (["es", "en", "pt", "fr", "de"].includes(locale) ? locale : "es") as LocaleKey;
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 10) {
    return { category: null, confidence: 0, matches: [] };
  }

  const categories = PATTERNS[loc];
  for (const [category, regexes] of Object.entries(categories)) {
    const matches: string[] = [];
    for (const regex of regexes) {
      const m = trimmed.match(regex);
      if (m) matches.push(m[0]);
    }
    if (matches.length > 0) {
      // Una sola coincidencia → 0.6. Dos o más → 0.85. (No saturamos a 1
      // para reservar margen si en el futuro se añade NLP/embedding).
      const confidence = matches.length >= 2 ? 0.85 : 0.6;
      return { category: category as Exclude<EscalationCategory, null>, confidence, matches };
    }
  }

  return { category: null, confidence: 0, matches: [] };
}
