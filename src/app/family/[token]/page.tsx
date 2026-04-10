import React from "react";
import { notFound } from "next/navigation";
import { getPrismaClient } from "@/db/prisma";
import { Heart, Flame, Target, Trophy, Clock, Shield, MessageCircle, Phone, Coffee } from "lucide-react";

export const metadata = {
  title: "Portal de Apoyo | Tres Mil Millones de Latidos",
  description: "Portal privado para contactos de confianza.",
};

const RELATION_TIPS: Record<string, string> = {
  madre: "Tu presencia importa más que tus consejos. No intentes arreglarlo — solo está.",
  padre: "Tu presencia importa más que tus consejos. No intentes arreglarlo — solo está.",
  pareja: "Acompaña sin controlar. No uses lo que ves aquí en discusiones.",
  "amigo/a": "Sé natural. Un plan juntos vale más que un consejo. No cambies cómo le tratas.",
  terapeuta: "Usa esta información como contexto entre sesiones, no como agenda.",
};

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (86400 * 1000));
}

function getSuggestedAction(daysInactive: number, hasCrisis: boolean, hasWins: boolean): {
  icon: React.ReactNode;
  text: string;
  subtext: string;
  urgency: "calm" | "gentle" | "urgent";
} {
  if (hasCrisis) {
    return {
      icon: <Phone className="w-5 h-5 text-red-400" />,
      text: "Llámale ahora",
      subtext: "No escribas — llama. Un 'estoy aquí' es suficiente. No intentes resolver nada por teléfono.",
      urgency: "urgent",
    };
  }
  if (daysInactive >= 7) {
    return {
      icon: <Coffee className="w-5 h-5 text-amber-400" />,
      text: "Envía un mensaje natural",
      subtext: "Sin mencionar la app. Un '¿quedamos?' o '¿cómo estás?' sin agenda oculta. La normalidad es apoyo.",
      urgency: "gentle",
    };
  }
  if (daysInactive >= 3) {
    return {
      icon: <MessageCircle className="w-5 h-5 text-cyan-400" />,
      text: "Un mensaje corto basta",
      subtext: "No preguntes por la app. Un 'pensé en ti' o un meme vale más que un '¿ya entraste?'",
      urgency: "gentle",
    };
  }
  if (hasWins) {
    return {
      icon: <Trophy className="w-5 h-5 text-yellow-400" />,
      text: "Celebra con ella/él",
      subtext: "Ha compartido una victoria contigo. Este paso le ha costado más de lo que parece. Díselo.",
      urgency: "calm",
    };
  }
  return {
    icon: <Heart className="w-5 h-5 text-fuchsia-400" />,
    text: "No hacer nada",
    subtext: "Todo va bien. La ausencia de presión es la mejor forma de apoyo ahora mismo.",
    urgency: "calm",
  };
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

  const userName = contact.user.name || contact.user.email.split("@")[0];
  const activeGoal = contact.user.goals[0];
  const completedActions = activeGoal?.actions.filter((a) => a.completed).length || 0;
  const totalActions = activeGoal?.actions.length || 0;
  const inactive = daysSince(contact.user.lastSeen);
  const hasCrisis = contact.user.userState?.crisisActive ?? false;
  const hasWins = contact.user.wins.length > 0;
  const suggestion = getSuggestedAction(inactive, hasCrisis, hasWins);
  const relationTip = (contact.relation ? RELATION_TIPS[contact.relation] : null) ?? "Tu presencia importa más que tus consejos.";

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
            <h1 className="text-2xl font-bold">Portal de Apoyo</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Red de confianza de <span className="text-zinc-200 font-medium">{userName}</span>
            </p>
          </div>
        </header>

        {/* Confidentiality protocol */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-300">Protocolo de confidencialidad</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Lo que ves aquí es confidencial. <strong className="text-zinc-200">No le menciones lo que sabes
                de su progreso, su racha o su estado.</strong> Si el sistema necesita que actúes, te avisará.
                Tu papel es estar — no vigilar.
              </p>
              <p className="text-xs text-zinc-500 italic">{relationTip}</p>
            </div>
          </div>
        </div>

        {/* Suggested action */}
        <div className={`rounded-xl border ${urgencyBorder[suggestion.urgency]} bg-zinc-900 p-5`}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Qué hacer ahora</p>
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-zinc-800 shrink-0">{suggestion.icon}</div>
            <div>
              <p className="text-base font-semibold text-white">{suggestion.text}</p>
              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{suggestion.subtext}</p>
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
                <h3 className="font-semibold text-zinc-200">Constancia</h3>
              </div>
              <p className="text-3xl font-bold text-white">
                {contact.user.streak.currentDays}{" "}
                <span className="text-base font-normal text-zinc-500">días</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {contact.user.streak.currentDays === 0
                  ? "Sin racha activa. No le preguntes por qué — simplemente escríbele algo bonito."
                  : contact.user.streak.currentDays >= 7
                    ? "Lleva buena racha. La constancia le está costando — reconócelo si surge naturalmente."
                    : `Mejor racha: ${contact.user.streak.bestDays} días.`}
              </p>
            </div>
          )}

          {/* Last activity */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-cyan-500" />
              <h3 className="font-semibold text-zinc-200">Última actividad</h3>
            </div>
            <p className="text-lg font-medium text-white">
              {inactive === 0
                ? "Hoy"
                : inactive === 1
                  ? "Ayer"
                  : `Hace ${inactive} días`}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {inactive >= 7
                ? "Puede que esté bien o puede que no. Un mensaje natural sin mencionar la app es lo mejor."
                : inactive >= 3
                  ? "Lleva unos días sin entrar. No pasa nada — a veces se necesita descanso."
                  : "Actividad reciente. Todo parece en orden."}
            </p>
          </div>

          {/* Active goal */}
          {contact.shareProgress && activeGoal && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 sm:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-zinc-200">Objetivo activo</h3>
              </div>
              <p className="text-base text-zinc-300 font-medium mb-3">{activeGoal.title}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Progreso</span>
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
                  ? "Ha completado todas las acciones. Si surge, celebra con ella/él."
                  : completedActions === 0
                    ? "Aún no ha empezado. No presiones — el momento llegará."
                    : "Va avanzando a su ritmo. Eso ya es mucho."}
              </p>
            </div>
          )}
        </div>

        {/* Shared wins */}
        {contact.shareWins && contact.user.wins.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-zinc-200">Victorias compartidas</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Ha querido compartir estos logros contigo. Cada uno le ha costado más de lo que parece.
            </p>
            <div className="space-y-3">
              {contact.user.wins.map((win) => (
                <div key={win.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-300 italic">&ldquo;{win.note}&rdquo;</p>
                  <p className="text-[10px] text-zinc-600 mt-2">
                    {new Date(win.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-6 text-center space-y-2">
          <p className="text-xs text-zinc-600">
            Tres Mil Millones de Latidos — Red de apoyo
          </p>
          <p className="text-xs text-zinc-700">
            Este portal es confidencial. No lo compartas ni lo reenvíes.
          </p>
        </div>
      </div>
    </div>
  );
}
