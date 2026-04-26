"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, BellRing, Bot, BookOpen, Building2, CircleDot, Coffee, FlaskConical, LayoutDashboard, LogOut,
  Mail, Megaphone, Menu, Settings, Shield, ShieldCheck, Sparkles, Stethoscope,
  StickyNote, Users, Webhook, Wrench, X, Database, Activity, FileText, Bell,
} from "lucide-react";

type AdminShellProps = {
  title: string;
  subtitle: string;
  onLogout: () => void | Promise<void>;
  showSectionNav?: boolean;
  children: ReactNode;
};

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuarios", icon: Users, matchPrefix: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/crisis", label: "Crisis", icon: ShieldCheck },
  { href: "/admin/community/circles", label: "Círculos", icon: CircleDot, matchPrefix: true },
  { href: "/admin/research", label: "Investigación", icon: FlaskConical, matchPrefix: true },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone, matchPrefix: true },
  { href: "/admin/blog", label: "Blog", icon: BookOpen, matchPrefix: true },
  { href: "/admin/crm", label: "CRM", icon: Database },
  { href: "/admin/organizations", label: "Organizaciones", icon: Building2 },
  { href: "/admin-clinical", label: "Panel clínico", icon: Stethoscope, matchPrefix: true },
  { href: "/admin/operaciones", label: "Operaciones", icon: Wrench },
  { href: "/admin/team-letters", label: "Cartas del equipo", icon: Mail, matchPrefix: true },
  { href: "/admin/routines", label: "Agentes programados", icon: Bot },
  { href: "/admin/status", label: "Estado sistema", icon: Activity },
  { href: "/admin/audit", label: "Audit Log", icon: Sparkles },
  { href: "/admin/logs", label: "Logs", icon: FileText },
  { href: "/admin/alertas", label: "Alertas", icon: Bell },
  { href: "/admin/notificaciones", label: "Notificaciones push", icon: BellRing },
  { href: "/admin/llm-usage", label: "LLM Usage", icon: BarChart3 },
  { href: "/admin/team", label: "Equipo", icon: Shield },
  { href: "/admin/integraciones", label: "Integraciones", icon: Webhook },
  { href: "/admin/notas", label: "Notas", icon: StickyNote },
  { href: "/admin/ronda-diaria", label: "Ronda Diaria", icon: Coffee },
  { href: "/admin/settings", label: "Configuración", icon: Settings, matchPrefix: true },
  { href: "/admin/guia", label: "Guía", icon: BookOpen },
];

export function AdminShell({
  title,
  subtitle,
  onLogout,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300 border border-violet-500/30">
              <Sparkles className="h-3 w-3" />
              Admin
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
              <ShieldCheck className="h-3 w-3" />
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 hover:text-zinc-300 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_LINKS.map((link) => {
            const active = link.matchPrefix
              ? pathname.startsWith(link.href)
              : pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-zinc-800 px-3 py-4">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-900 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar (mobile toggle + page title) */}
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-4 py-3 md:px-6">
          <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-zinc-200 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white truncate">{title}</h1>
            <p className="text-xs text-zinc-500 truncate hidden sm:block">{subtitle}</p>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 py-6 md:px-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
