"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

type AppLayoutProps = {
  title?: string;
  subtitle?: string;
  summary?: ReactNode;
  prelude?: ReactNode;
  sidebar?: ReactNode;
  main?: ReactNode;
  rightPanel?: ReactNode;
  children?: ReactNode;
};

export default function AppLayout({
  title,
  subtitle,
  summary,
  prelude,
  sidebar,
  main,
  rightPanel,
  children,
}: AppLayoutProps) {
  const mainContent = main ?? children;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="px-3 py-4 text-zinc-100 sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-screen-2xl space-y-4">
        {title || subtitle || summary ? (
          <header className="card-surface rounded-2xl border border-zinc-800 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              {sidebar ? (
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="xl:hidden mt-1 p-2 -ml-1 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                  aria-label="Abrir menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              ) : null}
              <div className="flex-1 min-w-0">
                {title ? (
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{title}</h1>
                ) : null}
                {subtitle ? (
                  <p className="mt-1 sm:mt-2 max-w-5xl text-xs sm:text-sm text-zinc-500 line-clamp-2 sm:line-clamp-none">{subtitle}</p>
                ) : null}
                {summary ? (
                  <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2">{summary}</div>
                ) : null}
              </div>
            </div>
          </header>
        ) : null}

        {prelude ? <section className="space-y-4">{prelude}</section> : null}

        <section className="grid min-h-[72vh] gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          {/* Sidebar — drawer on mobile, fixed column on xl */}
          {sidebar ? (
            <>
              {/* Mobile overlay */}
              {sidebarOpen && (
                <div
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
              {/* Sidebar panel */}
              <aside
                className={`
                  ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                  fixed inset-y-0 left-0 z-50 w-[300px] overflow-y-auto bg-zinc-950 border-r border-zinc-800 p-4 transition-transform duration-200 ease-out
                  xl:static xl:translate-x-0 xl:w-auto xl:border-r-0 xl:p-0 xl:min-h-0
                `}
              >
                {/* Close button — mobile only */}
                <div className="flex justify-end mb-3 xl:hidden">
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-white transition-colors"
                    aria-label="Cerrar menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {sidebar}
              </aside>
            </>
          ) : null}
          <main className="min-h-0">{mainContent}</main>
          {rightPanel ? <aside className="hidden xl:block min-h-0">{rightPanel}</aside> : null}
        </section>
      </div>
    </div>
  );
}
