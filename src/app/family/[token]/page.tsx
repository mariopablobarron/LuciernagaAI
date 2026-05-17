import React from "react";
import { notFound } from "next/navigation";
import { getPrismaClient } from "@/db/prisma";
import { getTranslations } from "next-intl/server";
import { Heart, Flame, Target, Trophy, Clock, Shield, MessageCircle, Phone, Coffee } from "lucide-react";
import { pickEmailLocale } from "@/lib/email-i18n";

export async function generateMetadata() {
  // El portal va dirigido al contacto. Usamos cookie NEXT_LOCALE; en runtime
  // se renderiza el portal en el idioma del USUARIO titular (ver loadLocale).
  const t = await getTranslations("family");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const LOCALE_BCP47 = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-PT",
  fr: "fr-FR",
} as const;

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (86400 * 1000));
}

type SuggestionKey = "crisis" | "week" | "fewDays" | "wins" | "calm";

function pickSuggestion(daysInactive: number, hasCrisis: boolean, hasWins: boolean): {
  key: SuggestionKey;
  icon: React.ReactNode;
  urgency: "calm" | "gentle" | "urgent";
} {
  if (hasCrisis) {
    return { key: "crisis", icon: <Phone className="w-5 h-5 text-red-400" />, urgency: "urgent" };
  }
  if (daysInactive >= 7) {
    return { key: "week", icon: <Coffee className="w-5 h-5 text-amber-400" />, urgency: "gentle" };
  }
  if (daysInactive >= 3) {
    return { key: "fewDays", icon: <MessageCircle className="w-5 h-5 text-cyan-400" />, urgency: "gentle" };
  }
  if (hasWins) {
    return { key: "wins", icon: <Trophy className="w-5 h-5 text-yellow-400" />, urgency: "calm" };
  }
  return { key: "calm", icon: <Heart className="w-5 h-5 text-fuchsia-400" />, urgency: "calm" };
}

export default async function FamilyPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  const token = resolvedParams.token;

  const prisma = getPrismaClient();

  const contact = await prisma.trustedContact.findUnique({
    where: { accessToken: token },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          lastSeen: true,
          locale: true,
          userState: true,
          streak: true,
          goals: {
            where: { status: "active" },
            include: { actions: true },
          },
          wins: {
            where: { sharedWithFamily: true },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      },
    },
  });

  if (!contact || !contact.user) {
    notFound();
  }

  prisma.trustedContact
    .update({
      where: { id: contact.id },
      data: { lastAccessAt: new Date() },
    })
    .catch(() => {});

  // El portal del contacto se sirve en el idioma del USUARIO titular —
  // asumimos contexto lingüístico compartido (igual que los emails family).
  const locale = pickEmailLocale(contact.user.locale);
  const t = await getTranslations({ locale, namespace: "family" });
  const bcp = LOCALE_BCP47[locale];

  const userName = contact.user.name || contact.user.email.split("@")[0];
  const activeGoal = contact.user.goals[0];
  const completedActions = activeGoal?.actions.filter((a) => a.completed).length || 0;
  const totalActions = activeGoal?.actions.length || 0;
  const inactive = daysSince(contact.user.lastSeen);
  const hasCrisis = contact.user.userState?.crisisActive ?? false;
  const hasWins = contact.user.wins.length > 0;
  const suggestion = pickSuggestion(inactive, hasCrisis, hasWins);

  // Map "amigo/a" → "amigo" para la clave de mensajes (sin '/').
  const relationKey: string = contact.relation === "amigo/a" ? "amigo" : (contact.relation ?? "default");
  const knownRelations = ["madre", "padre", "pareja", "amigo", "terapeuta"];
  const safeRelationKey = knownRelations.includes(relationKey) ? relationKey : "default";
  const relationTip = t(`relationTips.${safeRelationKey}`);

  const urgencyBorder = {
    calm: "border-zinc-700",
    gentle: "border-amber-500/30",
    urgent: "border-red-500/40",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex items-center gap-4 border-b border-zinc-800 pb-6">
          <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl">
            <Heart className="w-6 h-6 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("heading")}</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {t.rich("subtitleTpl", {
                name: () => <span className="text-zinc-200 font-medium">{userName}</span>,
              })}
            </p>
          </div>
        </header>

        {/* Confidentiality protocol */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-300">{t("protocolTitle")}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{t("protocolBody")}</p>
              <p className="text-xs text-zinc-500 italic">{relationTip}</p>
            </div>
          </div>
        </div>

        {/* Suggested action */}
        <div className={`rounded-xl border ${urgencyBorder[suggestion.urgency]} bg-zinc-900 p-5`}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">{t("whatToDo")}</p>
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-zinc-800 shrink-0">{suggestion.icon}</div>
            <div>
              <p className="text-base font-semibold text-white">{t(`actions.${suggestion.key}Title`)}</p>
              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{t(`actions.${suggestion.key}Sub`)}</p>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Streak */}
          {contact.shareStreak && contact.user.streak && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-zinc-200">{t("metrics.streakTitle")}</h3>
              </div>
              <p className="text-3xl font-bold text-white">
                {contact.user.streak.currentDays}{" "}
                <span className="text-base font-normal text-zinc-500">{t("metrics.streakUnit")}</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {contact.user.streak.currentDays === 0
                  ? t("metrics.streakNone")
                  : contact.user.streak.currentDays >= 7
                    ? t("metrics.streakLongHint")
                    : t("metrics.streakBestTpl", { n: contact.user.streak.bestDays })}
              </p>
            </div>
          )}

          {/* Last activity */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-cyan-500" />
              <h3 className="font-semibold text-zinc-200">{t("metrics.lastActivityTitle")}</h3>
            </div>
            <p className="text-lg font-medium text-white">
              {inactive === 0
                ? t("metrics.lastActivityToday")
                : inactive === 1
                  ? t("metrics.lastActivityYesterday")
                  : t("metrics.lastActivityDaysTpl", { n: inactive })}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {inactive >= 7
                ? t("metrics.lastActivityWeekHint")
                : inactive >= 3
                  ? t("metrics.lastActivityFewDaysHint")
                  : t("metrics.lastActivityRecentHint")}
            </p>
          </div>

          {/* Active goal */}
          {contact.shareProgress && activeGoal && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 sm:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-zinc-200">{t("metrics.goalTitle")}</h3>
              </div>
              <p className="text-base text-zinc-300 font-medium mb-3">{activeGoal.title}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{t("metrics.goalProgress")}</span>
                  <span>{completedActions} / {totalActions}</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: totalActions > 0 ? `${(completedActions / totalActions) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {completedActions === totalActions && totalActions > 0
                  ? t("metrics.goalAllDone")
                  : completedActions === 0
                    ? t("metrics.goalNotStarted")
                    : t("metrics.goalInProgress")}
              </p>
            </div>
          )}
        </div>

        {/* Shared wins */}
        {contact.shareWins && contact.user.wins.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-zinc-200">{t("wins.title")}</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-4">{t("wins.intro")}</p>
            <div className="space-y-3">
              {contact.user.wins.map((win) => (
                <div key={win.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-300 italic">&ldquo;{win.note}&rdquo;</p>
                  <p className="text-[10px] text-zinc-600 mt-2">
                    {new Date(win.createdAt).toLocaleDateString(bcp, { day: "numeric", month: "long" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-6 text-center space-y-2">
          <p className="text-xs text-zinc-600">{t("footer")}</p>
          <p className="text-xs text-zinc-700">{t("footerConfidential")}</p>
        </div>
      </div>
    </div>
  );
}
