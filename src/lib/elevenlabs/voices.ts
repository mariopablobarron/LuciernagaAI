/**
 * Configuración de voces y modelos de ElevenLabs para el mentor.
 *
 * Decisión: usamos UNA SOLA voz multilingual_v2 (cubre los 4 idiomas
 * ES/EN/PT/FR) en lugar de 4 voces distintas. Razón: identidad sonora
 * consistente del mentor entre idiomas — el usuario que cambia de locale
 * NO debe percibir "es otra persona". El modelo multilingual_v2 maneja
 * el acento y la cadencia adecuadas por idioma desde la misma voz.
 *
 * Cambiar la voz default: editar `DEFAULT_MENTOR_VOICE_ID` aquí y hacer
 * deploy. Las voces se enumeran en GET /v1/voices (premade + professional).
 */

export type SupportedLocale = "es" | "en" | "pt" | "fr";

/**
 * Mapping locale → ISO 639-1 para Scribe.
 * Hoy son idénticos, pero el ID puede divergir (p.ej. "pt-BR" vs "pt-PT").
 * El producto usa PT-PT estricto pero Scribe acepta "pt" genérico.
 */
export const LOCALE_TO_SCRIBE_LANG: Record<SupportedLocale, string> = {
  es: "es",
  en: "en",
  pt: "pt",
  fr: "fr",
};

/**
 * Voz default del mentor. Cambiar este ID para cambiar la voz en todo el
 * producto.
 *
 * **Solo voces "premade"** funcionan out-of-the-box. Las voces del Voice
 * Library (marketplace) devuelven HTTP 404 voice_not_found hasta que se
 * añaden a la cuenta vía dashboard (consume slots). Probado el 2026-05-17.
 *
 * Candidatas premade evaluadas (todas con `eleven_multilingual_v2`):
 *   EXAVITQu4vr4xnSDxMaL  Sarah — mature, reassuring, confident ⭐
 *   XB0fDUnXU5powFXDhCwa  Charlotte — warm, conversational
 *   21m00Tcm4TlvDq8ikWAM  Rachel — calm, smooth (clásica ElevenLabs)
 *   cgSgspJ2msm6clMCkdW9  Jessica — playful, bright, warm
 *   nPczCjzI2devNBz1zQrb  Brian — deep, resonant, comforting (masculina)
 *
 * Default actual: Sarah. Reassuring + confident + mature encaja con
 * "mentor que te acompaña" sin sonar infantil ni demasiado formal.
 *
 * Cambiar a una voz del marketplace: ir a https://elevenlabs.io/app/voice-library,
 * "Add to my voices" en la voz deseada, copiar el voice_id que aparece
 * tras añadirla, y reemplazar aquí. Consume slot (límite 30 voces).
 */
export const DEFAULT_MENTOR_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

/**
 * Modelo TTS:
 *  - eleven_multilingual_v2: máxima calidad, 29 idiomas, 5000 chars/request.
 *  - eleven_turbo_v2_5: latencia baja, 32 idiomas, calidad ligeramente menor.
 *  - eleven_flash_v2_5: más rápido y barato, 32 idiomas, calidad básica.
 *
 * Default: multilingual_v2 para máxima calidad. Si Mario reporta lag o
 * coste, cambiar a turbo_v2_5.
 */
export const DEFAULT_TTS_MODEL = "eleven_multilingual_v2";

/**
 * Voice settings recomendadas para mentor cálido y estable.
 * - stability: 0.5 = balance entre expresividad y consistencia.
 * - similarity_boost: 0.75 = preserva timbre de la voz original.
 * - style: 0.0 = neutral (>0 amplifica el estilo, puede sonar artificial).
 * - use_speaker_boost: true = clarity en frecuencias humanas.
 */
export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
} as const;

/**
 * Modelo STT. Scribe v1 es el único modelo público de ElevenLabs hoy.
 */
export const DEFAULT_STT_MODEL = "scribe_v1";

/**
 * Límites operativos para evitar abuso/coste:
 *  - TTS_MAX_CHARS_PER_REQUEST: tope por llamada (ElevenLabs hard limit 5000).
 *    Si la respuesta del mentor excede, no se genera audio — el usuario
 *    sigue viendo el texto. 1500 chars cubren ~99% de respuestas reales.
 *  - STT_MAX_DURATION_S: tope de duración de un audio que aceptamos.
 *    Anónimos en estado emocional pueden grabar minutos de venteo.
 *    60s es suficiente para una intervención conversacional típica.
 */
export const TTS_MAX_CHARS_PER_REQUEST = 1500;
export const STT_MAX_DURATION_S = 60;

/**
 * Rate limits (requests por hora por IP).
 * Si hace falta diferenciar logged-in vs anonymous, hacer overlay con
 * userId-based limits en el endpoint.
 */
export const VOICE_RATE_LIMITS = {
  STT_PER_HOUR_ANON: 8,    // ~1 cada 7 min, cubre uso real sin abuso
  STT_PER_HOUR_AUTH: 30,   // usuarios captados tienen margen mayor
  TTS_PER_HOUR_ANON: 25,   // ~3-5 mensajes del mentor con play
  TTS_PER_HOUR_AUTH: 100,
} as const;
