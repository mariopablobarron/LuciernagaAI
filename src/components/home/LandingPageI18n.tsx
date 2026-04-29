// Server component: el árbol completo (557 LOC) se renderiza en server.
// Los hijos interactivos (Header, Footer, HeartbeatParticles, Reveal,
// RevealWords, ChatDemo) son ya client components y siguen funcionando
// porque Next.js permite anidarlos como children. Resultado: bundle de
// cliente reducido drásticamente (toda la copia y layout sale de aquí).
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, ShieldCheck, Zap, Target, Sparkles, Bot, Users, X } from 'lucide-react';
import Header from '@/components/home/Header';
import Footer from '@/components/home/Footer';
import HeartbeatParticles from '@/components/effects/HeartbeatParticles';
import Reveal, { RevealWords } from '@/components/effects/Reveal';
import ChatDemo from '@/components/home/ChatDemo';

const FEATURES_KEYS = ['noJudgment', 'realState', 'concreteAction'] as const;
const FEATURE_ICONS = [ShieldCheck, Zap, Target] as const;
const FEATURE_COLORS = [
  { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25', glow: 'rgba(167,139,250,0.25)' },
  { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', glow: 'rgba(34,211,238,0.25)' },
  { color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/25', glow: 'rgba(232,121,249,0.25)' },
];

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type LandingProps = {
  founderPhotoUrl?: string;
  advisorPhotoUrl?: string | null;
};

export default async function LandingPageI18n({
  founderPhotoUrl = '/team/mario.png',
  advisorPhotoUrl = null,
}: LandingProps = {}) {
  const t = await getTranslations();
  const advisorInitials = getInitials(t('team.advisor.name'));

  const tickerItems = [
    '+200 personas usándolo cada semana',
    'sin registro · sin email',
    'mentoría con IA en español',
    'método supervisado por psicóloga clínica',
    'gratis durante el MVP',
    'una conversación, un siguiente paso',
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden relative isolate">
      <HeartbeatParticles />
      <div className="relative z-10">
      <Header />

      {/* HERO ─────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[28rem] h-[28rem] rounded-full bg-violet-500/20 blur-3xl vignette-breathe" />
          <div className="absolute top-1/2 right-0 w-[28rem] h-[28rem] rounded-full bg-fuchsia-500/15 blur-3xl vignette-breathe" style={{ animationDelay: '1.5s' }} />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-cyan-500/12 blur-3xl vignette-breathe" style={{ animationDelay: '3s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-32">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-7 sm:space-y-8">
              <Reveal delay={0} y={12} blur={3}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/40 bg-violet-500/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                  </span>
                  <span className="text-[11px] font-medium text-violet-300 uppercase tracking-wider">
                    {t('hero.badge')}
                  </span>
                </div>
              </Reveal>

              <div className="space-y-5">
                <h1
                  className="text-[40px] sm:text-5xl lg:text-[68px] xl:text-7xl leading-[1.05] tracking-tight font-light"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  <RevealWords
                    text={t('hero.title')}
                    baseDelay={150}
                    step={70}
                    className="block text-white"
                  />
                  <span className="block mt-1">
                    <RevealWords
                      text={t('hero.titleHighlight')}
                      baseDelay={650}
                      step={70}
                      wordClassName="italic bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"
                    />
                  </span>
                </h1>

                <Reveal delay={1100} y={12}>
                  <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl">
                    {t('hero.subtitle')}
                  </p>
                </Reveal>
              </div>

              <Reveal delay={1300} y={10}>
                <ul className="space-y-2.5 max-w-xl">
                  {(['bullet1', 'bullet2', 'bullet3'] as const).map((key, i) => (
                    <li key={key} className="flex items-start gap-3 text-zinc-200">
                      <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-linear-to-br from-violet-500/30 to-fuchsia-500/20 ring-1 ring-violet-500/40 flex items-center justify-center text-[10px] font-medium text-violet-200">
                        {i + 1}
                      </span>
                      <span className="text-sm sm:text-base leading-snug">{t(`hero.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={1500} y={10}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/app"
                    className="group relative inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 hover:scale-[1.02] overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-linear-to-r from-fuchsia-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative">{t('hero.cta')}</span>
                    <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-zinc-300 border border-zinc-700 hover:border-violet-500/50 hover:text-white hover:bg-violet-500/5 transition-all"
                  >
                    {t('hero.ctaSecondary')}
                  </Link>
                </div>
                <p className="text-xs text-zinc-500 mt-3">{t('hero.noSignup')}</p>
              </Reveal>

              <Reveal delay={1700} y={10}>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex -space-x-2.5">
                    {['V', 'M', 'P', 'A', 'L'].map((initial, i) => (
                      <div
                        key={i}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white border-2 border-zinc-950 text-xs ring-1 ring-zinc-800 ${
                          ['bg-violet-500', 'bg-fuchsia-500', 'bg-violet-600', 'bg-cyan-600', 'bg-cyan-500'][i]
                        }`}
                      >
                        {initial}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm text-zinc-300 font-medium">
                      <span className="text-white font-bold">{t('hero.socialProof')}</span> {t('hero.socialProofText')}
                    </p>
                    <div className="flex gap-0.5 mt-0.5" aria-label="5 estrellas">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="text-amber-400 text-xs" aria-hidden>★</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-3">{t('hero.langNote')}</p>
              </Reveal>
            </div>

            <div className="mt-2 lg:mt-0">
              <Reveal delay={500} y={28} blur={6} duration={1000}>
                <ChatDemo />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER ───────────────────────────────────── */}
      <section className="relative isolate py-5 border-y border-zinc-800/60 overflow-hidden bg-zinc-950">
        <div className="flex ticker-scroll whitespace-nowrap">
          {tickerItems.map((item, i) => (
            <span
              key={`a-${i}`}
              className="inline-flex items-center gap-6 px-8 text-[11px] uppercase tracking-[0.3em] text-zinc-400"
            >
              {item}
              <span className="inline-block w-1 h-1 rounded-full bg-violet-400" />
            </span>
          ))}
          {tickerItems.map((item, i) => (
            <span
              key={`b-${i}`}
              aria-hidden="true"
              className="motion-reduce:hidden inline-flex items-center gap-6 px-8 text-[11px] uppercase tracking-[0.3em] text-zinc-400"
            >
              {item}
              <span className="inline-block w-1 h-1 rounded-full bg-violet-400" />
            </span>
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 w-24 sm:w-32 pointer-events-none bg-linear-to-r from-zinc-950 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-24 sm:w-32 pointer-events-none bg-linear-to-l from-zinc-950 to-transparent" />
      </section>

      {/* MANIFIESTO ───────────────────────────────── */}
      <section className="relative isolate">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <Reveal y={20}>
            <p className="text-[10px] uppercase tracking-[0.35em] mb-8 inline-flex items-center gap-3 text-violet-400">
              <span className="block w-8 h-px bg-violet-400" />
              Manifiesto
            </p>
          </Reveal>
          <p
            className="text-2xl sm:text-4xl lg:text-5xl leading-[1.2] tracking-tight font-light"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            <RevealWords
              text="Tres mil millones de latidos en una vida."
              step={55}
              className="block text-white"
            />
            <span className="block mt-3 italic text-zinc-400">
              <RevealWords
                text="¿Cuántos ya pasaron sin que los sintieras?"
                baseDelay={500}
                step={55}
              />
            </span>
          </p>
        </div>
      </section>

      {/* FEATURES ─────────────────────────────────── */}
      <section id="features" className="relative isolate py-20 sm:py-24 border-t border-zinc-800/60 scroll-mt-16 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <Reveal>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-violet-400 mb-4">
                {t('features.sectionLabel')}
              </p>
            </Reveal>
            <Reveal delay={150} y={20}>
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-light text-white mb-5 tracking-tight"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {t('features.title')}
              </h2>
            </Reveal>
            <Reveal delay={300} y={16}>
              <p className="text-zinc-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                {t('features.subtitle')}
              </p>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {FEATURES_KEYS.map((key, i) => {
              const Icon = FEATURE_ICONS[i];
              const colors = FEATURE_COLORS[i];
              return (
                <Reveal key={key} delay={i * 150} y={24} duration={800}>
                  <div
                    className={`group relative p-7 sm:p-8 rounded-2xl border bg-zinc-900/40 backdrop-blur-sm hover:bg-zinc-900/70 transition-all h-full overflow-hidden ${colors.border}`}
                  >
                    <div
                      className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at 50% 0%, ${colors.glow} 0%, transparent 60%)`,
                      }}
                    />
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className={`w-6 h-6 ${colors.color}`} aria-hidden="true" />
                      </div>
                      <h3
                        className="text-xl sm:text-2xl text-white mb-3 font-light tracking-tight"
                        style={{ fontFamily: 'var(--font-serif)' }}
                      >
                        {t(`features.${key}.title`)}
                      </h3>
                      <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                        {t(`features.${key}.description`)}
                      </p>
                      <div className="mt-6 h-0.5 w-0 bg-linear-to-r from-violet-400 to-cyan-400 group-hover:w-full transition-all duration-500" />
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS ─────────────────────────────── */}
      <section className="relative isolate py-20 sm:py-24 bg-zinc-900/30 border-y border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <Reveal>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400 mb-4">
                {t('howItWorks.sectionLabel')}
              </p>
            </Reveal>
            <Reveal delay={150} y={20}>
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {t('howItWorks.title')}
              </h2>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {(['step1', 'step2', 'step3'] as const).map((step, i) => (
              <Reveal key={step} delay={i * 180} y={20}>
                <div className="text-center space-y-3 group">
                  <div
                    className="text-5xl lg:text-6xl font-light bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent group-hover:from-fuchsia-400 group-hover:to-cyan-400 transition-all"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    0{i + 1}
                  </div>
                  <h3
                    className="text-lg sm:text-xl font-light text-white tracking-tight"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {t(`howItWorks.${step}.title`)}
                  </h3>
                  <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                    {t(`howItWorks.${step}.description`)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM ─────────────────────────────────────── */}
      <section className="relative isolate py-20 sm:py-24 border-t border-zinc-800/60 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <Reveal>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-400 mb-4">
                {t('team.sectionLabel')}
              </p>
            </Reveal>
            <Reveal delay={150} y={20}>
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-light text-white mb-5 tracking-tight"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {t('team.title')}
              </h2>
            </Reveal>
            <Reveal delay={300} y={16}>
              <p className="text-zinc-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                {t('team.subtitle')}
              </p>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 mb-10">
            <Reveal y={20}>
              <div className="p-7 rounded-2xl border border-cyan-500/25 bg-cyan-500/5 h-full">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/30 flex items-center justify-center mb-4">
                  <Bot className="w-5 h-5 text-cyan-300" />
                </div>
                <h3 className="text-lg sm:text-xl font-light text-white mb-2 tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                  {t('team.aiRole.title')}
                </h3>
                <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
                  {t('team.aiRole.description')}
                </p>
              </div>
            </Reveal>
            <Reveal delay={150} y={20}>
              <div className="p-7 rounded-2xl border border-violet-500/25 bg-violet-500/5 h-full">
                <div className="w-11 h-11 rounded-xl bg-violet-500/15 ring-1 ring-violet-500/30 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-violet-300" />
                </div>
                <h3 className="text-lg sm:text-xl font-light text-white mb-2 tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                  {t('team.humanRole.title')}
                </h3>
                <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
                  {t('team.humanRole.description')}
                </p>
              </div>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Reveal y={20}>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-7 flex flex-col sm:flex-row gap-5 items-start h-full">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-linear-to-br from-violet-500 to-fuchsia-500 shrink-0 ring-2 ring-violet-500/30">
                  <Image
                    src={founderPhotoUrl}
                    alt={t('team.founder.name')}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                    {t('team.founder.name')}
                  </p>
                  <p className="text-violet-300 text-xs sm:text-sm mb-2 uppercase tracking-wider">
                    {t('team.founder.role')}
                  </p>
                  <p className="text-zinc-300 text-sm leading-relaxed">{t('team.founder.bio')}</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={150} y={20}>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-7 flex flex-col sm:flex-row gap-5 items-start h-full">
                {advisorPhotoUrl ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-linear-to-br from-cyan-500 to-violet-500 shrink-0 ring-2 ring-cyan-500/30">
                    <Image
                      src={advisorPhotoUrl}
                      alt={t('team.advisor.name')}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    aria-label={t('team.advisor.name')}
                    className="w-20 h-20 rounded-full bg-linear-to-br from-cyan-500 to-violet-500 flex items-center justify-center font-bold text-white text-2xl shrink-0 ring-2 ring-cyan-500/30"
                  >
                    {advisorInitials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                    {t('team.advisor.name')}
                  </p>
                  <p className="text-cyan-300 text-xs sm:text-sm mb-2 uppercase tracking-wider">
                    {t('team.advisor.role')}
                  </p>
                  <p className="text-zinc-300 text-sm leading-relaxed">{t('team.advisor.bio')}</p>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={300}>
            <p className="mt-10 text-sm text-zinc-400 leading-relaxed max-w-3xl mx-auto text-center border-t border-zinc-800/60 pt-8 italic" style={{ fontFamily: 'var(--font-serif)' }}>
              {t('team.transparency')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* NOT WHAT ─────────────────────────────────── */}
      <section className="relative isolate py-20 sm:py-24 bg-zinc-900/30 border-y border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <Reveal>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400 mb-4">
                {t('notWhat.sectionLabel')}
              </p>
            </Reveal>
            <Reveal delay={150} y={20}>
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {t('notWhat.title')}
              </h2>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {(['item1', 'item2', 'item3'] as const).map((key, i) => (
              <Reveal key={key} delay={i * 130} y={20}>
                <div className="p-6 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-950/40 h-full">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center mb-4">
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-light text-white mb-2 tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                    {t(`notWhat.${key}.title`)}
                  </h3>
                  <p className="text-zinc-300 leading-relaxed text-sm">{t(`notWhat.${key}.description`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA ───────────────────────────────── */}
      <section className="relative isolate py-24 sm:py-32 overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-linear-to-br from-violet-500/15 via-transparent to-fuchsia-500/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-violet-500/10 blur-3xl vignette-breathe" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.35em] inline-flex items-center gap-3 text-violet-400">
              <span className="block w-8 h-px bg-violet-400" />
              Empieza
              <span className="block w-8 h-px bg-violet-400" />
            </p>
          </Reveal>
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-light leading-[1.05] tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            <RevealWords text={t('finalCta.title1')} step={70} className="block text-white" />
            <span className="block mt-2">
              <RevealWords
                text={t('finalCta.title2')}
                baseDelay={500}
                step={70}
                wordClassName="italic bg-linear-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"
              />
            </span>
          </h2>
          <Reveal delay={1000} y={14}>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl mx-auto italic" style={{ fontFamily: 'var(--font-serif)' }}>
              {t('finalCta.subtitle')}
            </p>
          </Reveal>
          <Reveal delay={1200} y={10}>
            <div className="pt-2 flex flex-col items-center gap-3">
              <Link
                href="/app"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-xl shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 hover:scale-[1.02] text-base sm:text-lg overflow-hidden"
              >
                <span className="absolute inset-0 bg-linear-to-r from-fuchsia-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative">{t('finalCta.cta')}</span>
                <ArrowRight className="relative w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/signup" className="text-sm text-zinc-400 hover:text-zinc-200 underline underline-offset-4">
                {t('finalCta.ctaSignup')}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={1400}>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.25em]">{t('finalCta.disclaimer')}</p>
          </Reveal>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  );
}
