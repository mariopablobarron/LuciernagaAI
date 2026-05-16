// Helpers de i18n para emails transaccionales (signup, recovery, leadgen).
//
// Cada builder de email puede recibir un `locale` opcional; si lo recibe,
// usa las strings de ese idioma. Por defecto: "es" (compatibilidad con
// users existentes hasta que tengamos User.locale persistido en BD).
//
// Brand names por idioma:
//   es: "Tres Mil Millones de Latidos"
//   en: "Three Billion Heartbeats"
//   pt: "Três Mil Milhões de Batidas" (PT-PT)
//   fr: "Trois Milliards de Battements" (FR-FR)

export type EmailLocale = "es" | "en" | "pt" | "fr";

const SUPPORTED: readonly EmailLocale[] = ["es", "en", "pt", "fr"];

/**
 * Normaliza una entrada (cookie/header/param) a un EmailLocale válido.
 * Si no es válido devuelve "es" (default histórico).
 */
export function pickEmailLocale(value: string | null | undefined): EmailLocale {
  if (value && (SUPPORTED as readonly string[]).includes(value)) {
    return value as EmailLocale;
  }
  return "es";
}

const BCP47: Record<EmailLocale, string> = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-PT",
  fr: "fr-FR",
};

/**
 * Formatea un número entero respetando el separador de miles del locale.
 * Ej: 1500 → "1.500" en es-ES, "1,500" en en-US.
 */
export function fmtNum(n: number, locale: EmailLocale): string {
  return n.toLocaleString(BCP47[locale]);
}

/**
 * Formatea un número grande de latidos con sufijo localizado.
 *   - ≥1e9 → "3.00 mil millones" / "3.00 billion" / "3.00 mil milhões" / "3.00 milliards"
 *   - ≥1e6 → "1.5 millones" / "1.5 million" / "1.5 milhões" / "1.5 millions"
 *   - resto → toLocaleString del locale (es-ES, en-US, pt-PT, fr-FR)
 */
export function fmtBeats(n: number, locale: EmailLocale): string {
  if (n >= 1_000_000_000) {
    const v = (n / 1_000_000_000).toFixed(2);
    switch (locale) {
      case "es": return `${v} mil millones`;
      case "en": return `${v} billion`;
      case "pt": return `${v} mil milhões`;
      case "fr": return `${v} milliards`;
    }
  }
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(1);
    switch (locale) {
      case "es": return `${v} millones`;
      case "en": return `${v} million`;
      case "pt": return `${v} milhões`;
      case "fr": return `${v} millions`;
    }
  }
  return fmtNum(n, locale);
}

/**
 * Nombre de marca por idioma. Se usa en subject, body, signature.
 */
export const BRAND_NAME: Record<EmailLocale, string> = {
  es: "Tres Mil Millones de Latidos",
  en: "Three Billion Heartbeats",
  pt: "Três Mil Milhões de Batidas",
  fr: "Trois Milliards de Battements",
};

// ─── Strings por email ────────────────────────────────────────────────────────
//
// Bloques de copy compartidos por familias de emails. La estructura espeja la
// usada en messages/*.json para mantener consistencia con el sitio web.

/** Email de verificación post-signup. */
export const VERIFICATION_STRINGS: Record<EmailLocale, {
  subject: string;
  greeting: (name: string | null) => string;
  intro: string;
  hint: string;
  ignore: string;
  cta: string;
}> = {
  es: {
    subject: `Verifica tu email — ${BRAND_NAME.es}`,
    greeting: (name) => (name ? `Hola ${name}` : "Hola"),
    intro: "Gracias por registrarte. Solo necesitas verificar tu email para empezar.",
    hint: "El enlace caduca en 24 horas.",
    ignore: "Si no te has registrado, ignora este mensaje.",
    cta: "Verificar mi email",
  },
  en: {
    subject: `Verify your email — ${BRAND_NAME.en}`,
    greeting: (name) => (name ? `Hi ${name}` : "Hi"),
    intro: "Thanks for signing up. You just need to verify your email to get started.",
    hint: "The link expires in 24 hours.",
    ignore: "If you didn't sign up, ignore this message.",
    cta: "Verify my email",
  },
  pt: {
    subject: `Verifica o teu email — ${BRAND_NAME.pt}`,
    greeting: (name) => (name ? `Olá ${name}` : "Olá"),
    intro: "Obrigado pelo teu registo. Só precisas de verificar o teu email para começar.",
    hint: "O link expira em 24 horas.",
    ignore: "Se não te registaste, ignora esta mensagem.",
    cta: "Verificar o meu email",
  },
  fr: {
    subject: `Vérifie ton email — ${BRAND_NAME.fr}`,
    greeting: (name) => (name ? `Salut ${name}` : "Salut"),
    intro: "Merci pour ton inscription. Tu n'as plus qu'à vérifier ton email pour commencer.",
    hint: "Le lien expire dans 24 heures.",
    ignore: "Si tu ne t'es pas inscrit(e), ignore ce message.",
    cta: "Vérifier mon email",
  },
};

/** Email de recuperación de contraseña. */
export const PASSWORD_RESET_STRINGS: Record<EmailLocale, {
  subject: string;
  greeting: (name: string | null) => string;
  intro: string;
  hint: string;
  ignore: string;
  cta: string;
}> = {
  es: {
    subject: "Recupera tu acceso",
    greeting: (name) => (name ? `Hola ${name}` : "Hola"),
    intro: "Recibimos una petición para restablecer la contraseña de tu cuenta.",
    hint: "El enlace caduca en 1 hora.",
    ignore: "Si no pediste esto, ignora este correo.",
    cta: "Restablecer contraseña",
  },
  en: {
    subject: "Recover your access",
    greeting: (name) => (name ? `Hi ${name}` : "Hi"),
    intro: "We received a request to reset the password for your account.",
    hint: "The link expires in 1 hour.",
    ignore: "If you didn't request this, ignore this email.",
    cta: "Reset password",
  },
  pt: {
    subject: "Recupera o teu acesso",
    greeting: (name) => (name ? `Olá ${name}` : "Olá"),
    intro: "Recebemos um pedido para repor a palavra-passe da tua conta.",
    hint: "O link expira em 1 hora.",
    ignore: "Se não pediste isto, ignora este email.",
    cta: "Repor palavra-passe",
  },
  fr: {
    subject: "Récupère ton accès",
    greeting: (name) => (name ? `Salut ${name}` : "Salut"),
    intro: "Nous avons reçu une demande de réinitialisation du mot de passe de ton compte.",
    hint: "Le lien expire dans 1 heure.",
    ignore: "Si tu n'as pas fait cette demande, ignore cet email.",
    cta: "Réinitialiser le mot de passe",
  },
};

/** Estados del test gratuito — copy por idioma. */
export type QuizStateKey = "bloqueo" | "ansiedad" | "duda" | "claridad" | "neutral";

export const QUIZ_STATE_I18N: Record<
  EmailLocale,
  Record<QuizStateKey, { emoji: string; label: string; headline: string; action: string }>
> = {
  es: {
    bloqueo: { emoji: "🧱", label: "Bloqueo mental",
      headline: "Sabes lo que tienes que hacer — pero no puedes empezar.",
      action: "Abre ahora el documento, archivo o herramienta del proyecto. Solo abrirlo, sin hacer nada más. En los próximos 2 minutos." },
    ansiedad: { emoji: "⚡", label: "Ansiedad de acción",
      headline: "Tienes energía — pero se convierte en presión, no en avance.",
      action: "Escribe en papel o en un documento: «¿Qué es lo peor concreto que puede pasar?» Una frase. Sin adornos. Nómbralo." },
    duda: { emoji: "🌫️", label: "Niebla de dirección",
      headline: "Tienes ganas — pero no sabes hacia dónde.",
      action: "Responde en 30 segundos: ¿Cuál es el UN objetivo que, si avanzara esta semana, sentiría que hay progreso real? Escríbelo ahora." },
    claridad: { emoji: "✨", label: "Momento de claridad",
      headline: "Sabes lo que quieres y tienes energía para avanzar.",
      action: "Define en una frase el resultado concreto de hoy. No la lista entera: solo la cosa más importante que, si la haces, el día habrá valido." },
    neutral: { emoji: "🔵", label: "Estado neutro",
      headline: "Estás en punto muerto — ni bloqueado ni en impulso claro.",
      action: "Elige una tarea de menos de 20 minutos que lleves postergando. Ponla en tu agenda de hoy con hora exacta." },
  },
  en: {
    bloqueo: { emoji: "🧱", label: "Mental block",
      headline: "You know what you have to do — but you can't get started.",
      action: "Open the document, file or tool of your project now. Just open it, nothing else. In the next 2 minutes." },
    ansiedad: { emoji: "⚡", label: "Action anxiety",
      headline: "You have energy — but it turns into pressure, not progress.",
      action: "Write on paper or in a doc: \"What's the concrete worst that can happen?\" One sentence. No fluff. Name it." },
    duda: { emoji: "🌫️", label: "Direction fog",
      headline: "You're motivated — but you don't know where to go.",
      action: "Answer in 30 seconds: which ONE goal, if it moved this week, would feel like real progress? Write it now." },
    claridad: { emoji: "✨", label: "Clarity moment",
      headline: "You know what you want and you have the energy to move.",
      action: "Define in one sentence the concrete result for today. Not the whole list: just the one thing that, if you do it, the day was worth it." },
    neutral: { emoji: "🔵", label: "Neutral state",
      headline: "You're stalled — neither blocked nor in clear momentum.",
      action: "Pick a task under 20 minutes you've been putting off. Schedule it for today with an exact time." },
  },
  pt: {
    bloqueo: { emoji: "🧱", label: "Bloqueio mental",
      headline: "Sabes o que tens de fazer — mas não consegues começar.",
      action: "Abre agora o documento, ficheiro ou ferramenta do projeto. Só abrir, sem fazer mais nada. Nos próximos 2 minutos." },
    ansiedad: { emoji: "⚡", label: "Ansiedade de ação",
      headline: "Tens energia — mas transforma-se em pressão, não em avanço.",
      action: "Escreve em papel ou num documento: «Qual é o pior concreto que pode acontecer?» Uma frase. Sem ornamentos. Nomeia-o." },
    duda: { emoji: "🌫️", label: "Névoa de direção",
      headline: "Tens vontade — mas não sabes para onde ir.",
      action: "Responde em 30 segundos: qual é o UM objetivo que, se avançasse esta semana, sentirias que há progresso real? Escreve-o agora." },
    claridad: { emoji: "✨", label: "Momento de clareza",
      headline: "Sabes o que queres e tens energia para avançar.",
      action: "Define numa frase o resultado concreto de hoje. Não a lista inteira: só a coisa mais importante que, se a fizeres, o dia terá valido." },
    neutral: { emoji: "🔵", label: "Estado neutro",
      headline: "Estás em ponto morto — nem bloqueado nem em impulso claro.",
      action: "Escolhe uma tarefa de menos de 20 minutos que andas a adiar. Coloca-a na tua agenda de hoje com hora exata." },
  },
  fr: {
    bloqueo: { emoji: "🧱", label: "Blocage mental",
      headline: "Tu sais ce qu'il faut faire — mais tu n'arrives pas à commencer.",
      action: "Ouvre maintenant le document, le fichier ou l'outil du projet. Juste l'ouvrir, rien d'autre. Dans les 2 prochaines minutes." },
    ansiedad: { emoji: "⚡", label: "Anxiété d'action",
      headline: "Tu as de l'énergie — mais elle se transforme en pression, pas en progrès.",
      action: "Écris sur papier ou dans un doc : « Quel est le pire concret qui peut arriver ? » Une phrase. Sans fioritures. Nomme-le." },
    duda: { emoji: "🌫️", label: "Brouillard de direction",
      headline: "Tu en as envie — mais tu ne sais pas vers où.",
      action: "Réponds en 30 secondes : quel UN objectif, s'il avançait cette semaine, donnerait l'impression d'un vrai progrès ? Écris-le maintenant." },
    claridad: { emoji: "✨", label: "Moment de clarté",
      headline: "Tu sais ce que tu veux et tu as l'énergie pour avancer.",
      action: "Définis en une phrase le résultat concret d'aujourd'hui. Pas la liste entière : juste la chose la plus importante qui, si tu la fais, donnera du sens à ta journée." },
    neutral: { emoji: "🔵", label: "État neutre",
      headline: "Tu es au point mort — ni bloqué(e) ni dans un élan clair.",
      action: "Choisis une tâche de moins de 20 minutes que tu reportes. Mets-la dans ton agenda d'aujourd'hui avec une heure précise." },
  },
};

/** Subject + texto del email del test gratuito (chrome alrededor del state). */
export const QUIZ_LEAD_STRINGS: Record<EmailLocale, {
  subjectTpl: (emoji: string, label: string) => string;
  resultHeader: string;
  actionLabel: string;
  pitch: string;
  cta: string;
  textIntro: string;
  textStateDetected: string;
  textActionHeader: string;
  textPitch: string;
  textCta: string;
}> = {
  es: {
    subjectTpl: (emoji, label) => `${emoji} Tu diagnóstico: ${label}`,
    resultHeader: "Tu resultado del test",
    actionLabel: "Tu acción para ahora",
    pitch: `${BRAND_NAME.es} detecta tu estado en cada conversación y te orienta a la acción concreta. Sin consejos genéricos. Sin rodeos.`,
    cta: "Empezar gratis",
    textIntro: `Tu resultado del test de ${BRAND_NAME.es}`,
    textStateDetected: "Estado detectado:",
    textActionHeader: "Tu acción para ahora:",
    textPitch: `${BRAND_NAME.es} te ayuda a hacer seguimiento de tu estado y avanzar con conversaciones orientadas a acción.`,
    textCta: "Empieza gratis →",
  },
  en: {
    subjectTpl: (emoji, label) => `${emoji} Your diagnosis: ${label}`,
    resultHeader: "Your test result",
    actionLabel: "Your action for now",
    pitch: `${BRAND_NAME.en} detects your state in every conversation and points you toward concrete action. No generic advice. No detours.`,
    cta: "Start free",
    textIntro: `Your test result from ${BRAND_NAME.en}`,
    textStateDetected: "Detected state:",
    textActionHeader: "Your action for now:",
    textPitch: `${BRAND_NAME.en} helps you track your state and move forward with action-oriented conversations.`,
    textCta: "Start free →",
  },
  pt: {
    subjectTpl: (emoji, label) => `${emoji} O teu diagnóstico: ${label}`,
    resultHeader: "O teu resultado do teste",
    actionLabel: "A tua ação para agora",
    pitch: `${BRAND_NAME.pt} deteta o teu estado em cada conversa e orienta-te para a ação concreta. Sem conselhos genéricos. Sem rodeios.`,
    cta: "Começar grátis",
    textIntro: `O teu resultado do teste de ${BRAND_NAME.pt}`,
    textStateDetected: "Estado detetado:",
    textActionHeader: "A tua ação para agora:",
    textPitch: `${BRAND_NAME.pt} ajuda-te a seguir o teu estado e avançar com conversas orientadas à ação.`,
    textCta: "Começa grátis →",
  },
  fr: {
    subjectTpl: (emoji, label) => `${emoji} Ton diagnostic : ${label}`,
    resultHeader: "Ton résultat du test",
    actionLabel: "Ton action pour maintenant",
    pitch: `${BRAND_NAME.fr} détecte ton état dans chaque conversation et t'oriente vers une action concrète. Pas de conseils génériques. Pas de détours.`,
    cta: "Commencer gratuitement",
    textIntro: `Ton résultat du test de ${BRAND_NAME.fr}`,
    textStateDetected: "État détecté :",
    textActionHeader: "Ton action pour maintenant :",
    textPitch: `${BRAND_NAME.fr} t'aide à suivre ton état et à avancer avec des conversations orientées action.`,
    textCta: "Commence gratuitement →",
  },
};

/** Email del informe de la calculadora de latidos. */
export const HEARTBEAT_STRINGS: Record<EmailLocale, {
  subjectTpl: (beats: string) => string;
  reportLabel: string;
  introTpl: (beats: string) => string; // text-only
  introHtmlTpl: (beatsBold: string) => string; // HTML con la negrita ya aplicada
  sunrises: string;
  hours: string;
  songs: string;
  hugs: string;
  reframeTitle: string;
  reframeBody: string;
  nowTitle: string;
  nowBody: string;
  ctaButton: string;
  signupPitch: string;
  signupCta: string;
  haveAccount: string;
  signature: string;
  reframeBodyLong: string;
  footerNote: string;
  emphasizedClose: string;
}> = {
  es: {
    subjectTpl: (beats) => `💓 ${beats} latidos — tu informe personal`,
    reportLabel: "Tu informe de latidos",
    introTpl: (beats) => `Tu corazón ha latido aproximadamente ${beats} veces para traerte hasta aquí.`,
    introHtmlTpl: (beatsBold) =>
      `Tu corazón ha latido <strong style="color:#e4e4e7">${beatsBold} veces</strong> para traerte hasta aquí. Cada uno sostuvo una decisión, un momento de duda, un paso adelante.`,
    sunrises: "amaneceres vividos",
    hours: "horas de experiencia",
    songs: "canciones que caben",
    hugs: "abrazos posibles",
    reframeTitle: "No son números — son tu historia",
    reframeBody: "Cada latido sostuvo una decisión, un momento de duda, un paso adelante.",
    nowTitle: "Lo que puedes hacer ahora",
    nowBody: "Tu corazón ya tiene la constancia. Solo falta que tú le des una dirección. El primer paso no tiene que ser grande — solo tiene que ser tuyo.",
    ctaButton: "Dar mi primer paso",
    signupPitch: `Convierte intención en acción con ${BRAND_NAME.es}: un mentor con IA, check-ins diarios, objetivos y retos de 21 días.`,
    signupCta: "Crear cuenta gratis",
    haveAccount: "¿Ya tienes cuenta?",
    signature: `— ${BRAND_NAME.es}`,
    reframeBodyLong: "Detrás de cada latido hubo decisiones que tomaste, miedos que enfrentaste y días que simplemente aguantaste. Tu corazón tiene la constancia. Solo falta que tú le des una dirección.",
    footerNote: "Este informe se generó desde la calculadora de latidos.",
    emphasizedClose: "El primer paso no tiene que ser grande — solo tiene que ser tuyo.",
  },
  en: {
    subjectTpl: (beats) => `💓 ${beats} heartbeats — your personal report`,
    reportLabel: "Your heartbeat report",
    introTpl: (beats) => `Your heart has beaten approximately ${beats} times to bring you here.`,
    introHtmlTpl: (beatsBold) =>
      `Your heart has beaten <strong style="color:#e4e4e7">${beatsBold} times</strong> to bring you here. Each one sustained a decision, a moment of doubt, a step forward.`,
    sunrises: "sunrises lived",
    hours: "hours of experience",
    songs: "songs that fit",
    hugs: "possible hugs",
    reframeTitle: "They're not numbers — they're your story",
    reframeBody: "Each heartbeat sustained a decision, a moment of doubt, a step forward.",
    nowTitle: "What you can do now",
    nowBody: "Your heart already has the consistency. All it needs is for you to give it a direction. The first step doesn't have to be big — it just has to be yours.",
    ctaButton: "Take my first step",
    signupPitch: `Turn intention into action with ${BRAND_NAME.en}: an AI mentor, daily check-ins, goals and 21-day challenges.`,
    signupCta: "Create free account",
    haveAccount: "Already have an account?",
    signature: `— ${BRAND_NAME.en}`,
    reframeBodyLong: "Behind every heartbeat there were decisions you made, fears you faced and days you simply got through. Your heart has the consistency. All it needs is for you to give it a direction.",
    footerNote: "This report was generated from the heartbeat calculator.",
    emphasizedClose: "The first step doesn't have to be big — it just has to be yours.",
  },
  pt: {
    subjectTpl: (beats) => `💓 ${beats} batidas — o teu relatório pessoal`,
    reportLabel: "O teu relatório de batidas",
    introTpl: (beats) => `O teu coração bateu aproximadamente ${beats} vezes para te trazer até aqui.`,
    introHtmlTpl: (beatsBold) =>
      `O teu coração bateu <strong style="color:#e4e4e7">${beatsBold} vezes</strong> para te trazer até aqui. Cada uma sustentou uma decisão, um momento de dúvida, um passo em frente.`,
    sunrises: "amanheceres vividos",
    hours: "horas de experiência",
    songs: "canções que cabem",
    hugs: "abraços possíveis",
    reframeTitle: "Não são números — é a tua história",
    reframeBody: "Cada batida sustentou uma decisão, um momento de dúvida, um passo em frente.",
    nowTitle: "O que podes fazer agora",
    nowBody: "O teu coração já tem a constância. Só falta que tu lhe dês uma direção. O primeiro passo não tem de ser grande — só tem de ser teu.",
    ctaButton: "Dar o meu primeiro passo",
    signupPitch: `Transforma intenção em ação com ${BRAND_NAME.pt}: um mentor com IA, check-ins diários, objetivos e desafios de 21 dias.`,
    signupCta: "Criar conta grátis",
    haveAccount: "Já tens conta?",
    signature: `— ${BRAND_NAME.pt}`,
    reframeBodyLong: "Por trás de cada batida houve decisões que tomaste, medos que enfrentaste e dias que simplesmente aguentaste. O teu coração tem a constância. Só falta que tu lhe dês uma direção.",
    footerNote: "Este relatório foi gerado a partir da calculadora de batidas.",
    emphasizedClose: "O primeiro passo não tem de ser grande — só tem de ser teu.",
  },
  fr: {
    subjectTpl: (beats) => `💓 ${beats} battements — ton rapport personnel`,
    reportLabel: "Ton rapport de battements",
    introTpl: (beats) => `Ton cœur a battu environ ${beats} fois pour t'amener jusqu'ici.`,
    introHtmlTpl: (beatsBold) =>
      `Ton cœur a battu <strong style="color:#e4e4e7">${beatsBold} fois</strong> pour t'amener jusqu'ici. Chacun a soutenu une décision, un moment de doute, un pas en avant.`,
    sunrises: "levers de soleil vécus",
    hours: "heures d'expérience",
    songs: "chansons qui tiennent",
    hugs: "câlins possibles",
    reframeTitle: "Ce ne sont pas des chiffres — c'est ton histoire",
    reframeBody: "Chaque battement a soutenu une décision, un moment de doute, un pas en avant.",
    nowTitle: "Ce que tu peux faire maintenant",
    nowBody: "Ton cœur a déjà la constance. Il ne manque plus que tu lui donnes une direction. Le premier pas n'a pas besoin d'être grand — il a juste besoin d'être le tien.",
    ctaButton: "Faire mon premier pas",
    signupPitch: `Transforme l'intention en action avec ${BRAND_NAME.fr} : un mentor IA, des check-ins quotidiens, des objectifs et des défis de 21 jours.`,
    signupCta: "Créer un compte gratuit",
    haveAccount: "Tu as déjà un compte ?",
    signature: `— ${BRAND_NAME.fr}`,
    reframeBodyLong: "Derrière chaque battement, il y a eu des décisions que tu as prises, des peurs que tu as affrontées et des jours que tu as simplement traversés. Ton cœur a la constance. Il ne manque plus que tu lui donnes une direction.",
    footerNote: "Ce rapport a été généré depuis le calculateur de battements.",
    emphasizedClose: "Le premier pas n'a pas besoin d'être grand — il a juste besoin d'être le tien.",
  },
};

/**
 * Email de bienvenida post-signup. Voz directa, sin coaching vacío.
 * Plantilla original: "Has dado el primer paso. La mayoría no llega aquí."
 */
export const WELCOME_STRINGS: Record<EmailLocale, {
  subjectWithName: (firstName: string) => string;
  subjectAnon: string;
  greeting: (firstName: string | null) => string;
  line1: string;
  line2: string;
  highlight: string;
  closing: string;
  cta: string;
}> = {
  es: {
    subjectWithName: (n) => `${n}, tu primer latido empieza aquí`,
    subjectAnon: "Tu primer latido empieza aquí",
    greeting: (n) => (n ? n : "Hola"),
    line1: "Has dado el primer paso. La mayoría no llega aquí.",
    line2: "Esto no es una app que te dice qué hacer. Es un espacio que te pregunta lo que nadie te pregunta — para que veas lo que no estás viendo.",
    highlight: "No necesitas tenerlo claro.<br>Solo necesitas empezar por lo que sientes hoy.",
    closing: "Cada latido cuenta. Y este es el primero.",
    cta: "Mi primer latido",
  },
  en: {
    subjectWithName: (n) => `${n}, your first heartbeat starts here`,
    subjectAnon: "Your first heartbeat starts here",
    greeting: (n) => (n ? n : "Hi"),
    line1: "You've taken the first step. Most people don't get here.",
    line2: "This isn't an app that tells you what to do. It's a space that asks you what no one asks — so you can see what you're not seeing.",
    highlight: "You don't need to have it figured out.<br>You just need to start with what you feel today.",
    closing: "Every heartbeat counts. And this is the first one.",
    cta: "My first heartbeat",
  },
  pt: {
    subjectWithName: (n) => `${n}, a tua primeira batida começa aqui`,
    subjectAnon: "A tua primeira batida começa aqui",
    greeting: (n) => (n ? n : "Olá"),
    line1: "Deste o primeiro passo. A maioria não chega aqui.",
    line2: "Isto não é uma app que te diz o que fazer. É um espaço que te pergunta o que ninguém te pergunta — para que vejas o que não estás a ver.",
    highlight: "Não precisas de o ter claro.<br>Só precisas de começar pelo que sentes hoje.",
    closing: "Cada batida conta. E esta é a primeira.",
    cta: "A minha primeira batida",
  },
  fr: {
    subjectWithName: (n) => `${n}, ton premier battement commence ici`,
    subjectAnon: "Ton premier battement commence ici",
    greeting: (n) => (n ? n : "Salut"),
    line1: "Tu as fait le premier pas. La plupart des gens n'arrivent pas jusqu'ici.",
    line2: "Ce n'est pas une app qui te dit quoi faire. C'est un espace qui te pose les questions que personne ne pose — pour que tu voies ce que tu ne vois pas.",
    highlight: "Tu n'as pas besoin d'avoir tout clair.<br>Tu as juste besoin de commencer par ce que tu ressens aujourd'hui.",
    closing: "Chaque battement compte. Et celui-ci est le premier.",
    cta: "Mon premier battement",
  },
};

/**
 * Email de bienvenida a la lista de espera (/unirse).
 * Plantilla original: "Respondiste tres preguntas que la mayoría evita."
 */
export const WAITLIST_STRINGS: Record<EmailLocale, {
  subject: string;
  greeting: (name: string | null) => string;
  line1: string;
  line2: string;
  highlight: string;
  closing: string;
  signature: string;
  disclaimer: string;
  cta: string;
}> = {
  es: {
    subject: `Tu transformación empieza aquí — ${BRAND_NAME.es}`,
    greeting: (n) => (n ? `Hola ${n}` : "Hola"),
    line1: "Ya diste el primer paso. Respondiste tres preguntas que la mayoría evita. Eso dice algo de ti.",
    line2: `${BRAND_NAME.es} no es otra app de productividad. Es un espacio para ordenar lo que sientes, nombrar lo que te frena y avanzar con acción concreta.`,
    highlight: "El siguiente paso: crea tu cuenta y empieza tu primera conversación.",
    closing: "Sin rodeos. Sin consejos genéricos. Solo tú y la claridad que necesitas.",
    signature: `— ${BRAND_NAME.es}`,
    disclaimer: "Este servicio acompaña — no sustituye ayuda profesional.",
    cta: "Crear mi cuenta",
  },
  en: {
    subject: `Your transformation starts here — ${BRAND_NAME.en}`,
    greeting: (n) => (n ? `Hi ${n}` : "Hi"),
    line1: "You've already taken the first step. You answered three questions most people avoid. That says something about you.",
    line2: `${BRAND_NAME.en} isn't another productivity app. It's a space to order what you feel, name what's holding you back, and move forward with concrete action.`,
    highlight: "Next step: create your account and start your first conversation.",
    closing: "No detours. No generic advice. Just you and the clarity you need.",
    signature: `— ${BRAND_NAME.en}`,
    disclaimer: "This service accompanies — it doesn't replace professional help.",
    cta: "Create my account",
  },
  pt: {
    subject: `A tua transformação começa aqui — ${BRAND_NAME.pt}`,
    greeting: (n) => (n ? `Olá ${n}` : "Olá"),
    line1: "Já deste o primeiro passo. Respondeste a três perguntas que a maioria evita. Isso diz algo sobre ti.",
    line2: `${BRAND_NAME.pt} não é mais uma app de produtividade. É um espaço para ordenar o que sentes, nomear o que te trava e avançar com ação concreta.`,
    highlight: "O próximo passo: cria a tua conta e começa a tua primeira conversa.",
    closing: "Sem rodeios. Sem conselhos genéricos. Só tu e a clareza de que precisas.",
    signature: `— ${BRAND_NAME.pt}`,
    disclaimer: "Este serviço acompanha — não substitui ajuda profissional.",
    cta: "Criar a minha conta",
  },
  fr: {
    subject: `Ta transformation commence ici — ${BRAND_NAME.fr}`,
    greeting: (n) => (n ? `Salut ${n}` : "Salut"),
    line1: "Tu as déjà fait le premier pas. Tu as répondu à trois questions que la plupart des gens évitent. Ça dit quelque chose de toi.",
    line2: `${BRAND_NAME.fr} n'est pas une autre app de productivité. C'est un espace pour mettre de l'ordre dans ce que tu ressens, nommer ce qui te freine et avancer avec une action concrète.`,
    highlight: "Prochaine étape : crée ton compte et commence ta première conversation.",
    closing: "Sans détours. Sans conseils génériques. Juste toi et la clarté dont tu as besoin.",
    signature: `— ${BRAND_NAME.fr}`,
    disclaimer: "Ce service accompagne — il ne remplace pas une aide professionnelle.",
    cta: "Créer mon compte",
  },
};

/** 24h nudge (signup hace 1 día y aún 0 mensajes). */
export const NUDGE_24H_STRINGS: Record<EmailLocale, {
  subjectWithName: (firstName: string) => string;
  subjectAnon: string;
  greeting: (firstName: string | null) => string;
  line1: string;
  line2: string;
  closing: string;
  cta: string;
}> = {
  es: {
    subjectWithName: (n) => `${n}, ayer empezaste algo`,
    subjectAnon: "Ayer empezaste algo",
    greeting: (n) => (n ? n : "Hola"),
    line1: "Ayer diste un paso. Hoy toca el segundo.",
    line2: "No necesitas una hora. No necesitas tenerlo claro. Solo necesitas escribir una frase sobre cómo estás ahora mismo.",
    closing: "A veces volver es solo abrir la puerta y decir \"hoy estoy así\".",
    cta: "Segundo latido",
  },
  en: {
    subjectWithName: (n) => `${n}, you started something yesterday`,
    subjectAnon: "You started something yesterday",
    greeting: (n) => (n ? n : "Hi"),
    line1: "Yesterday you took a step. Today, take the second.",
    line2: "You don't need an hour. You don't need clarity. You just need to write one sentence about how you are right now.",
    closing: "Sometimes coming back is just opening the door and saying \"today I'm like this\".",
    cta: "Second heartbeat",
  },
  pt: {
    subjectWithName: (n) => `${n}, ontem começaste algo`,
    subjectAnon: "Ontem começaste algo",
    greeting: (n) => (n ? n : "Olá"),
    line1: "Ontem deste um passo. Hoje toca o segundo.",
    line2: "Não precisas de uma hora. Não precisas de o ter claro. Só precisas de escrever uma frase sobre como estás agora.",
    closing: "Às vezes voltar é só abrir a porta e dizer \"hoje estou assim\".",
    cta: "Segunda batida",
  },
  fr: {
    subjectWithName: (n) => `${n}, tu as commencé quelque chose hier`,
    subjectAnon: "Tu as commencé quelque chose hier",
    greeting: (n) => (n ? n : "Salut"),
    line1: "Hier tu as fait un pas. Aujourd'hui, fais le deuxième.",
    line2: "Tu n'as pas besoin d'une heure. Tu n'as pas besoin d'avoir tout clair. Tu as juste besoin d'écrire une phrase sur comment tu es maintenant.",
    closing: "Parfois revenir, c'est juste ouvrir la porte et dire \"aujourd'hui je suis comme ça\".",
    cta: "Deuxième battement",
  },
};

/** 7d nudge (lleva 6-8 días sin volver tras al menos 1 mensaje). */
export const NUDGE_7D_STRINGS: Record<EmailLocale, {
  subjectWithName: (firstName: string) => string;
  subjectAnon: string;
  greeting: (firstName: string | null) => string;
  weekAgoLine: string;
  stillThere: string;
  closing: string;
  cta: string;
}> = {
  es: {
    subjectWithName: (n) => `${n}, lo último que dijiste`,
    subjectAnon: "Lo último que dijiste",
    greeting: (n) => (n ? n : "Hola"),
    weekAgoLine: "Hace una semana escribiste:",
    stillThere: "¿Sigue ahí?",
    closing: "No hace falta una respuesta larga. Solo una frase nueva.",
    cta: "Escribir una frase nueva",
  },
  en: {
    subjectWithName: (n) => `${n}, the last thing you said`,
    subjectAnon: "The last thing you said",
    greeting: (n) => (n ? n : "Hi"),
    weekAgoLine: "A week ago you wrote:",
    stillThere: "Is it still there?",
    closing: "No need for a long reply. Just one new sentence.",
    cta: "Write one new sentence",
  },
  pt: {
    subjectWithName: (n) => `${n}, a última coisa que disseste`,
    subjectAnon: "A última coisa que disseste",
    greeting: (n) => (n ? n : "Olá"),
    weekAgoLine: "Há uma semana escreveste:",
    stillThere: "Ainda está aí?",
    closing: "Não é preciso uma resposta longa. Só uma frase nova.",
    cta: "Escrever uma frase nova",
  },
  fr: {
    subjectWithName: (n) => `${n}, la dernière chose que tu as dite`,
    subjectAnon: "La dernière chose que tu as dite",
    greeting: (n) => (n ? n : "Salut"),
    weekAgoLine: "Il y a une semaine tu écrivais :",
    stillThere: "C'est toujours là ?",
    closing: "Pas besoin d'une longue réponse. Juste une phrase nouvelle.",
    cta: "Écrire une phrase nouvelle",
  },
};

/** Email de recordatorio de acción pendiente (24h tras última sesión). */
export const REMINDER_STRINGS: Record<EmailLocale, {
  subject: string;
  eyebrow: string;
  title: string;
  pendingHeader: string;
  question: string;
  textIntro: string;
  textPendingHeader: string;
  textQuestion: string;
  cta: string;
}> = {
  es: {
    subject: `Tienes una acción pendiente en ${BRAND_NAME.es}`,
    eyebrow: "Han pasado 24 horas",
    title: "Tienes algo pendiente",
    pendingHeader: "Lo que dijiste que harías",
    question: "¿Qué está pasando? Puede que necesites ajustar la acción, o simplemente retomar.",
    textIntro: "Han pasado 24 horas desde tu última sesión.",
    textPendingHeader: "Dijiste que harías esto:",
    textQuestion: "¿Qué está pasando? Vuelve cuando puedas.",
    cta: "Volver ahora",
  },
  en: {
    subject: `You have a pending action in ${BRAND_NAME.en}`,
    eyebrow: "24 hours have passed",
    title: "You have something pending",
    pendingHeader: "What you said you'd do",
    question: "What's going on? Maybe you need to adjust the action, or simply pick it back up.",
    textIntro: "24 hours have passed since your last session.",
    textPendingHeader: "You said you'd do this:",
    textQuestion: "What's going on? Come back when you can.",
    cta: "Return now",
  },
  pt: {
    subject: `Tens uma ação pendente em ${BRAND_NAME.pt}`,
    eyebrow: "Passaram 24 horas",
    title: "Tens algo pendente",
    pendingHeader: "O que disseste que farias",
    question: "O que está a acontecer? Talvez precises de ajustar a ação, ou simplesmente retomar.",
    textIntro: "Passaram 24 horas desde a tua última sessão.",
    textPendingHeader: "Disseste que farias isto:",
    textQuestion: "O que está a acontecer? Volta quando puderes.",
    cta: "Voltar agora",
  },
  fr: {
    subject: `Tu as une action en attente dans ${BRAND_NAME.fr}`,
    eyebrow: "24 heures se sont écoulées",
    title: "Tu as quelque chose en attente",
    pendingHeader: "Ce que tu as dit que tu ferais",
    question: "Qu'est-ce qui se passe ? Tu as peut-être besoin d'ajuster l'action, ou simplement de la reprendre.",
    textIntro: "24 heures se sont écoulées depuis ta dernière session.",
    textPendingHeader: "Tu as dit que tu ferais ceci :",
    textQuestion: "Qu'est-ce qui se passe ? Reviens quand tu peux.",
    cta: "Revenir maintenant",
  },
};

/** Notificación de carta semanal del mentor lista para leer. */
export const WEEKLY_LETTER_STRINGS: Record<EmailLocale, {
  subject: string;
  greeting: (firstName: string | null) => string;
  intro: string;
  htmlIntro: string;
  cta: string;
  footerNote: string;
  signature: string;
}> = {
  es: {
    subject: "Tu carta de esta semana está lista",
    greeting: (n) => (n ? `Hola ${n}` : "Hola"),
    intro: "El mentor te ha escrito una carta sobre esta semana. Léela en la app cuando tengas un momento:",
    htmlIntro: "El mentor te ha escrito una carta sobre esta semana. Cuando tengas un momento, léela en la app.",
    cta: "Leer la carta",
    footerNote: "Recibes este aviso porque tienes activada la carta semanal.",
    signature: `— ${BRAND_NAME.es}`,
  },
  en: {
    subject: "Your letter for this week is ready",
    greeting: (n) => (n ? `Hi ${n}` : "Hi"),
    intro: "The mentor has written you a letter about this week. Read it in the app when you have a moment:",
    htmlIntro: "The mentor has written you a letter about this week. When you have a moment, read it in the app.",
    cta: "Read the letter",
    footerNote: "You're receiving this because you have the weekly letter enabled.",
    signature: `— ${BRAND_NAME.en}`,
  },
  pt: {
    subject: "A tua carta desta semana está pronta",
    greeting: (n) => (n ? `Olá ${n}` : "Olá"),
    intro: "O mentor escreveu-te uma carta sobre esta semana. Lê-a na app quando tiveres um momento:",
    htmlIntro: "O mentor escreveu-te uma carta sobre esta semana. Quando tiveres um momento, lê-a na app.",
    cta: "Ler a carta",
    footerNote: "Recebes este aviso porque tens a carta semanal ativada.",
    signature: `— ${BRAND_NAME.pt}`,
  },
  fr: {
    subject: "Ta lettre de la semaine est prête",
    greeting: (n) => (n ? `Salut ${n}` : "Salut"),
    intro: "Le mentor t'a écrit une lettre sur cette semaine. Lis-la dans l'app quand tu as un moment :",
    htmlIntro: "Le mentor t'a écrit une lettre sur cette semaine. Quand tu as un moment, lis-la dans l'app.",
    cta: "Lire la lettre",
    footerNote: "Tu reçois cet avis parce que tu as activé la lettre hebdomadaire.",
    signature: `— ${BRAND_NAME.fr}`,
  },
};
