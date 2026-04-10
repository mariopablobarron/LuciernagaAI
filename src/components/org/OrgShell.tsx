"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Users, Shield, Settings, LogOut, Building2, BookOpen,
} from "lucide-react";

type OrgShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

const NAV_LINKS = [
  { href: "/org/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/org/patients", label: "Pacientes", icon: Users, roles: ["therapist", "admin"] },
  { href: "/org/team", label: "Equipo", icon: Shield, roles: ["admin"] },
  { href: "/org/guia", label: "Guía", icon: BookOpen },
];

export function OrgShell({ title, subtitle, children }: OrgShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = typeof window !== "undefined" ? sessionStorage.getItem("org_role") : null;

  function handleLogout() {
    sessionStorage.removeItem("org_token");
    sessionStorage.removeItem("org_id");
    sessionStorage.removeItem("org_role");
    router.replace("/org/login");
  }

  const filteredNav = NAV_LINKS.filter((link) => !link.roles || (role && link.roles.includes(role)));

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top bar */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-violet-400" />
            <span className="text-sm font-semibold text-white">Portal Organización</span>
          </div>
          <div className="flex items-center gap-1">
            {filteredNav.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 space-y-6">
        {/* Header */}
        <div className="card-surface rounded-2xl border border-zinc-800 p-5">
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  );
}
