/**
 * Detectores de intents extendidos — capa por encima de los básicos
 * (completion / postpone / refusal de acciones) para casos donde el tono
 * del mentor debe ajustarse: duelo, ideación leve subclínica, y cierre
 * positivo / gratitud.
 *
 * Diseño:
 *  - Heurísticas regex en español (con normalización NFD para acentos
 *    inconsistentes). Sin LLM en la detección — coste cero, latencia 0.
 *  - Cada detector devuelve boolean. El `coach.ts` recibe el bundle vía
 *    `coachContext.extendedIntent` y ajusta guidance del system prompt.
 *  - NO interceptan el flow normal del chat (eso es responsabilidad de
 *    riskLevel + crisis intercept). Solo modulan TONO del LLM.
 *
 * Importante: la ideación LEVE (subclínica) NO sustituye la detección de
 * riesgo crítico que vive en `risk.ts`. Si los signals son fuertes, el
 * crisis intercept se dispara antes y el LLM no se ejecuta. Este módulo
 * es para captar señales débiles donde el mentor debe pisar suave sin
 * activar protocolo de emergencia.
 */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,!¡¿?…;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Duelo / pérdida ──────────────────────────────────────────────────────

const GRIEF_PATTERNS = [
  /\b(murio|fallecio|se nos fue|perdimos a|se ha ido para siempre)\b/,
  /\b(luto|duelo|funeral|entierro|velorio|tanatorio)\b/,
  /\bmi (madre|padre|abuel[oa]|hij[oa]|herman[oa]|pareja|esposa|esposo|amig[oa] mejor) (murio|fallecio|ya no esta|se nos fue)\b/,
  /\b(ruptur|me dejo|hemos roto|se acabo lo nuestro|me ha dejado|me dejaste)\b/,
  /\b(despid|me echaron|perdi mi trabajo|me han echado|me quedo sin trabajo)\b/,
  /\b(perdida|perdi a|sin el|sin ella|le extrano|le extranamos|lo echo de menos|la echo de menos)\b/,
  /\b(aborto|aborte|perdimos al bebe|perdimos el embarazo)\b/,
];

export function detectGriefIntent(message: string): boolean {
  const norm = normalize(message);
  return GRIEF_PATTERNS.some((p) => p.test(norm));
}

// ─── Ideación leve / subclínica ───────────────────────────────────────────
// Señales de malestar profundo que NO son ideación suicida activa pero
// merecen tono cuidadoso. Si fuese activa lo capta `risk.ts` antes y este
// módulo nunca se ejecuta.

const MILD_IDEATION_PATTERNS = [
  /\b(ojala no estuviera aqui|ojala no existiera|no quiero seguir asi|no aguanto mas|no puedo mas con esto)\b/,
  /\b(que sentido tiene|para que sigo|no le veo sentido a nada)\b/,
  /\b(estoy roto|estoy rota|me siento vacio|me siento vacia)\b/,
  /\b(quisiera desaparecer|me gustaria desaparecer|quiero desaparecer)\b/,
  /\b(no puedo con mi vida|no soporto mi vida|odio mi vida)\b/,
  /\b(estoy fatal|estoy en el fondo|toque fondo|estoy en el pozo)\b/,
];

export function detectMildIdeation(message: string): boolean {
  const norm = normalize(message);
  return MILD_IDEATION_PATTERNS.some((p) => p.test(norm));
}

// ─── Gratitud / cierre positivo ───────────────────────────────────────────
// Cuando aparece, el mentor debe poder cerrar la sesión bien en vez de
// seguir interpretando todo como problema y empujar más acciones.

const GRATITUDE_PATTERNS = [
  /\b(gracias|muchas gracias|te lo agradezco|gracias por todo|gracias por escuchar)\b/,
  /\b(me has ayudado|me ayudaste|me ayudo (mucho|un monton))\b/,
  /\b(me siento mejor|me siento mas tranquil[oa]|me has dado claridad)\b/,
  /\b(creo que ya esta|por hoy ya esta|lo dejamos aqui|hasta aqui por hoy|me voy mas tranquil)\b/,
  /\b(es lo que necesitaba|justo lo que necesitaba|me ha venido bien)\b/,
];

export function detectGratitudeClosure(message: string): boolean {
  const norm = normalize(message);
  return GRATITUDE_PATTERNS.some((p) => p.test(norm));
}

// ─── Bundle ───────────────────────────────────────────────────────────────

export type ExtendedIntent = {
  grief: boolean;
  mildIdeation: boolean;
  gratitudeClosure: boolean;
};

export function detectExtendedIntents(message: string): ExtendedIntent {
  return {
    grief: detectGriefIntent(message),
    mildIdeation: detectMildIdeation(message),
    gratitudeClosure: detectGratitudeClosure(message),
  };
}

export function hasAnyExtendedIntent(intent: ExtendedIntent): boolean {
  return intent.grief || intent.mildIdeation || intent.gratitudeClosure;
}
