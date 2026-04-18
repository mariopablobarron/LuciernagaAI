/**
 * Pool curado de prompts para la Ronda Diaria de la Cafetería.
 *
 * Principios:
 * - Interpelan, no instruyen. Provocan observación de sí mismo.
 * - Van de lo local (hoy, ahora) a lo global (patrones). Mayoría locales.
 * - Evitan validación pasiva ("¿qué te hace feliz?") y dependencia.
 * - Admiten respuesta en 1-3 frases. No ensayos.
 *
 * El cron selecciona uno rotando por día. Para editar: cambiar este archivo
 * y redeploy. El número total debe ser suficiente para ciclar >1 mes.
 */
export const DAILY_ROUND_PROMPTS: string[] = [
  "¿Qué estás evitando hoy, y qué cuesta más: hacerlo o seguir evitándolo?",
  "¿Qué emoción estás fingiendo que no tienes ahora mismo?",
  "Describe el último momento en que te sentiste vivo de verdad. ¿Qué tenía?",
  "¿Qué decisión llevas posponiendo y por qué exactamente?",
  "¿Qué te dijiste esta mañana al despertar? Literal, sin editar.",
  "¿Qué te costaría admitir en voz alta sobre ti mismo?",
  "Si hoy fuera tu último día en este trabajo/relación/ciudad, ¿qué harías distinto?",
  "¿Qué pequeña acción de hoy te hizo sentir orgulloso aunque nadie lo viera?",
  "¿De quién estás esperando permiso para algo? ¿Por qué suya y no tuya?",
  "¿Qué historia te estás contando sobre ti que ya no es cierta?",
  "¿Qué parte de tu día fue automática y qué parte fue elegida?",
  "Nombra una cosa que hoy hiciste por miedo. ¿Qué habrías hecho sin él?",
  "¿A quién le estás cargando una expectativa que ni siquiera ha pedido cumplir?",
  "¿Qué sientes que falta, y qué aparece cuando no piensas en eso que falta?",
  "Si mañana no existiera el juicio de los demás, ¿qué dejarías de hacer hoy?",
  "¿Qué problema tuyo está resolviendo la comida/pantalla/sustancia a la que recurres?",
  "¿Qué pensamiento se repite en tu cabeza hoy? Escríbelo sin arreglarlo.",
  "¿Qué te hace sentir pequeño ahora mismo, y de dónde viene ese tamaño?",
  "¿Qué no te atreves a querer porque crees que no te lo mereces?",
  "¿Qué pasaría si dejaras de intentar gustar por un día entero?",
  "¿Qué parte de tu rutina ya no tiene sentido y sigues haciendo?",
  "Si pudieras enviarte un mensaje al 'tú' de hace un año, ¿qué le dirías?",
  "¿Qué emoción aparece cuando estás en silencio sin estímulos?",
  "¿A qué le tienes más miedo: al fracaso, al éxito, o al intento?",
  "¿Qué has normalizado que no debería ser normal?",
  "¿Qué parte de ti estás escondiendo para que te acepten?",
  "¿Qué estás postergando hasta estar 'listo'? ¿Cuándo lo estarás?",
  "¿Qué consejo das y no te aplicas?",
  "Hoy: ¿qué hiciste por hábito y qué hiciste por convicción?",
  "¿Cuál es la mentira más piadosa que te cuentas sobre tu vida?",
  "¿Qué estás confundiendo con amor, con deber, o con éxito?",
  "¿En qué momento del día te sientes más tú mismo? ¿Y por qué solo ahí?",
  "¿Qué relación de tu vida te agota y sigues sosteniendo?",
  "¿Qué cosa pequeña te haría sentir mejor mañana, y por qué no la haces hoy?",
  "¿Qué dirías si no te preocupara parecer dramático?",
  "¿Qué parte de tu día merece más presencia que la que le estás dando?",
  "¿Qué estás controlando que no depende de ti?",
  "¿De qué te estás distrayendo ahora mismo al leer esto?",
  "¿Qué palabra describe tu semana? Una sola. Sin explicar.",
  "¿Qué te haría sentir en paz esta noche al apagar la luz?",
];
