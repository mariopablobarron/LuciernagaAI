import React from "react";
import { notFound } from "next/navigation";
import { getPrismaClient } from "@/db/prisma";
import { Heart, Flame, Target, Trophy, Clock, ShieldCheck, Activity } from "lucide-react";

export const metadata = {
  title: "Portal de Apoyo | Tres Mil Millones de Latidos",
  description: "Portal privado para contactos de confianza.",
};

// En Next.js App Router, los params son promesas en las versiones más recientes
export default async function FamilyPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  const token = resolvedParams.token;

  const prisma = getPrismaClient();

  // 1. Buscamos al contacto de confianza y los datos permitidos del usuario
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

  // Si el token no existe o fue revocado, mostramos página 404
  if (!contact || !contact.user) {
    notFound();
  }

  // 2. Actualizamos silenciosamente la fecha de último acceso (auditoría)
  prisma.trustedContact
    .update({
      where: { id: contact.id },
      data: { lastAccessAt: new Date() },
    })
    .catch(() => {}); // Ignoramos errores para no bloquear el renderizado

  const userName = contact.user.name || contact.user.email.split("@")[0];
  const activeGoal = contact.user.goals[0];
  const completedActions = activeGoal?.actions.filter((a) => a.completed).length || 0;
  const totalActions = activeGoal?.actions.length || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* ── Cabecera ── */}
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

        {/* ── Bienvenida ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2 text-white">Hola, {contact.name}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Este es tu espacio seguro como contacto de confianza de {userName}. Aquí puedes ver el
            progreso que ha decidido compartir contigo. Tu rol no es resolver sus problemas, sino
            celebrar sus avances y estar presente si lo necesita.
          </p>
        </div>

        {/* ── Métricas y Datos Compartidos ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Racha (Si el usuario dio permiso) */}
          {contact.shareStreak && contact.user.streak && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-zinc-200">Constancia</h3>
              </div>
              <div>
                <p className="text-3xl font-bold text-white mb-1">
                  {contact.user.streak.currentDays}{" "}
                  <span className="text-base font-normal text-zinc-500">días</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Racha actual de check-ins diarios. Mejor racha histórica:{" "}
                  {contact.user.streak.bestDays}.
                </p>
              </div>
            </div>
          )}

          {/* Última Actividad (Siempre visible para contactos de confianza) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-cyan-500" />
              <h3 className="font-semibold text-zinc-200">Última Actividad</h3>
            </div>
            <div>
              <p className="text-lg font-medium text-white mb-1">
                {new Date(contact.user.lastSeen).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-zinc-500">Última vez que {userName} usó la aplicación.</p>
            </div>
          </div>

          {/* Progreso de Objetivo y Estado (Si el usuario dio permiso) */}
          {contact.shareProgress && activeGoal && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 sm:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-zinc-200">Objetivo Activo</h3>
              </div>
              <p className="text-base text-zinc-300 font-medium mb-4">{activeGoal.title}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Progreso de acciones</span>
                  <span>
                    {completedActions} / {totalActions}
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{
                      width:
                        totalActions > 0 ? `${(completedActions / totalActions) * 100}%` : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Victorias Compartidas (Si el usuario dio permiso) ── */}
        {contact.shareWins && contact.user.wins.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-zinc-200">Victorias Recientes</h2>
            </div>
            <div className="space-y-4">
              {contact.user.wins.map((win) => (
                <div key={win.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-300 italic">"{win.note}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
