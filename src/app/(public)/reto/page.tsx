"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Flame, Trophy, Users, Copy, Check } from "lucide-react";
import { COMPONENTS } from "@/styles/design-system";

type RetoStats = {
  activeStreaks: number;
  completedGoals: number;
  waitlistCount: number;
};

// Estructura visual fija. Copy desde messages/{es,en,pt,fr}.json "challenge.step{1..3}".
const STEPS = [
  { id: 'step1', icon: '✍️' },
  { id: 'step2', icon: '🔥' },
  { id: 'step3', icon: '🌟' },
] as const;

const MILESTONES = [
  { id: 'milestone1', day: 1, icon: '🌱' },
  { id: 'milestone7', day: 7, icon: '🔥' },
  { id: 'milestone14', day: 14, icon: '⚡' },
  { id: 'milestone30', day: 30, icon: '🏆' },
] as const;

const TESTIMONIALS = ['testimonial1', 'testimonial2', 'testimonial3'] as const;

export default function RetoPage() {
  const t = useTranslations('challenge');
  const [stats, setStats] = useState<RetoStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/reto")
      .then((r) => r.json())
      .then((d: RetoStats) => setStats(d))
      .catch(() => { /* Non-critical stats widget */ });
  }, []);

  function copyLink() {
    void navigator.clipboard.writeText(
      typeof window !== "undefined" ? `${window.location.origin}/reto` : "/reto"
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const participants = (stats?.activeStreaks ?? 0) + (stats?.waitlistCount ?? 0);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-24 pb-20 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute left-1/2 top-20 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-fuchsia-600/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
            <Flame className="h-3.5 w-3.5" />
            {t('badge')}
          </div>

          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            {t('title')}{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              {t('titleHighlight')}
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-lg text-zinc-400 leading-relaxed">
            {t('subtitle')}
          </p>

          {/* Live counter */}
          {participants > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
              <Users className="h-4 w-4 text-fuchsia-400" />
              <span dangerouslySetInnerHTML={{
                __html: t('participantsLine', { count: participants.toLocaleString() })
                  .replace(participants.toLocaleString(), `<strong class="text-white">${participants.toLocaleString()}</strong>`)
              }} />
            </div>
          )}

          <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className={`${COMPONENTS.buttonPrimary} flex items-center gap-2 px-8 py-3 text-base`}
            >
              {t('ctaPrimary')} <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={copyLink}
              className={`${COMPONENTS.buttonSecondary} flex items-center gap-2 px-6 py-3 text-base`}
            >
              {copied ? (
                <><Check className="h-4 w-4" /> {t('ctaShareCopied')}</>
              ) : (
                <><Copy className="h-4 w-4" /> {t('ctaShare')}</>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      {stats && (
        <section className="border-y border-zinc-900 bg-zinc-950/50 px-4 py-8">
          <div className="mx-auto grid max-w-3xl grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{stats.activeStreaks}</p>
              <p className="text-xs text-zinc-500 mt-1">{t('statRachas')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.completedGoals}</p>
              <p className="text-xs text-zinc-500 mt-1">{t('statObjetivos')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">30</p>
              <p className="text-xs text-zinc-500 mt-1">{t('statDias')}</p>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">{t('stepsTitle')}</h2>
            <p className="mt-3 text-zinc-500">{t('stepsSubtitle')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3"
              >
                <div className="text-3xl">{s.icon}</div>
                <h3 className="font-semibold text-white">{t(`${s.id}.title`)}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{t(`${s.id}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones / rewards */}
      <section className="px-4 py-16 bg-zinc-950/60">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">{t('milestonesTitle')}</h2>
            <p className="mt-3 text-zinc-500">{t('milestonesSubtitle')}</p>
          </div>
          <div className="space-y-4">
            {MILESTONES.map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-lg">
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{t(`${m.id}.title`)}</p>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {t('dayLabel', { n: m.day })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">{t(`${m.id}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">{t('testimonialsTitle')}</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((id) => (
              <div key={id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-semibold text-orange-300">
                    {t('dayLabel', { n: t(`${id}.day`) })}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed italic">
                  &ldquo;{t(`${id}.text`)}&rdquo;
                </p>
                <p className="text-xs text-zinc-600">— {t(`${id}.name`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-xl space-y-6">
          <Trophy className="mx-auto h-12 w-12 text-fuchsia-400" />
          <h2 className="text-3xl font-bold">{t('ctaTitle')}</h2>
          <p className="text-zinc-400">{t('ctaSubtitle')}</p>
          <Link
            href="/signup"
            className={`${COMPONENTS.buttonPrimary} inline-flex items-center gap-2 px-8 py-3 text-base`}
          >
            {t('ctaFinal')} <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-zinc-600">{t('ctaFinalNote')}</p>
        </div>
      </section>
    </div>
  );
}
