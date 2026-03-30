"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

export type SidebarConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};

type SidebarProgress = {
  completedActions: number;
  totalActions: number;
  dominantState: string;
};

type SidebarProfile = {
  name: string;
  plan: string;
};

type SidebarProps = {
  conversations: SidebarConversation[];
  activeConversationId: string;
  progress: SidebarProgress;
  profile: SidebarProfile;
  adminAuthenticated: boolean;
  adminLoading: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onAdminLogout: () => Promise<void> | void;
};

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  progress,
  profile,
  adminAuthenticated,
  adminLoading,
  onSelectConversation,
  onNewConversation,
  onAdminLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const [logoSrc, setLogoSrc] = useState("/logo-startidea.png");

  const progressPercent = useMemo(() => {
    if (progress.totalActions <= 0) {
      return 0;
    }
    return Math.min(
      100,
      Math.round((progress.completedActions / progress.totalActions) * 100)
    );
  }, [progress.completedActions, progress.totalActions]);

  return (
    <aside className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <Link href="/" className="mb-6 inline-flex items-center">
        <Image
          src={logoSrc}
          alt="Startidea"
          width={140}
          height={40}
          className="h-8 w-auto sm:h-10"
          priority
          onError={() => setLogoSrc("/placeholder.png")}
        />
      </Link>

      <nav className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Menú
        </p>
        <ul className="space-y-2">
          <li>
            <Link
              href="/"
              className={`block rounded-xl border px-3 py-2 text-sm font-medium transition ${
                pathname === "/"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Chat
            </Link>
          </li>
          <li>
            <Link
              href="/editor"
              className={`block rounded-xl border px-3 py-2 text-sm font-medium transition ${
                pathname === "/editor"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Editor
            </Link>
          </li>
          <li>
            <Link
              href={adminAuthenticated ? "/admin" : "/admin/login?next=/admin"}
              className={`block rounded-xl border px-3 py-2 text-sm font-medium transition ${
                pathname === "/admin"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Admin
            </Link>
          </li>
        </ul>
      </nav>

      <button
        type="button"
        onClick={onNewConversation}
        className="mb-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Nueva conversación
      </button>

      <nav className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Conversaciones
        </p>
        <ul className="space-y-2">
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="truncate text-sm font-medium">{conversation.title}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isActive ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {conversation.messageCount} mensajes
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${
                      isActive ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
                    {formatRelativeDate(conversation.updatedAt)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="mb-4 rounded-xl border border-slate-200 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Acceso admin
        </p>
        {adminLoading ? (
          <p className="mt-2 text-xs text-slate-500">Verificando sesión...</p>
        ) : adminAuthenticated ? (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-emerald-700">Sesión admin activa.</p>
            <button
              type="button"
              onClick={() => void onAdminLogout()}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cerrar sesión admin
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-slate-500">No autenticado.</p>
            <Link
              href="/admin/login?next=/admin"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Entrar como admin
            </Link>
          </div>
        )}
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Progreso
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-800">
          {progress.completedActions}/{progress.totalActions} acciones
        </p>
        <div className="mt-2 h-2 rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-900"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Estado dominante: <span className="font-medium">{progress.dominantState}</span>
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Perfil</p>
        <p className="mt-2 text-sm font-semibold text-slate-800">{profile.name}</p>
        <p className="text-xs text-slate-500">{profile.plan}</p>
      </section>
    </aside>
  );
}
