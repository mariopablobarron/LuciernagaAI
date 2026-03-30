"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, CheckSquare, MessageSquare, Target } from "lucide-react";

const navItems = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
  { href: "/dashboard#goals", label: "Objetivos", icon: Target },
  { href: "/dashboard#progress", label: "Progreso", icon: CheckSquare },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-card px-3 py-6">
      <p className="mb-6 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Luciernaga AI
      </p>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href === "/dashboard" && pathname === "/dashboard");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
