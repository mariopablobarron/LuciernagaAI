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

// ─── Family / trusted contact ────────────────────────────────────────────────
// Estos emails se envían al CONTACTO de confianza del usuario, no al usuario.
// El idioma se hereda del usuario titular: si Mario usa la app en EN, su
// madre recibe el invite en EN (asumimos que comparten contexto lingüístico).

/**
 * Texto de orientación por tipo de relación, dentro del email de invitación
 * familiar. Le explicamos al contacto qué se espera de él según su relación
 * con el usuario.
 */
export type FamilyRelationKey = "madre" | "padre" | "pareja" | "amigo/a" | "terapeuta" | "default";

export const FAMILY_RELATION_GUIDANCE: Record<EmailLocale, Record<FamilyRelationKey, {
  role: string;
  doThis: string;
  dontDoThis: string;
}>> = {
  es: {
    madre: {
      role: "Tu hijo/a confía en ti para esto. Eso dice mucho de vuestra relación.",
      doThis: "Estar disponible. Un mensaje natural de vez en cuando. Celebrar los pequeños avances.",
      dontDoThis: "Intentar arreglarlo todo. Preguntar si ya entró a la app. Dar sermones.",
    },
    padre: {
      role: "Tu hijo/a confía en ti para esto. Eso dice mucho de vuestra relación.",
      doThis: "Estar disponible. Un mensaje natural de vez en cuando. Celebrar los pequeños avances.",
      dontDoThis: "Intentar arreglarlo todo. Preguntar si ya entró a la app. Dar sermones.",
    },
    pareja: {
      role: "Tu pareja ha elegido compartir este proceso contigo. Eso es un acto de confianza.",
      doThis: "Acompañar sin controlar. Preguntar cómo está sin esperar que hable de la app.",
      dontDoThis: "Usar esta información en discusiones. Vigilar su progreso. Presionar.",
    },
    "amigo/a": {
      role: "Que te haya elegido como apoyo significa que confía en ti de verdad.",
      doThis: "Ser natural. Proponer planes juntos. Enviar un mensaje cuando te acuerdes.",
      dontDoThis: "Cambiar cómo le tratas. Dar consejos no pedidos. Hablar de su proceso con otros.",
    },
    terapeuta: {
      role: "Esta información complementa tu trabajo clínico con consentimiento explícito.",
      doThis: "Usar los datos como contexto entre sesiones. Observar patrones de evitación o crisis.",
      dontDoThis: "Mencionar datos del portal sin que el paciente los traiga primero a sesión.",
    },
    default: {
      role: "Has sido elegido/a como persona de confianza. Eso es un privilegio.",
      doThis: "Estar presente. Un mensaje natural de vez en cuando. Celebrar avances.",
      dontDoThis: "Presionar. Vigilar. Usar esta información para confrontar.",
    },
  },
  en: {
    madre: {
      role: "Your child trusts you with this. That says a lot about your relationship.",
      doThis: "Be available. A natural message every once in a while. Celebrate the small steps.",
      dontDoThis: "Try to fix everything. Ask whether they've opened the app. Give lectures.",
    },
    padre: {
      role: "Your child trusts you with this. That says a lot about your relationship.",
      doThis: "Be available. A natural message every once in a while. Celebrate the small steps.",
      dontDoThis: "Try to fix everything. Ask whether they've opened the app. Give lectures.",
    },
    pareja: {
      role: "Your partner has chosen to share this process with you. That's an act of trust.",
      doThis: "Accompany without controlling. Ask how they are without expecting them to talk about the app.",
      dontDoThis: "Use this information in arguments. Monitor their progress. Push.",
    },
    "amigo/a": {
      role: "Being chosen as support means they truly trust you.",
      doThis: "Be natural. Suggest plans together. Send a message when they come to mind.",
      dontDoThis: "Change how you treat them. Give unsolicited advice. Talk about their process with others.",
    },
    terapeuta: {
      role: "This information complements your clinical work with explicit consent.",
      doThis: "Use the data as context between sessions. Watch for avoidance or crisis patterns.",
      dontDoThis: "Mention portal data unless the patient brings it up in session first.",
    },
    default: {
      role: "You've been chosen as a trusted person. That's a privilege.",
      doThis: "Be present. A natural message every once in a while. Celebrate progress.",
      dontDoThis: "Push. Monitor. Use this information to confront.",
    },
  },
  pt: {
    madre: {
      role: "O teu filho/a confia em ti para isto. Isso diz muito sobre a vossa relação.",
      doThis: "Estar disponível. Uma mensagem natural de vez em quando. Celebrar os pequenos passos.",
      dontDoThis: "Tentar resolver tudo. Perguntar se já entrou na app. Dar sermões.",
    },
    padre: {
      role: "O teu filho/a confia em ti para isto. Isso diz muito sobre a vossa relação.",
      doThis: "Estar disponível. Uma mensagem natural de vez em quando. Celebrar os pequenos passos.",
      dontDoThis: "Tentar resolver tudo. Perguntar se já entrou na app. Dar sermões.",
    },
    pareja: {
      role: "O teu/A tua parceiro/a escolheu partilhar este processo contigo. É um ato de confiança.",
      doThis: "Acompanhar sem controlar. Perguntar como está sem esperar que fale da app.",
      dontDoThis: "Usar esta informação em discussões. Vigiar o progresso. Pressionar.",
    },
    "amigo/a": {
      role: "Que te tenha escolhido como apoio significa que confia mesmo em ti.",
      doThis: "Ser natural. Propor planos juntos. Enviar uma mensagem quando te lembrares.",
      dontDoThis: "Mudar a forma como o/a tratas. Dar conselhos não pedidos. Falar do processo com outros.",
    },
    terapeuta: {
      role: "Esta informação complementa o teu trabalho clínico com consentimento explícito.",
      doThis: "Usar os dados como contexto entre sessões. Observar padrões de evitação ou crise.",
      dontDoThis: "Mencionar dados do portal sem que o/a paciente os traga primeiro a sessão.",
    },
    default: {
      role: "Foste escolhido/a como pessoa de confiança. É um privilégio.",
      doThis: "Estar presente. Uma mensagem natural de vez em quando. Celebrar avanços.",
      dontDoThis: "Pressionar. Vigiar. Usar esta informação para confrontar.",
    },
  },
  fr: {
    madre: {
      role: "Ton enfant te fait confiance pour cela. Ça en dit long sur votre relation.",
      doThis: "Être disponible. Un message naturel de temps en temps. Célébrer les petits pas.",
      dontDoThis: "Essayer de tout réparer. Demander s'il/elle a ouvert l'app. Faire la morale.",
    },
    padre: {
      role: "Ton enfant te fait confiance pour cela. Ça en dit long sur votre relation.",
      doThis: "Être disponible. Un message naturel de temps en temps. Célébrer les petits pas.",
      dontDoThis: "Essayer de tout réparer. Demander s'il/elle a ouvert l'app. Faire la morale.",
    },
    pareja: {
      role: "Ton/Ta partenaire a choisi de partager ce processus avec toi. C'est un acte de confiance.",
      doThis: "Accompagner sans contrôler. Demander comment il/elle va sans attendre qu'il/elle parle de l'app.",
      dontDoThis: "Utiliser cette information dans des disputes. Surveiller ses progrès. Mettre la pression.",
    },
    "amigo/a": {
      role: "T'avoir choisi comme soutien signifie qu'il/elle te fait vraiment confiance.",
      doThis: "Être naturel(le). Proposer des plans ensemble. Envoyer un message quand tu y penses.",
      dontDoThis: "Changer ta façon de le/la traiter. Donner des conseils non sollicités. Parler de son processus avec d'autres.",
    },
    terapeuta: {
      role: "Cette information complète ton travail clinique avec consentement explicite.",
      doThis: "Utiliser les données comme contexte entre les séances. Repérer les schémas d'évitement ou de crise.",
      dontDoThis: "Mentionner les données du portail sans que le/la patient(e) les amène d'abord en séance.",
    },
    default: {
      role: "Tu as été choisi(e) comme personne de confiance. C'est un privilège.",
      doThis: "Être présent(e). Un message naturel de temps en temps. Célébrer les progrès.",
      dontDoThis: "Mettre la pression. Surveiller. Utiliser cette information pour confronter.",
    },
  },
};

/** Email de invitación al contacto de confianza. */
export const FAMILY_INVITE_STRINGS: Record<EmailLocale, {
  subjectTpl: (userName: string) => string;
  greeting: (contactName: string) => string;
  introTpl: (userName: string, relation: string) => string;
  doHeader: string;
  dontHeader: string;
  goldenRuleTitle: string;
  goldenRuleBody: string;
  saveLink: string;
  cta: string;
  textGoldenRule: string;
  textPortalLabel: string;
}> = {
  es: {
    subjectTpl: (userName) => `${userName} confía en ti — portal de apoyo`,
    greeting: (n) => `Hola ${n}`,
    introTpl: (userName, relation) => `${userName} te ha elegido como su ${relation} de confianza en ${BRAND_NAME.es}. Está trabajando en su bienestar emocional y ha decidido que tú formes parte de ese proceso.`,
    doHeader: "🟢 Lo que sí puedes hacer:",
    dontHeader: "🔴 Lo que no deberías hacer:",
    goldenRuleTitle: "Regla de oro",
    goldenRuleBody: "No le menciones lo que ves en el portal. Si le dices \"vi que llevas días sin entrar\", rompes la confianza del proceso. El sistema ya le acompaña. Tu papel es estar — no vigilar.",
    saveLink: "Guarda este enlace — es tu acceso permanente:",
    cta: "Abrir mi portal",
    textGoldenRule: "REGLA DE ORO: No le menciones lo que ves en el portal. Tu papel es estar, no vigilar.",
    textPortalLabel: "Tu portal:",
  },
  en: {
    subjectTpl: (userName) => `${userName} trusts you — support portal`,
    greeting: (n) => `Hi ${n}`,
    introTpl: (userName, relation) => `${userName} has chosen you as their trusted ${relation} on ${BRAND_NAME.en}. They're working on their emotional wellbeing and have decided you should be part of that process.`,
    doHeader: "🟢 What you can do:",
    dontHeader: "🔴 What you shouldn't do:",
    goldenRuleTitle: "Golden rule",
    goldenRuleBody: "Don't mention what you see in the portal. If you say \"I noticed you haven't been on in days\", you break the trust of the process. The system is already with them. Your role is to be there — not to monitor.",
    saveLink: "Save this link — it's your permanent access:",
    cta: "Open my portal",
    textGoldenRule: "GOLDEN RULE: Don't mention what you see in the portal. Your role is to be there, not monitor.",
    textPortalLabel: "Your portal:",
  },
  pt: {
    subjectTpl: (userName) => `${userName} confia em ti — portal de apoio`,
    greeting: (n) => `Olá ${n}`,
    introTpl: (userName, relation) => `${userName} escolheu-te como o teu/a tua ${relation} de confiança em ${BRAND_NAME.pt}. Está a trabalhar no seu bem-estar emocional e decidiu que tu fizesses parte desse processo.`,
    doHeader: "🟢 O que podes fazer:",
    dontHeader: "🔴 O que não deves fazer:",
    goldenRuleTitle: "Regra de ouro",
    goldenRuleBody: "Não lhe menciones o que vês no portal. Se lhe disseres \"vi que não entras há dias\", quebras a confiança do processo. O sistema já o/a acompanha. O teu papel é estar — não vigiar.",
    saveLink: "Guarda este link — é o teu acesso permanente:",
    cta: "Abrir o meu portal",
    textGoldenRule: "REGRA DE OURO: Não lhe menciones o que vês no portal. O teu papel é estar, não vigiar.",
    textPortalLabel: "O teu portal:",
  },
  fr: {
    subjectTpl: (userName) => `${userName} te fait confiance — portail de soutien`,
    greeting: (n) => `Salut ${n}`,
    introTpl: (userName, relation) => `${userName} t'a choisi(e) comme son/sa ${relation} de confiance sur ${BRAND_NAME.fr}. Il/Elle travaille sur son bien-être émotionnel et a décidé que tu fasses partie de ce processus.`,
    doHeader: "🟢 Ce que tu peux faire :",
    dontHeader: "🔴 Ce que tu ne devrais pas faire :",
    goldenRuleTitle: "Règle d'or",
    goldenRuleBody: "Ne lui mentionne pas ce que tu vois dans le portail. Si tu lui dis \"j'ai vu que tu n'es pas venu depuis des jours\", tu brises la confiance du processus. Le système l'accompagne déjà. Ton rôle, c'est d'être là — pas de surveiller.",
    saveLink: "Garde ce lien — c'est ton accès permanent :",
    cta: "Ouvrir mon portail",
    textGoldenRule: "RÈGLE D'OR : Ne lui mentionne pas ce que tu vois dans le portail. Ton rôle, c'est d'être là, pas de surveiller.",
    textPortalLabel: "Ton portail :",
  },
};

/** Email de crisis a la familia. */
export const FAMILY_CRISIS_STRINGS: Record<EmailLocale, {
  subjectTpl: (userName: string) => string;
  greeting: (contactName: string) => string;
  alertTpl: (userName: string) => string;
  bodyAfter: string;
  emergencyNote: string;
  cta: string;
  textBodyTpl: (userName: string, portalUrl: string) => string;
}> = {
  es: {
    subjectTpl: (userName) => `⚠️ ${userName} puede necesitar apoyo ahora`,
    greeting: (n) => `Hola ${n}`,
    alertTpl: (userName) => `${BRAND_NAME.es} ha detectado una señal de crisis en la sesión de ${userName}.`,
    bodyAfter: "Esto no significa que esté en peligro inmediato, pero puede que agradezca una llamada o mensaje tuyo. Un \"Hola, estoy aquí\" puede marcar la diferencia.",
    emergencyNote: "Si crees que hay riesgo real, contacta servicios de emergencia: 112 (España) / 911",
    cta: "Ver portal",
    textBodyTpl: (userName, portalUrl) =>
      `${BRAND_NAME.es} ha detectado una señal de crisis en la sesión de ${userName}.\n\nPuede que agradezca una llamada.\nEmergencias: 112\n\nTu portal: ${portalUrl}`,
  },
  en: {
    subjectTpl: (userName) => `⚠️ ${userName} may need support now`,
    greeting: (n) => `Hi ${n}`,
    alertTpl: (userName) => `${BRAND_NAME.en} has detected a crisis signal in ${userName}'s session.`,
    bodyAfter: "This doesn't mean they're in immediate danger, but they may welcome a call or message from you. A simple \"Hey, I'm here\" can make the difference.",
    emergencyNote: "If you believe there's real risk, contact emergency services: 911 (US) / 112 (EU)",
    cta: "View portal",
    textBodyTpl: (userName, portalUrl) =>
      `${BRAND_NAME.en} has detected a crisis signal in ${userName}'s session.\n\nThey may welcome a call.\nEmergencies: 911 / 112\n\nYour portal: ${portalUrl}`,
  },
  pt: {
    subjectTpl: (userName) => `⚠️ ${userName} pode precisar de apoio agora`,
    greeting: (n) => `Olá ${n}`,
    alertTpl: (userName) => `${BRAND_NAME.pt} detetou um sinal de crise na sessão de ${userName}.`,
    bodyAfter: "Isto não significa que esteja em perigo imediato, mas pode agradecer uma chamada ou mensagem tua. Um \"Olá, estou aqui\" pode fazer a diferença.",
    emergencyNote: "Se achas que há risco real, contacta serviços de emergência: 112 (Portugal) / SNS 24: 808 24 24 24",
    cta: "Ver portal",
    textBodyTpl: (userName, portalUrl) =>
      `${BRAND_NAME.pt} detetou um sinal de crise na sessão de ${userName}.\n\nPode agradecer uma chamada.\nEmergências: 112 / SNS 24: 808 24 24 24\n\nO teu portal: ${portalUrl}`,
  },
  fr: {
    subjectTpl: (userName) => `⚠️ ${userName} a peut-être besoin de soutien maintenant`,
    greeting: (n) => `Salut ${n}`,
    alertTpl: (userName) => `${BRAND_NAME.fr} a détecté un signal de crise dans la session de ${userName}.`,
    bodyAfter: "Cela ne veut pas dire qu'il/elle est en danger immédiat, mais un appel ou un message de ta part pourrait être apprécié. Un simple \"Salut, je suis là\" peut faire la différence.",
    emergencyNote: "Si tu penses qu'il y a un risque réel, contacte les services d'urgence : 112 (France/UE) / 3114 (Numéro national de prévention du suicide)",
    cta: "Voir le portail",
    textBodyTpl: (userName, portalUrl) =>
      `${BRAND_NAME.fr} a détecté un signal de crise dans la session de ${userName}.\n\nIl/Elle pourrait apprécier un appel.\nUrgences : 112 / 3114\n\nTon portail : ${portalUrl}`,
  },
};

/** Email de inactividad a la familia. */
export const FAMILY_INACTIVITY_STRINGS: Record<EmailLocale, {
  subjectTpl: (userName: string, days: number) => string;
  greeting: (contactName: string) => string;
  introTpl: (userName: string, days: number) => string;
  hint: string;
  cta: string;
  textBodyTpl: (userName: string, days: number, portalUrl: string) => string;
}> = {
  es: {
    subjectTpl: (userName, days) => `${userName} lleva ${days} días sin actividad en ${BRAND_NAME.es}`,
    greeting: (n) => `Hola ${n}`,
    introTpl: (userName, days) => `${userName} lleva ${days} días sin abrir la app ni hacer check-in. Puede que esté bien, pero tú pediste que te avisáramos si esto pasaba.`,
    hint: "A veces un mensaje corto de alguien de confianza es lo que necesita para retomar.",
    cta: "Ver portal",
    textBodyTpl: (userName, days, portalUrl) =>
      `${userName} lleva ${days} días sin actividad.\n\nTu portal: ${portalUrl}`,
  },
  en: {
    subjectTpl: (userName, days) => `${userName} has been ${days} days inactive on ${BRAND_NAME.en}`,
    greeting: (n) => `Hi ${n}`,
    introTpl: (userName, days) => `${userName} hasn't opened the app or done a check-in for ${days} days. They may be fine, but you asked us to let you know if this happened.`,
    hint: "Sometimes a short message from someone they trust is what they need to come back.",
    cta: "View portal",
    textBodyTpl: (userName, days, portalUrl) =>
      `${userName} has been ${days} days inactive.\n\nYour portal: ${portalUrl}`,
  },
  pt: {
    subjectTpl: (userName, days) => `${userName} está há ${days} dias sem atividade em ${BRAND_NAME.pt}`,
    greeting: (n) => `Olá ${n}`,
    introTpl: (userName, days) => `${userName} está há ${days} dias sem abrir a app nem fazer check-in. Pode estar bem, mas tu pediste para te avisarmos se isto acontecesse.`,
    hint: "Às vezes uma mensagem curta de alguém de confiança é o que é preciso para retomar.",
    cta: "Ver portal",
    textBodyTpl: (userName, days, portalUrl) =>
      `${userName} está há ${days} dias sem atividade.\n\nO teu portal: ${portalUrl}`,
  },
  fr: {
    subjectTpl: (userName, days) => `${userName} est inactif/ve depuis ${days} jours sur ${BRAND_NAME.fr}`,
    greeting: (n) => `Salut ${n}`,
    introTpl: (userName, days) => `${userName} n'a pas ouvert l'app ni fait de check-in depuis ${days} jours. Il/Elle va peut-être bien, mais tu nous avais demandé de te prévenir si ça arrivait.`,
    hint: "Parfois un court message d'une personne de confiance, c'est tout ce qu'il faut pour reprendre.",
    cta: "Voir le portail",
    textBodyTpl: (userName, days, portalUrl) =>
      `${userName} est inactif/ve depuis ${days} jours.\n\nTon portail : ${portalUrl}`,
  },
};

/** Email cuando el usuario comparte una victoria con la familia. */
export const FAMILY_WIN_STRINGS: Record<EmailLocale, {
  subjectTpl: (userName: string) => string;
  greeting: (contactName: string) => string;
  introTpl: (userName: string) => string;
  closing: string;
  cta: string;
  textBodyTpl: (userName: string, winNote: string, portalUrl: string) => string;
}> = {
  es: {
    subjectTpl: (userName) => `🎉 ${userName} ha anotado una victoria`,
    greeting: (n) => `Hola ${n}`,
    introTpl: (userName) => `${userName} acaba de registrar una victoria en ${BRAND_NAME.es} y quiso compartirla contigo:`,
    closing: "¡Vale la pena celebrarlo!",
    cta: "Ver portal",
    textBodyTpl: (userName, winNote, portalUrl) =>
      `${userName} ha anotado una victoria: "${winNote}"\n\nTu portal: ${portalUrl}`,
  },
  en: {
    subjectTpl: (userName) => `🎉 ${userName} just logged a win`,
    greeting: (n) => `Hi ${n}`,
    introTpl: (userName) => `${userName} just recorded a win on ${BRAND_NAME.en} and wanted to share it with you:`,
    closing: "Worth celebrating!",
    cta: "View portal",
    textBodyTpl: (userName, winNote, portalUrl) =>
      `${userName} logged a win: "${winNote}"\n\nYour portal: ${portalUrl}`,
  },
  pt: {
    subjectTpl: (userName) => `🎉 ${userName} acabou de registar uma vitória`,
    greeting: (n) => `Olá ${n}`,
    introTpl: (userName) => `${userName} acabou de registar uma vitória em ${BRAND_NAME.pt} e quis partilhá-la contigo:`,
    closing: "Vale a pena celebrar!",
    cta: "Ver portal",
    textBodyTpl: (userName, winNote, portalUrl) =>
      `${userName} registou uma vitória: "${winNote}"\n\nO teu portal: ${portalUrl}`,
  },
  fr: {
    subjectTpl: (userName) => `🎉 ${userName} vient de noter une victoire`,
    greeting: (n) => `Salut ${n}`,
    introTpl: (userName) => `${userName} vient d'enregistrer une victoire sur ${BRAND_NAME.fr} et a voulu la partager avec toi :`,
    closing: "Ça vaut le coup de fêter !",
    cta: "Voir le portail",
    textBodyTpl: (userName, winNote, portalUrl) =>
      `${userName} a noté une victoire : "${winNote}"\n\nTon portail : ${portalUrl}`,
  },
};

/** Email cuando el usuario recibe un mensaje de apoyo de su contacto. */
export const SUPPORT_MESSAGE_STRINGS: Record<EmailLocale, {
  subjectTpl: (fromName: string) => string;
  introTpl: (fromName: string) => string;
  closing: string;
  cta: string;
  textBodyTpl: (fromName: string, content: string, appUrl: string) => string;
}> = {
  es: {
    subjectTpl: (fromName) => `💌 ${fromName} te ha enviado un mensaje de apoyo`,
    introTpl: (fromName) => `${fromName} te ha dejado este mensaje:`,
    closing: "Puedes verlo en la app cuando quieras.",
    cta: "Ver en la app",
    textBodyTpl: (fromName, content, appUrl) =>
      `${fromName} te ha enviado un mensaje:\n\n"${content}"\n\nVer en la app: ${appUrl}`,
  },
  en: {
    subjectTpl: (fromName) => `💌 ${fromName} sent you a message of support`,
    introTpl: (fromName) => `${fromName} left you this message:`,
    closing: "You can read it in the app whenever you want.",
    cta: "View in the app",
    textBodyTpl: (fromName, content, appUrl) =>
      `${fromName} sent you a message:\n\n"${content}"\n\nView in the app: ${appUrl}`,
  },
  pt: {
    subjectTpl: (fromName) => `💌 ${fromName} enviou-te uma mensagem de apoio`,
    introTpl: (fromName) => `${fromName} deixou-te esta mensagem:`,
    closing: "Podes vê-la na app quando quiseres.",
    cta: "Ver na app",
    textBodyTpl: (fromName, content, appUrl) =>
      `${fromName} enviou-te uma mensagem:\n\n"${content}"\n\nVer na app: ${appUrl}`,
  },
  fr: {
    subjectTpl: (fromName) => `💌 ${fromName} t'a envoyé un message de soutien`,
    introTpl: (fromName) => `${fromName} t'a laissé ce message :`,
    closing: "Tu peux le voir dans l'app quand tu veux.",
    cta: "Voir dans l'app",
    textBodyTpl: (fromName, content, appUrl) =>
      `${fromName} t'a envoyé un message :\n\n"${content}"\n\nVoir dans l'app : ${appUrl}`,
  },
};

// ─── Circles ─────────────────────────────────────────────────────────────────

/** Email cuando se abre un nuevo pulso en el círculo del usuario. */
export const CIRCLE_PULSE_OPENED_STRINGS: Record<EmailLocale, {
  subject: string;
  greeting: (firstName: string | null) => string;
  introHtmlTpl: (closeDate: string) => string;
  introTextTpl: (closeDate: string) => string;
  unlocks: string;
  cta: string;
  signature: string;
  // Formato de fecha BCP47 — el caller lo formatea con Intl.DateTimeFormat(loc)
}> = {
  es: {
    subject: "Hay un nuevo pulso en tu círculo",
    greeting: (n) => (n ? `Hola ${n}` : "Hola"),
    introHtmlTpl: (closeDate) => `Hay un pulso abierto en tu círculo. Responde cuando quieras antes del ${closeDate}.`,
    introTextTpl: (closeDate) => `Hay un pulso abierto en tu círculo.\n\nTienes hasta el ${closeDate} para responder cuando quieras.`,
    unlocks: "Tu respuesta desbloquea las del resto del círculo.",
    cta: "Responder al pulso",
    signature: `— ${BRAND_NAME.es}`,
  },
  en: {
    subject: "There's a new pulse in your circle",
    greeting: (n) => (n ? `Hi ${n}` : "Hi"),
    introHtmlTpl: (closeDate) => `There's a pulse open in your circle. Respond whenever you want before ${closeDate}.`,
    introTextTpl: (closeDate) => `There's a pulse open in your circle.\n\nYou have until ${closeDate} to respond whenever you want.`,
    unlocks: "Your response unlocks the rest of the circle's.",
    cta: "Respond to the pulse",
    signature: `— ${BRAND_NAME.en}`,
  },
  pt: {
    subject: "Há um novo pulso no teu círculo",
    greeting: (n) => (n ? `Olá ${n}` : "Olá"),
    introHtmlTpl: (closeDate) => `Há um pulso aberto no teu círculo. Responde quando quiseres antes de ${closeDate}.`,
    introTextTpl: (closeDate) => `Há um pulso aberto no teu círculo.\n\nTens até ${closeDate} para responder quando quiseres.`,
    unlocks: "A tua resposta desbloqueia as do resto do círculo.",
    cta: "Responder ao pulso",
    signature: `— ${BRAND_NAME.pt}`,
  },
  fr: {
    subject: "Il y a un nouveau pulse dans ton cercle",
    greeting: (n) => (n ? `Salut ${n}` : "Salut"),
    introHtmlTpl: (closeDate) => `Il y a un pulse ouvert dans ton cercle. Réponds quand tu veux avant le ${closeDate}.`,
    introTextTpl: (closeDate) => `Il y a un pulse ouvert dans ton cercle.\n\nTu as jusqu'au ${closeDate} pour répondre quand tu veux.`,
    unlocks: "Ta réponse débloque celles du reste du cercle.",
    cta: "Répondre au pulse",
    signature: `— ${BRAND_NAME.fr}`,
  },
};

/** Email cuando el mentor publica una devolución privada para el usuario. */
export const MENTOR_REFLECTION_STRINGS: Record<EmailLocale, {
  subject: string;
  greeting: (firstName: string | null) => string;
  intro: string;
  weekQuestion: string;
  textPrefix: string;
  cta: string;
  signature: string;
}> = {
  es: {
    subject: "Tienes una devolución privada del mentor",
    greeting: (n) => (n ? `Hola ${n}` : "Hola"),
    intro: "El mentor te ha dejado una devolución privada sobre el último pulso del círculo. Solo tú la ves.",
    weekQuestion: "Pregunta de la semana:",
    textPrefix: "El mentor te ha dejado una devolución privada sobre lo que se compartió en el último pulso del círculo.",
    cta: "Leer la devolución",
    signature: `— ${BRAND_NAME.es}`,
  },
  en: {
    subject: "You have a private reflection from the mentor",
    greeting: (n) => (n ? `Hi ${n}` : "Hi"),
    intro: "The mentor has left you a private reflection on the latest circle pulse. Only you can see it.",
    weekQuestion: "This week's question:",
    textPrefix: "The mentor has left you a private reflection on what was shared in the latest circle pulse.",
    cta: "Read the reflection",
    signature: `— ${BRAND_NAME.en}`,
  },
  pt: {
    subject: "Tens uma devolução privada do mentor",
    greeting: (n) => (n ? `Olá ${n}` : "Olá"),
    intro: "O mentor deixou-te uma devolução privada sobre o último pulso do círculo. Só tu a vês.",
    weekQuestion: "Pergunta da semana:",
    textPrefix: "O mentor deixou-te uma devolução privada sobre o que foi partilhado no último pulso do círculo.",
    cta: "Ler a devolução",
    signature: `— ${BRAND_NAME.pt}`,
  },
  fr: {
    subject: "Tu as un retour privé du mentor",
    greeting: (n) => (n ? `Salut ${n}` : "Salut"),
    intro: "Le mentor t'a laissé un retour privé sur le dernier pulse du cercle. Toi seul(e) peux le voir.",
    weekQuestion: "Question de la semaine :",
    textPrefix: "Le mentor t'a laissé un retour privé sur ce qui a été partagé dans le dernier pulse du cercle.",
    cta: "Lire le retour",
    signature: `— ${BRAND_NAME.fr}`,
  },
};

/** Email de cierre de círculo (carta final). */
export type CircleClosingReason = "cycle_end" | "drift" | "left" | "removed";

export const CIRCLE_CLOSING_STRINGS: Record<EmailLocale, {
  subjectTpl: (circleName: string) => string;
  greeting: (firstName: string | null) => string;
  reasonLabel: Record<CircleClosingReason, string>;
  reasonFallback: string;
  closing: string;
  textPathLabel: string;
  cta: string;
  signature: string;
}> = {
  es: {
    subjectTpl: (circleName) => `Carta de cierre — ${circleName}`,
    greeting: (n) => (n ? `Hola ${n}` : "Hola"),
    reasonLabel: {
      cycle_end: "El ciclo de seis semanas termina",
      drift: "Tu fase ha cambiado",
      left: "Has salido del círculo",
      removed: "El círculo cierra",
    },
    reasonFallback: "Tu paso por el círculo termina",
    closing: "Esta carta queda archivada en tu perfil. Lo que dijiste y lo que callaste sigue siendo tuyo.",
    textPathLabel: "Esta carta queda archivada en tu perfil:",
    cta: "Ver mis cartas",
    signature: `— ${BRAND_NAME.es}`,
  },
  en: {
    subjectTpl: (circleName) => `Closing letter — ${circleName}`,
    greeting: (n) => (n ? `Hi ${n}` : "Hi"),
    reasonLabel: {
      cycle_end: "The six-week cycle ends",
      drift: "Your phase has changed",
      left: "You've left the circle",
      removed: "The circle is closing",
    },
    reasonFallback: "Your time in the circle ends",
    closing: "This letter is archived in your profile. What you said and what you didn't is still yours.",
    textPathLabel: "This letter is archived in your profile:",
    cta: "View my letters",
    signature: `— ${BRAND_NAME.en}`,
  },
  pt: {
    subjectTpl: (circleName) => `Carta de fecho — ${circleName}`,
    greeting: (n) => (n ? `Olá ${n}` : "Olá"),
    reasonLabel: {
      cycle_end: "O ciclo de seis semanas termina",
      drift: "A tua fase mudou",
      left: "Saíste do círculo",
      removed: "O círculo fecha",
    },
    reasonFallback: "A tua passagem pelo círculo termina",
    closing: "Esta carta fica arquivada no teu perfil. O que disseste e o que calaste continua a ser teu.",
    textPathLabel: "Esta carta fica arquivada no teu perfil:",
    cta: "Ver as minhas cartas",
    signature: `— ${BRAND_NAME.pt}`,
  },
  fr: {
    subjectTpl: (circleName) => `Lettre de clôture — ${circleName}`,
    greeting: (n) => (n ? `Salut ${n}` : "Salut"),
    reasonLabel: {
      cycle_end: "Le cycle de six semaines se termine",
      drift: "Ta phase a changé",
      left: "Tu as quitté le cercle",
      removed: "Le cercle ferme",
    },
    reasonFallback: "Ton passage dans le cercle se termine",
    closing: "Cette lettre reste archivée dans ton profil. Ce que tu as dit et ce que tu as tu reste tien.",
    textPathLabel: "Cette lettre reste archivée dans ton profil :",
    cta: "Voir mes lettres",
    signature: `— ${BRAND_NAME.fr}`,
  },
};
